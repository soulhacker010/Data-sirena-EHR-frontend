import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import {
    DEFAULT_BLS_CONFIG,
    getResolvedColorHex,
    getResolvedBackgroundHex,
    getBackgroundImageUrl,
} from '../lib/blsConstants'
import { playBeat, unlockAudio } from '../lib/blsAudio'
import { createBLSSyncTransport } from '../lib/blsSync'
import type { BLSSyncMessage, BLSStateMessage, BLSSyncTransportAPI } from '../lib/blsSync'
import { blsApi, buildClientWebSocketUrl } from '../api/bls'
import { computeBLSMotion, speedToCycleMs, computePhase } from '../lib/blsMotion'
import { findBLSIllustration } from '../lib/blsIllustrations'
import type { BLSConfig, BLSRunState } from '../types/bls'

/**
 * BLS Client View — the page the patient opens on their phone, tablet, or
 * laptop via the invite link. Deliberately isolated from the rest of the
 * Sirena app:
 *
 *  - No DashboardLayout, no Sirena nav, no logo. The screen is the
 *    bilateral stimulus and nothing else.
 *  - No PHI in the DOM. Not the patient's name, not the clinician's name,
 *    not the appointment. The URL contains only an opaque token.
 *  - No authenticated API calls. Token validation runs against a public
 *    verify endpoint (mocked here; real in Phase 1).
 *  - Minimal bundle weight — no heavy third-party UI libraries pulled in.
 *
 * The component is a small state machine:
 *
 *   invalid_token ──┐
 *                   │
 *   warning ──► tap_to_begin ──► waiting ──► running ⇄ paused ──► ended
 *                                    │
 *                                    └──► disconnected (sync lost)
 *
 * Edge cases that matter (each addressed below, look for inline comments):
 *  - iOS Safari requires a user gesture to resume AudioContext
 *  - Phone screen sleeps mid-session → Screen Wake Lock API
 *  - Tab backgrounded → visibilitychange notifies therapist
 *  - Audio playback fails entirely → graceful visual-only fallback
 *  - Photosensitive epilepsy: warning shown on first mount of the session
 *  - Sync transport unavailable (older Safari, privacy mode) → fall back to
 *    "waiting forever" state without crashing
 *  - Pixel-perfect canvas on retina displays via devicePixelRatio
 *  - Window resize during a session → canvas re-measures and re-scales
 */

type ClientUIState =
    | 'invalid_token'
    | 'warning'         // photosensitive epilepsy warning
    | 'tap_to_begin'    // audio unlock gesture required
    | 'waiting'         // therapist hasn't started BLS
    | 'running'         // active stimulation
    | 'paused'          // therapist paused
    | 'ended'           // therapist ended session
    | 'disconnected'    // sync lost

const WARNING_ACK_KEY = 'bls_client_warning_ack'

export default function BLSClientPage() {
    // The URL param is named `token` for backwards compat with old long-token
    // links — semantically it can be either a 6-char short code OR the full
    // signed token. Short codes get resolved to a fresh signed token via the
    // /sessions/resolve/ endpoint before the session component opens.
    const { token: urlParam } = useParams<{ token: string }>()

    const isShortCode = useMemo(() => isShortCodeFormat(urlParam), [urlParam])
    const isLongToken = useMemo(() => isValidTokenFormat(urlParam), [urlParam])

    // Resolved token — for short-code links this holds the result of
    // /sessions/resolve/. For long-token links this is the URL param verbatim.
    const [resolvedToken, setResolvedToken] = useState<string | null>(null)
    const [resolveFailed, setResolveFailed] = useState(false)

    useEffect(() => {
        let cancelled = false
        if (!urlParam) return
        if (isShortCode) {
            blsApi.resolveShortCode(urlParam).then(result => {
                if (cancelled) return
                if (result && result.token) {
                    setResolvedToken(result.token)
                } else {
                    setResolveFailed(true)
                }
            })
            return () => { cancelled = true }
        }
        if (isLongToken) {
            setResolvedToken(urlParam)
        }
        return () => { cancelled = true }
    }, [urlParam, isShortCode, isLongToken])

    if (!urlParam || (!isShortCode && !isLongToken) || resolveFailed) {
        return <InvalidTokenScreen />
    }
    if (!resolvedToken) {
        return <ResolvingScreen />
    }
    return <BLSClientSession token={resolvedToken} />
}

/**
 * Inner component, mounted only after token validation succeeds. Keeps the
 * outer component a thin gatekeeper so all the session-lifecycle hooks
 * unmount cleanly if the token check later fails (in prod the verify call
 * is async).
 */
function BLSClientSession({ token }: { token: string }) {
    // Local state
    const [uiState, setUIState] = useState<ClientUIState>(() =>
        sessionStorage.getItem(WARNING_ACK_KEY) === '1' ? 'tap_to_begin' : 'warning'
    )
    const [config, setConfig] = useState<BLSConfig>(DEFAULT_BLS_CONFIG)
    const [runState, setRunState] = useState<BLSRunState>('idle')
    const [startedAt, setStartedAt] = useState<number | null>(null)
    const [audioFailed, setAudioFailed] = useState(false)

    const transportRef = useRef<BLSSyncTransportAPI | null>(null)
    // Backend-resolved session_id (when the token verifies against the API).
    // Null means demo-mode (BroadcastChannel keyed on the token string).
    const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(null)
    const [backendChecked, setBackendChecked] = useState(false)

    // ─── Verify token against backend first ────────────────────────────────
    // If the backend confirms the token, we use the WebSocket transport so
    // patients on different devices can connect. If the API is unreachable
    // OR returns valid=false, we fall back to BroadcastChannel demo mode
    // (still works between two tabs of the same browser).
    useEffect(() => {
        let cancelled = false
        blsApi.verifyToken(token).then(result => {
            if (cancelled) return
            if (result.valid && result.session_id) {
                setResolvedSessionId(result.session_id)
                // If the backend already marked this session ended/abandoned,
                // skip the WebSocket entirely and go straight to the ended UI.
                // Reloading an old invite URL after the therapist clicked End
                // would otherwise hang on "Waiting for your therapist…"
                // forever because the WS connects but no STATE ever lands.
                if (result.status === 'ended' || result.status === 'abandoned') {
                    setRunState('ended')
                }
            }
            setBackendChecked(true)
        }).catch(() => {
            if (cancelled) return
            setBackendChecked(true)  // unreachable → demo mode
        })
        return () => { cancelled = true }
    }, [token])

    // ─── Sync transport ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!backendChecked) return  // wait until we know which mode to use

        const transport = createBLSSyncTransport({
            mode: 'auto',
            // For BroadcastChannel mode, we key on the token string (matches
            // what the therapist demo-mode keys on — synthesized mock IDs).
            // For WebSocket mode, the URL contains the token; sessionId is
            // just metadata used by listener loop-guards.
            sessionId: resolvedSessionId ?? token,
            role: 'client',
            wsUrl: resolvedSessionId ? buildClientWebSocketUrl(token) : undefined,
        })
        transportRef.current = transport

        const off = transport.onMessage((msg: BLSSyncMessage) => {
            if (msg.type === 'STATE') {
                applyStateMessage(msg, setConfig, setRunState, setStartedAt)
            }
        })

        // Announce ourselves so the therapist replies with current state.
        transport.publish({ type: 'CLIENT_HELLO' })

        return () => {
            transport.publish({ type: 'CLIENT_BYE' })
            off()
            transport.close()
            transportRef.current = null
        }
    }, [token, backendChecked, resolvedSessionId])

    // ─── Drive UI state from runState + connection ──────────────────────────
    useEffect(() => {
        // Only advance the UI past 'tap_to_begin' once audio is unlocked.
        if (uiState === 'warning' || uiState === 'tap_to_begin' || uiState === 'invalid_token') return

        if (runState === 'ended') { setUIState('ended'); return }
        if (runState === 'running') { setUIState('running'); return }
        if (runState === 'paused')  { setUIState('paused');  return }
        if (runState === 'idle')    { setUIState('waiting'); return }
    }, [runState, uiState])

    // ─── Visibility detection — notify therapist when tab is hidden ────────
    useEffect(() => {
        const handler = () => {
            transportRef.current?.publish({
                type: 'CLIENT_VISIBILITY',
                visible: !document.hidden,
            })
        }
        document.addEventListener('visibilitychange', handler)
        return () => document.removeEventListener('visibilitychange', handler)
    }, [])

    // ─── Screen Wake Lock — keep phone screen on during BLS ────────────────
    useScreenWakeLock(uiState === 'running')

    // ─── Audio playback loop while running ─────────────────────────────────
    useBLSAudioLoop({
        active: uiState === 'running' && config.auditoryEnabled,
        sound: config.sound,
        volume: config.volume,
        speed: config.speed,
        onFailure: () => setAudioFailed(true),
    })

    // ─── Render ─────────────────────────────────────────────────────────────
    const ackWarning = () => {
        sessionStorage.setItem(WARNING_ACK_KEY, '1')
        setUIState('tap_to_begin')
    }

    const handleTapToBegin = () => {
        // Inside the user gesture: unlock AudioContext (Safari requirement).
        unlockAudio()
        // Quick test beat to verify audio works. If silent, the user will at
        // least know we tried; if it errors, we set audioFailed.
        try {
            playBeat(config.sound, 0, Math.min(config.volume, 0.4))
        } catch {
            setAudioFailed(true)
        }
        setUIState('waiting')
    }

    if (uiState === 'warning') {
        return <PhotosensitivityWarning onContinue={ackWarning} />
    }
    if (uiState === 'tap_to_begin') {
        return <TapToBeginScreen onTap={handleTapToBegin} />
    }
    if (uiState === 'ended') {
        return <SessionEndedScreen />
    }
    if (uiState === 'disconnected') {
        return <DisconnectedScreen />
    }

    // waiting / running / paused all share the same chrome — the canvas is
    // mounted in all three but only animates while running.
    return (
        <BLSCanvas
            config={config}
            runState={runState}
            startedAt={startedAt}
            showWaitingOverlay={uiState === 'waiting'}
            audioFailed={audioFailed && config.auditoryEnabled}
            paused={uiState === 'paused'}
        />
    )
}

// ─── Helper: apply a STATE message into local React state ──────────────────

function applyStateMessage(
    msg: BLSStateMessage,
    setConfig: (c: BLSConfig) => void,
    setRunState: (r: BLSRunState) => void,
    setStartedAt: (n: number | null) => void,
) {
    setConfig(msg.config)
    setRunState(msg.runState)
    setStartedAt(msg.startedAt)
}

// ─── Token format pre-check ─────────────────────────────────────────────────
//
// Cheap sanity guard so a clearly malformed URL (e.g. someone deleted half the
// token) shows "Session not found" instantly without a network round-trip.
// Accepts both formats:
//   - Demo / fallback mode:  24 lowercase alphanumeric chars (mockSessionId)
//   - Real signed token:     Django's TimestampSigner output — base64url +
//                            ':' separators, typically 80-200+ chars
//
// The REAL verification happens inside BLSClientSession via blsApi.verifyToken().
// This function only catches obvious junk so we don't spin up a transport for
// it.
function isValidTokenFormat(token: string | undefined): boolean {
    if (!token) return false
    if (token.length < 20 || token.length > 512) return false
    // Allow alphanumeric, base64url chars (- and _), and the colon/dot
    // separators Django uses inside signed tokens.
    return /^[A-Za-z0-9_\-:.]+$/.test(token)
}

/**
 * Short codes are 6 chars from Crockford Base32 minus I, L, O, U (kept in
 * sync with apps/bls/tokens.py:SHORT_CODE_ALPHABET on the backend). Accept
 * both upper and lower case — the resolve endpoint normalises.
 */
const SHORT_CODE_RE = /^[0-9A-HJ-NP-TV-Za-hj-np-tv-z]{6}$/

function isShortCodeFormat(value: string | undefined): boolean {
    return !!value && SHORT_CODE_RE.test(value)
}

// ─── Canvas ─────────────────────────────────────────────────────────────────

interface BLSCanvasProps {
    config: BLSConfig
    runState: BLSRunState
    startedAt: number | null
    showWaitingOverlay: boolean
    audioFailed: boolean
    paused: boolean
}

function BLSCanvas({ config, runState, startedAt, showWaitingOverlay, audioFailed, paused }: BLSCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rafRef = useRef<number | null>(null)
    // Cached illustration image — same pattern as BLSPreviewPane. Re-loaded
    // when illustrationId changes, drawn each frame via ctx.drawImage when
    // the stimulus is set to 'illustration' AND the image has loaded.
    const illustrationImgRef = useRef<HTMLImageElement | null>(null)
    const illustrationReadyRef = useRef<boolean>(false)
    // Background image cache — bundled OR data: URL, transparent to the
    // underlying Image element.
    const backgroundImgRef = useRef<HTMLImageElement | null>(null)
    const backgroundReadyRef = useRef<boolean>(false)

    const backgroundImageUrl = getBackgroundImageUrl(config)

    useEffect(() => {
        if (!config.illustrationId) {
            illustrationImgRef.current = null
            illustrationReadyRef.current = false
            return
        }
        const illustration = findBLSIllustration(config.illustrationId)
        if (!illustration) {
            illustrationImgRef.current = null
            illustrationReadyRef.current = false
            return
        }
        const img = new Image()
        illustrationReadyRef.current = false
        illustrationImgRef.current = img
        img.onload = () => {
            if (illustrationImgRef.current === img) {
                illustrationReadyRef.current = true
            }
        }
        img.src = illustration.path
    }, [config.illustrationId])

    useEffect(() => {
        if (!backgroundImageUrl) {
            backgroundImgRef.current = null
            backgroundReadyRef.current = false
            return
        }
        const img = new Image()
        backgroundReadyRef.current = false
        backgroundImgRef.current = img
        img.onload = () => {
            if (backgroundImgRef.current === img) {
                backgroundReadyRef.current = true
            }
        }
        img.src = backgroundImageUrl
    }, [backgroundImageUrl])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const resize = () => {
            const dpr = window.devicePixelRatio || 1
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
        resize()
        window.addEventListener('resize', resize)

        const cycleMs = speedToCycleMs(config.speed)

        const draw = () => {
            const dpr = window.devicePixelRatio || 1
            const width = canvas.width / dpr
            const height = canvas.height / dpr

            const bgHex = getResolvedBackgroundHex(config)
            const dotHex = getResolvedColorHex(config)

            // Fallback color first (covers loading + letterbox), then overlay
            // the image (cover-fit) if it's ready.
            ctx.fillStyle = bgHex
            ctx.fillRect(0, 0, width, height)

            if (config.background === 'image'
                && backgroundImgRef.current
                && backgroundReadyRef.current
            ) {
                drawCoverImage(ctx, backgroundImgRef.current, width, height)
            }

            const dotRadius = Math.min(width, height) * 0.035
            const paddingPx = dotRadius * 3

            // Resting position when idle/paused — dot sits at base.
            let x = width / 2
            let y = config.position === 'top'    ? height * 0.3
                  : config.position === 'bottom' ? height * 0.7
                                                 : height * 0.5

            if (runState === 'running' && startedAt !== null) {
                // Compute phase from server-stamped startedAt → both client
                // and therapist see the same dot position at the same wall
                // time (within network skew). In prod the server is the only
                // authoritative clock; here we trust the message timestamp.
                const phase = computePhase(startedAt, Date.now(), cycleMs)
                const motion = computeBLSMotion({
                    direction: config.direction,
                    phase,
                    width, height,
                    position: config.position,
                    paddingPx,
                })
                x = motion.x
                y = motion.y
            }

            if (config.visualEnabled) {
                if (config.stimulus === 'illustration'
                    && illustrationImgRef.current
                    && illustrationReadyRef.current
                ) {
                    const size = dotRadius * 4
                    ctx.drawImage(illustrationImgRef.current, x - size / 2, y - size / 2, size, size)
                } else if (config.stimulus === 'dot' || config.stimulus === 'illustration') {
                    ctx.beginPath()
                    ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
                    ctx.fillStyle = dotHex
                    ctx.fill()
                } else {
                    // Legacy Unicode glyph paths — kept for backward compat
                    // with old session configs.
                    const glyph = config.stimulus === 'emoji'
                        ? (config.stimulusEmoji ?? '⭐')
                        : (config.stimulusAnimal ?? '🐶')
                    const fontSize = dotRadius * 2.4
                    ctx.font = `${fontSize}px system-ui, -apple-system, "Segoe UI Emoji"`
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText(glyph, x, y)
                }
            }

            rafRef.current = requestAnimationFrame(draw)
        }
        rafRef.current = requestAnimationFrame(draw)

        return () => {
            window.removeEventListener('resize', resize)
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
        }
    }, [config, runState, startedAt])

    return (
        <div style={fullScreenStyle(getResolvedBackgroundHex(config))}>
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block' }}
                aria-hidden="true"
            />

            {showWaitingOverlay && <WaitingOverlay auditoryEnabled={config.auditoryEnabled} />}

            {paused && <PausedOverlay />}

            {audioFailed && (
                <div style={audioFailureBannerStyle}>
                    Audio could not be played on this device. The session will continue with visual only.
                </div>
            )}
        </div>
    )
}

// ─── Screens ────────────────────────────────────────────────────────────────

function ResolvingScreen() {
    // Brief flash while we exchange the short code for a real token.
    // Same chrome as the other message screens for visual continuity.
    return (
        <div style={messageScreenStyle('#F8FAFC')}>
            <div style={messageBoxStyle}>
                <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#0F172A' }}>
                    Connecting…
                </h1>
                <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px', lineHeight: 1.55 }}>
                    Looking up your session.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <SpinnerDots />
                </div>
            </div>
        </div>
    )
}

function InvalidTokenScreen() {
    return (
        <div style={messageScreenStyle('#F8FAFC')}>
            <div style={messageBoxStyle}>
                <div
                    aria-hidden="true"
                    style={{
                        width: 56,
                        height: 56,
                        margin: '0 auto 18px',
                        borderRadius: '50%',
                        background: '#FFFBEB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
                    This link isn’t active
                </h1>
                <p style={{ fontSize: 14, color: '#475569', margin: 0, lineHeight: 1.55 }}>
                    The session link has expired or isn’t valid. Please ask your therapist for a new one.
                </p>
            </div>
        </div>
    )
}

function PhotosensitivityWarning({ onContinue }: { onContinue: () => void }) {
    return (
        <div style={messageScreenStyle('#FFFBEB')}>
            <div style={messageBoxStyle}>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>
                    Before you continue
                </h1>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 8px' }}>
                    This session will display a moving visual element on your screen and may
                    play alternating sounds in your left and right ear.
                </p>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
                    If you have a history of photosensitive seizures, severe migraines, or motion
                    sensitivity, please let your provider know before continuing.
                </p>
                <button type="button" onClick={onContinue} style={primaryButtonStyle}>
                    I understand — continue
                </button>
            </div>
        </div>
    )
}

function TapToBeginScreen({ onTap }: { onTap: () => void }) {
    return (
        <button
            type="button"
            onClick={onTap}
            style={tapToBeginButtonStyle}
            aria-label="Tap to begin"
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'rgba(13,148,136,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                }}>
                    👋
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#0F172A' }}>Tap anywhere to begin</div>
                <div style={{ fontSize: 14, color: '#64748B', textAlign: 'center', maxWidth: 280 }}>
                    Please put on headphones if you have them. Your provider will start the session shortly.
                </div>
            </div>
        </button>
    )
}

function WaitingOverlay({ auditoryEnabled }: { auditoryEnabled: boolean }) {
    return (
        <div style={overlayStyle('rgba(255,255,255,0.92)')}>
            <div style={{ textAlign: 'center', maxWidth: 320, padding: 24 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
                    Waiting for your therapist…
                </div>
                <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
                    Connected.{' '}
                    {auditoryEnabled && 'Please put on headphones if you have them.'}
                </div>
                <div style={{ marginTop: 20 }}>
                    <SpinnerDots />
                </div>
            </div>
        </div>
    )
}

function PausedOverlay() {
    return (
        <div style={overlayStyle('rgba(0,0,0,0.35)')}>
            <div style={{
                background: 'rgba(255,255,255,0.95)',
                padding: '14px 22px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: '#B45309',
            }}>
                Paused
            </div>
        </div>
    )
}

function SessionEndedScreen() {
    return (
        <div style={messageScreenStyle('#F8FAFC')}>
            <div style={messageBoxStyle}>
                <div
                    aria-hidden="true"
                    style={{
                        width: 56,
                        height: 56,
                        margin: '0 auto 18px',
                        borderRadius: '50%',
                        background: '#F0FDFA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0D9488"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
                    Your session has ended
                </h1>
                <p style={{ fontSize: 14, color: '#475569', margin: 0, lineHeight: 1.55 }}>
                    Thank you for the session. Your therapist has ended it on their end — you can safely close this tab.
                </p>
            </div>
        </div>
    )
}

function DisconnectedScreen() {
    return (
        <div style={messageScreenStyle('#F8FAFC')}>
            <div style={messageBoxStyle}>
                <div
                    aria-hidden="true"
                    style={{
                        width: 56,
                        height: 56,
                        margin: '0 auto 18px',
                        borderRadius: '50%',
                        background: '#FFFBEB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px', color: '#0F172A' }}>
                    Connection lost
                </h1>
                <p style={{ fontSize: 14, color: '#475569', margin: 0, lineHeight: 1.55 }}>
                    The session was interrupted. Please check your internet and ask your therapist to send a new link if needed.
                </p>
            </div>
        </div>
    )
}

function SpinnerDots() {
    return (
        <div style={{ display: 'inline-flex', gap: 6 }}>
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#0D9488',
                        animation: `bls-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                    }}
                />
            ))}
            <style>{`
                @keyframes bls-bounce {
                    0%, 100% { transform: translateY(0); opacity: 0.4; }
                    40%      { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    )
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Acquire and hold a Screen Wake Lock while `active` is true. Releases on
 * deactivation, unmount, OR when the document is hidden (the lock is auto-
 * released by the browser in that case anyway, and we need to re-request on
 * visibility return).
 */
function useScreenWakeLock(active: boolean) {
    useEffect(() => {
        if (!active) return
        if (!('wakeLock' in navigator)) return

        let sentinel: WakeLockSentinel | null = null
        let cancelled = false

        const acquire = async () => {
            try {
                // The DOM lib types `wakeLock` on navigator; cast for older TS lib targets.
                const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> } }
                if (!nav.wakeLock) return
                const s = await nav.wakeLock.request('screen')
                if (cancelled) {
                    s.release().catch(() => { /* ignore */ })
                    return
                }
                sentinel = s
            } catch {
                // Wake lock denied — phone may sleep. Acceptable degradation.
            }
        }

        const onVisibility = () => {
            if (document.visibilityState === 'visible' && !sentinel) acquire()
        }

        acquire()
        document.addEventListener('visibilitychange', onVisibility)

        return () => {
            cancelled = true
            document.removeEventListener('visibilitychange', onVisibility)
            if (sentinel) {
                sentinel.release().catch(() => { /* ignore */ })
                sentinel = null
            }
        }
    }, [active])
}

interface AudioLoopParams {
    active: boolean
    sound: BLSConfig['sound']
    volume: number
    speed: number
    onFailure: () => void
}

/**
 * Plays the configured sound on alternating L/R sides, paced to the visual.
 * Each "side" (left, right) gets one beat per pass — same cadence the dot
 * uses for its sine sweep, so audio and visual feel locked together.
 */
function useBLSAudioLoop({ active, sound, volume, speed, onFailure }: AudioLoopParams) {
    useEffect(() => {
        if (!active) return

        const cycleHz = 0.4 + (speed - 1) * (1.6 / 9)
        // Two beats per cycle (L + R).
        const beatIntervalMs = 1000 / (cycleHz * 2)
        let pan: -1 | 1 = -1

        const beat = () => {
            try {
                playBeat(sound, pan, volume)
                pan = pan === -1 ? 1 : -1
            } catch {
                onFailure()
            }
        }

        beat()  // first beat immediately
        const id = window.setInterval(beat, beatIntervalMs)

        return () => clearInterval(id)
    }, [active, sound, volume, speed, onFailure])
}

// ─── Styles ─────────────────────────────────────────────────────────────────

/**
 * Draw `img` so it fills (canvasW × canvasH) like CSS `object-fit: cover`.
 * Same helper as in BLSPreviewPane — kept duplicated rather than extracted
 * to a shared module to keep BLSClientPage's import surface minimal (the
 * client view ships a deliberately small bundle to patient devices).
 */
function drawCoverImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    canvasW: number,
    canvasH: number,
): void {
    const imgRatio = img.width / img.height
    const canvasRatio = canvasW / canvasH
    let sx = 0, sy = 0, sw = img.width, sh = img.height
    if (imgRatio > canvasRatio) {
        sw = img.height * canvasRatio
        sx = (img.width - sw) / 2
    } else {
        sh = img.width / canvasRatio
        sy = (img.height - sh) / 2
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasW, canvasH)
}

function fullScreenStyle(bg: string): CSSProperties {
    return {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: bg,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
    }
}

function overlayStyle(bg: string): CSSProperties {
    return {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    }
}

function messageScreenStyle(bg: string): CSSProperties {
    return {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    }
}

const messageBoxStyle: CSSProperties = {
    maxWidth: 420,
    width: '100%',
    background: '#FFFFFF',
    padding: '32px 28px',
    borderRadius: 14,
    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
    textAlign: 'center',
}

const primaryButtonStyle: CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    background: '#0D9488',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
}

const tapToBeginButtonStyle: CSSProperties = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: 'inherit',
}

const audioFailureBannerStyle: CSSProperties = {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(254,243,199,0.95)',
    color: '#92400E',
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    maxWidth: 320,
    textAlign: 'center',
    zIndex: 10,
}

