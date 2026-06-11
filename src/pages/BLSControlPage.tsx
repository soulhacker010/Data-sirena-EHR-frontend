import { useEffect, useReducer, useRef, useCallback, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import {
    Play,
    Pause,
    Stop,
    ArrowCounterClockwise,
    Copy,
    PaperPlaneTilt,
    SignOut,
    User,
    CalendarBlank,
    Warning,
    X,
    ArrowSquareOut,
} from '@phosphor-icons/react'
import toast from 'react-hot-toast'
import { ConfirmDialog } from '../components/ui'
import {
    BLSPreviewPane,
    BLSVisualControls,
    BLSSoundPicker,
    BLSSpeedSlider,
    BLSAutostopControl,
    BLSSessionCounters,
    BLSStatusBadge,
} from '../components/bls'
import { ClientSearch } from '../components/shared'
import { previewSound, unlockAudio } from '../lib/blsAudio'
import { createBLSSyncTransport } from '../lib/blsSync'
import type { BLSSyncMessage, BLSSyncTransportAPI } from '../lib/blsSync'
import { recordBLSSession } from '../lib/blsHistory'
import { blsReducer, buildInitialBLSPanelState } from '../lib/blsReducer'
import type { BLSConfig, BLSRunState, BLSAutostopMode } from '../types/bls'
import { blsApi, buildTherapistWebSocketUrl } from '../api/bls'

/**
 * Bilateral Stimulation (BLS) Therapist Control Panel.
 *
 * Mocked-data version — see BLS-SYSTEM-DESIGN.md for the full system design,
 * data model, real-time protocol, and failure modes. This page covers
 * everything in the design doc that lives client-side, with all server
 * interactions stubbed: the "client" auto-connects 1.5s after Invite is
 * clicked, pass counts come from the local canvas renderer, and the audio
 * "L/R indicator" is driven by a local interval.
 *
 * When the backend lands (Phase 1+ in the design doc), the dispatch handlers
 * will swap from local-only state mutations to WebSocket-emitted commands +
 * server-driven state via REPLAY events. The component shape stays.
 */

// Reducer + state shape + initial state + mockSessionId all live in
// src/lib/blsReducer.ts as pure functions so they can be unit-tested without
// React. Imports above pull in: blsReducer, buildInitialBLSPanelState,
// PanelState, BLSAction.

export default function BLSControlPage() {
    // useReducer initializer form — buildInitialBLSPanelState runs once,
    // lazily, and picks up org-wide BLS defaults from localStorage.
    const [state, dispatch] = useReducer(blsReducer, undefined, buildInitialBLSPanelState)
    const [searchParams] = useSearchParams()
    const tickRef = useRef<number | null>(null)
    const audioBeatRef = useRef<number | null>(null)
    const transportRef = useRef<BLSSyncTransportAPI | null>(null)
    // When a session was created via the backend (POST /sessions/), we store
    // the WebSocket URL so the transport effect picks the right transport.
    // Null means "no backend session yet" → falls back to BroadcastChannel
    // demo mode keyed only on sessionId. Set inside handleInvite.
    const wsUrlRef = useRef<string | null>(null)

    // Modal dialog state (replaces native window.confirm so the UX matches
    // the rest of the EHR's design system).
    const [endConfirmOpen, setEndConfirmOpen] = useState(false)
    const [changeClientConfirmOpen, setChangeClientConfirmOpen] = useState(false)

    // Always-current state ref. We mutate during render (safe — read-only ref,
    // never affects render output) so async transport handlers always see the
    // latest config + runState + startedAt without re-creating the effect on
    // every state change (which would tear down and rebuild the BroadcastChannel
    // dozens of times per second during a session).
    const stateRef = useRef(state)
    stateRef.current = state

    // Read context from URL params — e.g., ?client_name=Jane%20Doe&appt=Mon%20Jun%204
    // In prod this comes from the appointment id; the page fetches the
    // appointment and pre-populates the panel.
    useEffect(() => {
        const clientId = searchParams.get('client_id')
        const clientName = searchParams.get('client_name')
        const appointmentId = searchParams.get('appointment_id')
        const appt = searchParams.get('appt')
        if (clientId || clientName || appointmentId || appt) {
            dispatch({
                type: 'POPULATE_CONTEXT',
                clientId,
                clientName,
                appointmentId,
                appointmentLabel: appt,
            })
        }
    }, [searchParams])

    // ─── Sync transport — published state + listens for client events ──────
    // When the user clicks Invite, we get a sessionId. From that point on, a
    // BroadcastChannel-backed transport pushes STATE messages to the client
    // tab on every config or runState change, and listens for the client's
    // HELLO/BYE/VISIBILITY/AUDIO_FAILED messages. When the backend lands the
    // transport is swapped for WebSocket and this orchestration is unchanged.
    useEffect(() => {
        const sessionId = state.live.sessionId
        if (!sessionId) return

        // Pick the transport. If handleInvite stored a wsUrl (i.e., the
        // session was created via the backend), use a real WebSocket so
        // patients on different devices/networks can join. Otherwise fall
        // back to BroadcastChannel demo mode — works between two tabs of the
        // same browser, no backend needed.
        const transport = createBLSSyncTransport({
            mode: 'auto',
            sessionId,
            role: 'therapist',
            wsUrl: wsUrlRef.current ?? undefined,
        })
        transportRef.current = transport

        const handleClientArrived = () => {
            const wasAlreadyConnected = stateRef.current.live.clientStatus === 'connected'
            dispatch({ type: 'CLIENT_CONNECTED' })
            // Read from the live ref, NOT from the closure — the therapist
            // may have already adjusted config or hit Start BLS before the
            // client opened the link, and we need to send the *current*
            // state, not the snapshot taken when this effect first ran.
            const s = stateRef.current
            transport.publish({
                type: 'STATE',
                config: s.config,
                runState: s.live.runState,
                startedAt: s.live.startedAt,
            })
            // Friendly confirmation toast — only on the first connect
            // (otherwise reconnects would spam during flaky networks).
            if (!wasAlreadyConnected) {
                toast.success('Client connected', { icon: '🟢' })
            }
        }

        const off = transport.onMessage((msg: BLSSyncMessage) => {
            switch (msg.type) {
                // CLIENT_HELLO = BroadcastChannel demo path (client tab pings
                // therapist on open). CLIENT_CONNECTED = real WebSocket path
                // (backend broadcasts when the client consumer joins the
                // group). Treat both as "client arrived."
                case 'CLIENT_HELLO':
                case 'CLIENT_CONNECTED':
                    handleClientArrived()
                    break
                case 'CLIENT_BYE':
                    dispatch({ type: 'CLIENT_DISCONNECTED', reason: 'manual' })
                    break
                case 'CLIENT_DISCONNECTED':
                    // Server-broadcast disconnect (WS transport closed). Maps
                    // to 'network' since it wasn't a user-initiated bye.
                    dispatch({ type: 'CLIENT_DISCONNECTED', reason: 'network' })
                    break
                case 'SESSION_END':
                    // Server-driven end (e.g., admin force-end). The therapist
                    // shouldn't normally see this since they themselves trigger
                    // END — but if it lands, treat as session over (manual).
                    dispatch({ type: 'CLIENT_DISCONNECTED', reason: 'manual' })
                    break
                case 'KILL':
                    toast.error(`Session killed: ${msg.reason ?? 'unknown'}`)
                    dispatch({ type: 'CLIENT_DISCONNECTED', reason: 'manual' })
                    break
                case 'CLIENT_AUDIO_FAILED':
                    // Surface but don't kill — visual-only is a valid fallback.
                    toast(`Client audio failed: ${msg.reason}`, { icon: '⚠️' })
                    break
                case 'CLIENT_VISIBILITY':
                    // Quiet signal — keep the connection state but log it.
                    // The autopause-on-hidden behavior is left for Phase 1
                    // (needs a config toggle in BLS Defaults).
                    if (!msg.visible) {
                        toast('Client tab hidden — may not see the stimulus', { icon: '👀' })
                    }
                    break
            }
        })

        return () => {
            off()
            transport.close()
            transportRef.current = null
        }
    // The transport lifecycle is keyed ONLY on sessionId — re-creating it on
    // every state change would tear down + rebuild the BroadcastChannel
    // continuously. State publishing happens in the next effect; closure-stale
    // reads inside the handlers are protected by stateRef above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.live.sessionId])

    // ─── Publish STATE on every meaningful change ──────────────────────────
    useEffect(() => {
        const transport = transportRef.current
        if (!transport) return
        transport.publish({
            type: 'STATE',
            config: state.config,
            runState: state.live.runState,
            startedAt: state.live.startedAt,
        })
    }, [state.config, state.live.runState, state.live.startedAt])

    // ─── Browser tab title — surface session state when therapist is elsewhere
    // Avoids putting the client name in the title so we don't leak PHI when
    // the therapist is screen-sharing for a telehealth session.
    useEffect(() => {
        const original = document.title
        const update = () => {
            if (state.live.runState === 'running') {
                document.title = '● BLS Active — Sirena Health'
            } else if (state.live.runState === 'paused') {
                document.title = '⏸ BLS Paused — Sirena Health'
            } else {
                document.title = 'Bilateral Stimulation — Sirena Health'
            }
        }
        update()
        return () => { document.title = original }
    }, [state.live.runState])

    // ─── Keyboard shortcuts ─────────────────────────────────────────────────
    // Spacebar  → toggle Start / Stop (the most-used shortcut during a session)
    // Escape    → stop current set
    // p         → pause / resume (while running or paused)
    //
    // Guard against firing while the user is typing in an input — common bug
    // that makes the whole panel feel broken when adjusting the autostop
    // numeric field. Also bail on modifier keys so we don't hijack browser /
    // devtools shortcuts.
    //
    // The handlers used here are inlined rather than referencing the
    // memoized handleStartStop / handlePauseResume below — that avoids the
    // ref-forwarding dance for closures and keeps the keyboard logic in one
    // place.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return
            if (e.repeat) return
            const target = e.target as HTMLElement | null
            if (target) {
                const tag = target.tagName
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
                if (target.isContentEditable) return
            }

            const { runState, clientStatus } = state.live

            if (e.code === 'Space') {
                e.preventDefault()
                if (runState === 'running') {
                    dispatch({ type: 'STOP_SET' })
                } else {
                    if (clientStatus !== 'connected') {
                        toast.error('Invite a client and wait for them to connect first')
                        return
                    }
                    if (!state.config.visualEnabled && !state.config.auditoryEnabled) {
                        toast.error('Enable at least one modality (visual or audio)')
                        return
                    }
                    unlockAudio()
                    dispatch({ type: 'START' })
                }
                return
            }
            if (e.key === 'Escape') {
                if (runState === 'running' || runState === 'paused') {
                    e.preventDefault()
                    dispatch({ type: 'STOP_SET' })
                }
                return
            }
            if (e.key === 'p' || e.key === 'P') {
                if (runState === 'running') {
                    e.preventDefault()
                    dispatch({ type: 'PAUSE' })
                } else if (runState === 'paused') {
                    e.preventDefault()
                    dispatch({ type: 'RESUME' })
                }
                return
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [state.live, state.config.visualEnabled, state.config.auditoryEnabled])

    // ─── Tick loop while running (drives the elapsed-time counter) ─────────
    useEffect(() => {
        if (state.live.runState !== 'running') {
            if (tickRef.current !== null) {
                clearInterval(tickRef.current)
                tickRef.current = null
            }
            return
        }
        let lastTick = performance.now()
        tickRef.current = window.setInterval(() => {
            const now = performance.now()
            const delta = (now - lastTick) / 1000
            lastTick = now
            dispatch({ type: 'TICK', deltaSeconds: delta })
        }, 200)

        return () => {
            if (tickRef.current !== null) clearInterval(tickRef.current)
            tickRef.current = null
        }
    }, [state.live.runState])

    // ─── Audio loop while running ───────────────────────────────────────────
    // Plays the selected sound L/R alternately at the configured speed. This
    // is the same scheduling the real client view will use; for the mock we
    // also play it through the therapist's speakers UNLESS muteForTherapist
    // is set.
    useEffect(() => {
        if (state.live.runState !== 'running') {
            if (audioBeatRef.current !== null) {
                clearInterval(audioBeatRef.current)
                audioBeatRef.current = null
            }
            return
        }
        if (!state.config.auditoryEnabled || state.config.muteForTherapist) {
            return
        }
        unlockAudio()
        // cycleHz mirrors the formula in BLSPreviewPane so visual + audio stay
        // synced at the same speed setting. previewSound emits one L beat
        // and one R beat ~280ms apart, so we re-trigger it once per full cycle.
        const cycleHz = 0.4 + (state.config.speed - 1) * (1.6 / 9)
        const cycleMs = 1000 / cycleHz
        audioBeatRef.current = window.setInterval(() => {
            previewSound(state.config.sound, state.config.volume)
        }, cycleMs)

        return () => {
            if (audioBeatRef.current !== null) clearInterval(audioBeatRef.current)
            audioBeatRef.current = null
        }
    }, [
        state.live.runState,
        state.config.auditoryEnabled,
        state.config.muteForTherapist,
        state.config.speed,
        state.config.sound,
        state.config.volume,
    ])

    // ─── Autostop watcher ───────────────────────────────────────────────────
    useEffect(() => {
        if (state.live.runState !== 'running') return
        if (state.config.autostopMode === 'passes' && state.live.passCount >= state.config.autostopPasses) {
            dispatch({ type: 'STOP_SET' })
            toast.success(`Autostop: ${state.config.autostopPasses} passes reached`)
        }
        if (state.config.autostopMode === 'seconds' && state.live.timeSeconds >= state.config.autostopSeconds) {
            dispatch({ type: 'STOP_SET' })
            toast.success(`Autostop: ${state.config.autostopSeconds}s reached`)
        }
    }, [
        state.live.runState,
        state.live.passCount,
        state.live.timeSeconds,
        state.config.autostopMode,
        state.config.autostopPasses,
        state.config.autostopSeconds,
    ])

    // ─── Action handlers ────────────────────────────────────────────────────
    const handleInvite = useCallback(async () => {
        if (state.live.sessionId) return  // already invited
        if (!state.live.clientId) {
            toast.error('Select a client first so the session is logged to their chart')
            return
        }

        // Try the backend first — that gives us a real signed token + URL +
        // a WebSocket session that works across devices. If the API call
        // fails (no backend deployed, network issue), fall back to the
        // BroadcastChannel demo flow so the page still works locally.
        try {
            const response = await blsApi.createSession(
                state.live.clientId,
                state.live.appointmentId,
            )
            const accessToken = localStorage.getItem('sirena_access_token') ?? ''
            wsUrlRef.current = buildTherapistWebSocketUrl(response.session_id, accessToken)
            dispatch({
                type: 'INVITE_CLIENT_FROM_BACKEND',
                sessionId: response.session_id,
                inviteUrl: response.invite_url,
            })
            toast.success('Invite link ready — share it with the client')
        } catch (err) {
            // Backend unreachable — fall back to demo mode.
            console.warn('[BLS] backend unreachable, falling back to BroadcastChannel demo', err)
            wsUrlRef.current = null
            dispatch({ type: 'INVITE_CLIENT' })
            toast.success('Invite link ready (local demo mode)', { icon: '🧪' })
        }
    }, [state.live.sessionId, state.live.clientId, state.live.appointmentId])

    // Picker callback — dispatched when the clinician picks a client from
    // the dropdown.
    const handleClientPicked = useCallback((client: { id: string; name: string } | null) => {
        if (!client) return  // Clear path goes through handleClearClient
        dispatch({
            type: 'POPULATE_CONTEXT',
            clientId: client.id,
            clientName: client.name,
            appointmentId: null,
            // No "Ad-hoc session" copy — the chip only renders when there's
            // a real appointment to label (see header render below).
            appointmentLabel: null,
        })
    }, [])

    // X button on the client chip. If we're clean (no invite, no run state),
    // just clear immediately. If there's an active session or a live invite,
    // ask via ConfirmDialog so we don't silently end someone's session.
    const handleClearClient = useCallback(() => {
        const live = stateRef.current.live
        if (live.runState === 'idle' && live.sessionId === null) {
            dispatch({
                type: 'POPULATE_CONTEXT',
                clientId: null,
                clientName: null,
                appointmentId: null,
                appointmentLabel: null,
            })
            return
        }
        setChangeClientConfirmOpen(true)
    }, [])

    // ─── In-office mode state ──────────────────────────────────────────────
    // Single-screen workflow: therapist hits one button, session is created
    // silently, the BLS canvas fills the screen, and a small floating control
    // bar overlays the bottom. Declared up here (above finalize/end) so
    // those callbacks can reference inOfficeMode without a TDZ error.
    // The remote/telehealth flow (invite link + WebSocket to the client's
    // own device) stays untouched. Both flows coexist on the same page.
    const [inOfficeMode, setInOfficeMode] = useState(false)
    const [controlsVisible, setControlsVisible] = useState(true)
    const hideControlsTimerRef = useRef<number | null>(null)

    // Runs the session-end work: write history, signal the client, reset.
    // Declared BEFORE the callbacks that reference it (handleChangeClient­
    // Confirmed, handleEndConfirmed) to avoid a temporal-dead-zone error
    // when their `useCallback` runs and tries to read the dep array.
    const finalizeAndEndSession = useCallback(() => {
        // Persist to the local history store BEFORE we reset state. Guard on
        // clientId (sessions launched without a client don't write history)
        // and on sessionStartedAt (sessions that never actually ran — invite
        // then end without ever pressing Start — aren't worth a row).
        const live = stateRef.current.live
        const config = stateRef.current.config
        if (live.clientId && live.sessionStartedAt && live.timeSeconds > 0) {
            const modality: 'visual_only' | 'audio_only' | 'both' =
                config.visualEnabled && config.auditoryEnabled ? 'both'
                : config.visualEnabled ? 'visual_only'
                : 'audio_only'

            const settingsSnapshot = {
                speed: config.speed,
                sound: config.sound,
                color: config.color,
                background: config.background,
                stimulus: config.stimulus,
                stimulus_glyph: config.stimulus === 'emoji'
                    ? config.stimulusEmoji
                    : config.stimulus === 'animal'
                        ? config.stimulusAnimal
                        : undefined,
            }

            // Local history first — works offline + makes the BLS tab on the
            // client chart show the session immediately. The backend call
            // below is best-effort; if it fails the local copy still exists.
            recordBLSSession({
                client_id: live.clientId,
                appointment_id: live.appointmentId,
                started_at: live.sessionStartedAt,
                ended_at: Date.now(),
                duration_seconds: Math.round(live.timeSeconds),
                pass_count: live.passCount,
                set_count: live.setCount,
                modality,
                settings_snapshot: settingsSnapshot,
            })

            // Backend persistence — only fires when the session was created
            // via the API (real session UUID + token). Mock/demo sessions
            // synthesize their own ID locally so the server has no row to
            // end. We detect by checking whether the wsUrl was set.
            if (wsUrlRef.current && live.sessionId) {
                blsApi.endSession(live.sessionId, {
                    duration_seconds: Math.round(live.timeSeconds),
                    pass_count: live.passCount,
                    set_count: live.setCount,
                    settings_snapshot: settingsSnapshot,
                    modality,
                }).catch(err => {
                    // Local history already saved — don't block the UI on
                    // an upstream failure. Log so we can debug deploys.
                    console.warn('[BLS] backend endSession failed', err)
                })
            }
        }

        // Tell the client the session is ending BEFORE we tear down the
        // transport. We publish a final STATE with runState='ended' so the
        // client view transitions to the "Session complete" screen. Without
        // this the client keeps animating because the sessionId-keyed
        // transport effect closes the channel before any cleanup message is
        // sent.
        //
        // The short setTimeout before END_SESSION dispatch gives the
        // BroadcastChannel a tick to actually deliver the message to the
        // client tab. close() right after postMessage can drop in-flight
        // messages in some browser implementations.
        const t = transportRef.current
        if (t) {
            t.publish({
                type: 'STATE',
                config,
                runState: 'ended',
                startedAt: null,
            })
        }
        setTimeout(() => {
            dispatch({ type: 'END_SESSION' })
            // Clear the WS URL so a follow-up Invite doesn't reuse the prior
            // session's transport target. handleInvite will rebuild it from
            // the next createSession response.
            wsUrlRef.current = null
            toast.success('Session ended and logged to client chart')
        }, 200)
    }, [])

    // Wraps finalizeAndEndSession with the dialog-close + UX side effects.
    // Also drops out of in-office mode + browser fullscreen so the therapist
    // lands back on the regular control page after a session ends.
    const handleEndConfirmed = useCallback(() => {
        setEndConfirmOpen(false)
        finalizeAndEndSession()
        if (inOfficeMode) {
            setInOfficeMode(false)
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => { /* ignore */ })
            }
        }
    }, [finalizeAndEndSession, inOfficeMode])

    // Confirmed end-and-change-client: finalize the current session, then
    // clear the client context so the picker re-appears. The clear runs
    // AFTER the END_SESSION dispatch (which is delayed 200ms inside
    // finalizeAndEndSession), otherwise the END_SESSION reducer would
    // overwrite our clear by preserving the previous clientId.
    const handleChangeClientConfirmed = useCallback(() => {
        setChangeClientConfirmOpen(false)
        finalizeAndEndSession()
        setTimeout(() => {
            dispatch({
                type: 'POPULATE_CONTEXT',
                clientId: null,
                clientName: null,
                appointmentId: null,
                appointmentLabel: null,
            })
        }, 260)
    }, [finalizeAndEndSession])

    const handleCopyInvite = useCallback(() => {
        if (!state.live.inviteUrl) return
        navigator.clipboard.writeText(state.live.inviteUrl)
            .then(() => toast.success('Invite link copied'))
            .catch(() => toast.error('Copy failed — select and copy manually'))
    }, [state.live.inviteUrl])

    const handleStartInOffice = useCallback(async () => {
        if (!state.live.clientId) {
            toast.error('Select a client first so the session is logged to their chart')
            return
        }
        // CRITICAL: request browser fullscreen FIRST, synchronously inside
        // the click handler. Browsers (Chrome especially) consume the user
        // gesture after the first `await` — if requestFullscreen() runs after
        // an await, it gets silently denied. Trigger overlay + fullscreen
        // together so the screen is full-bleed immediately, then create the
        // session in the background.
        setInOfficeMode(true)
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {
                // Fullscreen denied (Safari iframe, OS permissions). The
                // position:fixed overlay still covers the page, so the
                // visual experience is preserved.
            })
        }
        // Create the backend session (same as Invite) if it doesn't already
        // exist. We deliberately don't show the invite URL — in-office mode
        // doesn't use it. If the backend is unreachable, fall through to the
        // local-only flow so the feature still works.
        if (!state.live.sessionId) {
            try {
                const response = await blsApi.createSession(
                    state.live.clientId,
                    state.live.appointmentId,
                )
                const accessToken = localStorage.getItem('sirena_access_token') ?? ''
                wsUrlRef.current = buildTherapistWebSocketUrl(response.session_id, accessToken)
                dispatch({
                    type: 'INVITE_CLIENT_FROM_BACKEND',
                    sessionId: response.session_id,
                    inviteUrl: response.invite_url,
                })
            } catch (err) {
                console.warn('[BLS] backend unreachable, in-office continues offline', err)
                wsUrlRef.current = null
                dispatch({ type: 'INVITE_CLIENT' })
            }
        }
    }, [state.live.clientId, state.live.appointmentId, state.live.sessionId])

    const handleExitInOffice = useCallback(() => {
        setInOfficeMode(true)  // no-op safety
        setInOfficeMode(false)
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => { /* ignore */ })
        }
    }, [])

    // Auto-hide the floating control bar after 3s of mouse inactivity.
    // Same affordance as a YouTube player — keeps the stimulus distraction-free
    // but the controls reappear instantly on any mouse move.
    const bumpControlsVisible = useCallback(() => {
        setControlsVisible(true)
        if (hideControlsTimerRef.current) {
            window.clearTimeout(hideControlsTimerRef.current)
        }
        hideControlsTimerRef.current = window.setTimeout(() => {
            setControlsVisible(false)
        }, 3000)
    }, [])
    useEffect(() => {
        if (!inOfficeMode) return
        bumpControlsVisible()
        const onMove = () => bumpControlsVisible()
        window.addEventListener('mousemove', onMove)
        return () => {
            window.removeEventListener('mousemove', onMove)
            if (hideControlsTimerRef.current) {
                window.clearTimeout(hideControlsTimerRef.current)
            }
        }
    }, [inOfficeMode, bumpControlsVisible])

    // ESC out of in-office mode. The browser handles the actual fullscreen
    // exit on its own — we just need to clear our overlay state.
    useEffect(() => {
        if (!inOfficeMode) return
        const onFsChange = () => {
            if (!document.fullscreenElement) {
                setInOfficeMode(false)
            }
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setInOfficeMode(false)
        }
        document.addEventListener('fullscreenchange', onFsChange)
        window.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('fullscreenchange', onFsChange)
            window.removeEventListener('keydown', onKey)
        }
    }, [inOfficeMode])

    // Opens the End Session confirm dialog. Actual end work happens in
    // handleEndConfirmed (which calls finalizeAndEndSession).
    const handleEndSession = useCallback(() => {
        setEndConfirmOpen(true)
    }, [])

    const updateConfig = useCallback((patch: Partial<BLSConfig>) => {
        dispatch({ type: 'UPDATE_CONFIG', patch })
    }, [])

    const handleStartStop = useCallback(() => {
        if (state.live.runState === 'running') {
            dispatch({ type: 'STOP_SET' })
            return
        }
        // In-office mode skips the "wait for client connect" gate — the
        // therapist IS the screen the patient is watching. Remote/telehealth
        // mode still requires the client to be on a separate device.
        if (!inOfficeMode && state.live.clientStatus !== 'connected') {
            toast.error('Invite a client and wait for them to connect first')
            return
        }
        if (!state.config.visualEnabled && !state.config.auditoryEnabled) {
            toast.error('Enable at least one modality (visual or audio)')
            return
        }
        // Unlock audio context inside the user gesture (Safari requirement).
        unlockAudio()
        dispatch({ type: 'START' })
    }, [state.live.runState, state.live.clientStatus, state.config.visualEnabled, state.config.auditoryEnabled, inOfficeMode])

    const handlePauseResume = useCallback(() => {
        if (state.live.runState === 'running') dispatch({ type: 'PAUSE' })
        else if (state.live.runState === 'paused') dispatch({ type: 'RESUME' })
    }, [state.live.runState])

    const onPreviewPass = useCallback(() => dispatch({ type: 'INCREMENT_PASS' }), [])

    // ─── Render ─────────────────────────────────────────────────────────────

    const { config, live } = state
    // Pass startedAt straight through — same domain (Date.now() epoch ms) as
    // what the client tab receives via the transport, so both renderers stay
    // phase-locked even across pause/resume.
    const startedAtForPreview = live.runState === 'running' ? live.startedAt : null

    return (
        <DashboardLayout>
            {/* Mobile-responsive overrides — the inline styles below are
                desktop-first; these media queries handle the tap-target,
                stacking, and canvas-height adjustments at phone widths. */}
            <style>{`
                @media (max-width: 640px) {
                    .bls-header { flex-direction: column; align-items: stretch; }
                    .bls-header-right { justify-content: flex-start; }
                    .bls-counters-row { flex-direction: column; align-items: stretch; }
                    .bls-counters-actions { width: 100%; justify-content: space-between; }
                    .bls-start-btn { flex: 1; justify-content: center; }
                    .bls-preview-pane canvas { height: 160px !important; }
                    /* Slightly larger tap targets for inline action buttons */
                    .bls-action-btn { min-height: 40px; }
                    .bls-counters-row .bls-action-btn { flex: 1; justify-content: center; }
                }
                /* Cross-browser slider tweaks: enforce visible thumb size for
                   reliable touch on Android/iOS WebViews. */
                .bls-header ~ * input[type="range"],
                .bls-header input[type="range"] { height: 28px; }
            `}</style>

            {/* Header */}
            <div className="bls-header" style={pageHeaderStyle}>
                <div style={pageHeaderLeftStyle}>
                    <h1 style={pageTitleStyle}>Bilateral Stimulation</h1>
                    {(live.clientName || live.appointmentLabel) && (
                        <div style={pageSubtitleRowStyle}>
                            {live.clientName && (
                                <div style={contextChipStyle}>
                                    <User size={14} weight="bold" />
                                    <span>{live.clientName}</span>
                                    <button
                                        type="button"
                                        onClick={handleClearClient}
                                        style={chipClearBtnStyle}
                                        title="Change client"
                                        aria-label="Change client"
                                    >
                                        <X size={11} weight="bold" />
                                    </button>
                                </div>
                            )}
                            {live.appointmentLabel && (
                                <div style={contextChipStyle}>
                                    <CalendarBlank size={14} weight="bold" />
                                    <span>{live.appointmentLabel}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="bls-header-right" style={pageHeaderRightStyle}>
                    <BLSStatusBadge
                        status={live.clientStatus}
                        inviteSent={live.inviteUrl !== null}
                    />
                    <button
                        type="button"
                        onClick={handleStartInOffice}
                        style={live.clientId ? btnPrimaryStyle : btnDisabledStyle}
                        className="bls-action-btn"
                        disabled={!live.clientId}
                        title={live.clientId
                            ? 'Run BLS on this screen — patient sits next to you, you control'
                            : 'Select a client first'}
                    >
                        <ArrowSquareOut size={16} weight="bold" />
                        Start in-office session
                    </button>
                    {live.inviteUrl
                        ? (
                            <button
                                type="button"
                                onClick={handleCopyInvite}
                                style={btnSecondaryStyle}
                                title={live.inviteUrl}
                                className="bls-action-btn"
                            >
                                <Copy size={16} weight="bold" />
                                Copy invite link
                            </button>
                        )
                        : (
                            <button
                                type="button"
                                onClick={handleInvite}
                                style={live.clientId ? btnSecondaryStyle : btnDisabledStyle}
                                className="bls-action-btn"
                                disabled={!live.clientId}
                                title={live.clientId
                                    ? 'Send a link so the client can join on their own device (telehealth)'
                                    : 'Select a client first'}
                            >
                                <PaperPlaneTilt size={16} weight="bold" />
                                Send invite link
                            </button>
                        )
                    }
                    <button
                        type="button"
                        onClick={handleEndSession}
                        style={btnDangerOutlineStyle}
                        className="bls-action-btn"
                    >
                        <SignOut size={16} weight="bold" />
                        End Session
                    </button>
                </div>
            </div>

            {/* Client picker — required when no client is pre-populated from
                calendar. Without a client_id we can't write the session to a
                chart, so we surface this front-and-center instead of letting
                the clinician get partway through and then realize. */}
            {!live.clientId && (
                <div style={clientPickerBannerStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                            Select a client to begin
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                            The session will be saved to this client&rsquo;s chart so you can review
                            past BLS history later. To launch from a specific appointment, open the
                            calendar and use <em>Start BLS</em> there.
                        </div>
                    </div>
                    <ClientSearch
                        onSelect={handleClientPicked}
                        placeholder="Search clients by name…"
                    />
                </div>
            )}

            {/* Headphones reminder */}
            {live.clientStatus === 'connected' && config.auditoryEnabled && (
                <div style={reminderBannerStyle}>
                    <Warning size={16} weight="fill" />
                    <span>Confirm the client has headphones in for stereo auditory BLS.</span>
                </div>
            )}

            {/* Main grid: Visual | Auditory | Preview */}
            <div style={mainGridStyle}>
                <div style={cardStyle}>
                    <BLSVisualControls
                        color={config.color}
                        // Picking ANY preset color flips back to dot mode (so
                        // selecting blue after picking an illustration brings
                        // the dot back) — the parent owns the multi-field
                        // update so the child stays a pure picker.
                        onColorChange={k => updateConfig({ color: k, stimulus: 'dot' })}
                        customColorHex={config.customColorHex}
                        // Custom-color callback also flips color → 'custom' AND
                        // stimulus → 'dot' so dragging the picker pulls us
                        // back out of illustration mode.
                        onCustomColorChange={h => updateConfig({ color: 'custom', stimulus: 'dot', customColorHex: h })}
                        background={config.background}
                        onBackgroundChange={k => updateConfig({ background: k })}
                        customBackgroundHex={config.customBackgroundHex}
                        onCustomBackgroundChange={h => updateConfig({ background: 'custom', customBackgroundHex: h })}
                        direction={config.direction}
                        onDirectionChange={k => updateConfig({ direction: k })}
                        position={config.position}
                        onPositionChange={k => updateConfig({ position: k })}
                        stimulus={config.stimulus}
                        illustrationId={config.illustrationId}
                        // Picking an illustration flips stimulus AND stamps the id.
                        onIllustrationSelect={ill => updateConfig({
                            stimulus: 'illustration',
                            illustrationId: `${ill.category}/${ill.slug}`,
                        })}
                        backgroundImageId={config.backgroundImageId}
                        backgroundImageDataUrl={config.backgroundImageDataUrl}
                        // Bundled background → flip to 'image', stamp id, clear upload data URL.
                        onBackgroundImageSelect={bg => updateConfig({
                            background: 'image',
                            backgroundImageId: `${bg.category}/${bg.slug}`,
                            backgroundImageDataUrl: null,
                        })}
                        // Uploaded background → flip to 'image', stamp data URL, clear bundled id.
                        onBackgroundUploadSelect={upload => updateConfig({
                            background: 'image',
                            backgroundImageId: null,
                            backgroundImageDataUrl: upload.dataUrl,
                        })}
                        visualEnabled={config.visualEnabled}
                        onVisualEnabledChange={v => updateConfig({ visualEnabled: v })}
                    />
                </div>

                <div style={cardStyle}>
                    <BLSSoundPicker
                        selectedSound={config.sound}
                        onSoundChange={k => updateConfig({ sound: k })}
                        volume={config.volume}
                        onVolumeChange={v => updateConfig({ volume: v })}
                        muteForTherapist={config.muteForTherapist}
                        onMuteForTherapistChange={m => updateConfig({ muteForTherapist: m })}
                        auditoryEnabled={config.auditoryEnabled}
                        onAuditoryEnabledChange={a => updateConfig({ auditoryEnabled: a })}
                    />
                </div>

                <div style={cardStyle} className="bls-preview-pane">
                    <div style={previewSectionHeaderStyle}>What Client Sees</div>
                    <BLSPreviewPane
                        config={config}
                        runState={live.runState}
                        startedAt={startedAtForPreview}
                        audioActive={live.runState === 'running' && config.auditoryEnabled}
                        onPass={onPreviewPass}
                    />
                </div>
            </div>

            {/* Speed + Autostop row */}
            <div style={controlRowStyle}>
                <BLSSpeedSlider
                    value={config.speed}
                    onChange={v => updateConfig({ speed: v })}
                />
                <BLSAutostopControl
                    mode={config.autostopMode}
                    onModeChange={(m: BLSAutostopMode) => updateConfig({ autostopMode: m })}
                    passes={config.autostopPasses}
                    onPassesChange={p => updateConfig({ autostopPasses: p })}
                    seconds={config.autostopSeconds}
                    onSecondsChange={s => updateConfig({ autostopSeconds: s })}
                />
            </div>

            {/* Counters + actions row */}
            <div className="bls-counters-row" style={countersRowStyle}>
                <BLSSessionCounters
                    timeSeconds={live.timeSeconds}
                    passCount={live.passCount}
                    setCount={live.setCount}
                />

                <div className="bls-counters-actions" style={countersActionsStyle}>
                    <button
                        type="button"
                        onClick={() => dispatch({ type: 'RESET_COUNTERS' })}
                        style={btnSecondaryStyle}
                        disabled={live.runState === 'running'}
                        className="bls-action-btn"
                    >
                        <ArrowCounterClockwise size={16} weight="bold" />
                        Reset
                    </button>

                    {live.runState !== 'idle' && (
                        <button
                            type="button"
                            onClick={handlePauseResume}
                            style={btnSecondaryStyle}
                            className="bls-action-btn"
                        >
                            {live.runState === 'paused'
                                ? <><Play size={16} weight="fill" />Resume</>
                                : <><Pause size={16} weight="fill" />Pause</>
                            }
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleStartStop}
                        style={live.runState === 'running' ? btnStopStyle : btnStartStyle}
                        title="Spacebar"
                        className="bls-start-btn"
                    >
                        {live.runState === 'running'
                            ? <><Stop size={20} weight="fill" />Stop BLS</>
                            : <><Play size={20} weight="fill" />Start BLS</>
                        }
                    </button>
                </div>
            </div>

            {/* Keyboard shortcuts hint — subtle, doesn't compete for attention */}
            <div style={shortcutsHintStyle}>
                <kbd style={kbdStyle}>Space</kbd> Start/Stop
                <span style={hintDividerStyle}>·</span>
                <kbd style={kbdStyle}>P</kbd> Pause/Resume
                <span style={hintDividerStyle}>·</span>
                <kbd style={kbdStyle}>Esc</kbd> Stop set
            </div>

            {/* End Session confirm — replaces the native window.confirm so the
                dialog matches the rest of the EHR's design system. */}
            <ConfirmDialog
                isOpen={endConfirmOpen}
                onClose={() => setEndConfirmOpen(false)}
                onConfirm={handleEndConfirmed}
                title="End BLS session?"
                message="Settings will be saved to this client. Counters will be logged to today's session note."
                confirmLabel="End Session"
                cancelLabel="Keep Session"
                variant="warning"
            />

            {/* Change Client confirm — only opens when the clinician clicks the
                X on a client chip during an active session. Confirms ending
                the in-progress work before swapping clients. */}
            <ConfirmDialog
                isOpen={changeClientConfirmOpen}
                onClose={() => setChangeClientConfirmOpen(false)}
                onConfirm={handleChangeClientConfirmed}
                title="End session and change client?"
                message={live.clientName
                    ? `The current session for ${live.clientName} will be ended and saved to their chart, then you'll be able to pick a different client.`
                    : "The current session will be ended and saved, then you can pick a different client."
                }
                confirmLabel="End & Change Client"
                cancelLabel="Keep Current"
                variant="warning"
            />

            {/* ─── In-office full-screen overlay ────────────────────────── */}
            {inOfficeMode && (
                <InOfficeOverlay
                    config={config}
                    runState={live.runState}
                    startedAt={startedAtForPreview}
                    audioActive={live.runState === 'running' && config.auditoryEnabled}
                    onPass={onPreviewPass}
                    passCount={live.passCount}
                    setCount={live.setCount}
                    controlsVisible={controlsVisible}
                    onStartStop={handleStartStop}
                    onPauseResume={handlePauseResume}
                    onEnd={handleEndSession}
                    onExit={handleExitInOffice}
                />
            )}
        </DashboardLayout>
    )
}

// ─── In-office full-screen overlay ───────────────────────────────────────────
//
// Single-screen workflow for therapists running an in-office EMDR session.
// Renders the stimulus canvas full-window and overlays a small floating
// control bar at the bottom (Start / Pause / End). The bar auto-hides
// after 3s of mouse inactivity (same affordance as a YouTube player) so the
// stimulus is distraction-free.
//
// Implementation note: re-uses BLSPreviewPane for the canvas — same renderer
// as the "What client sees" preview. The CSS overrides below stretch its
// internal <canvas> to fill the entire overlay regardless of the preview's
// default aspect ratio.

interface InOfficeOverlayProps {
    config: BLSConfig
    runState: BLSRunState
    startedAt: number | null
    audioActive: boolean
    onPass?: () => void
    passCount: number
    setCount: number
    controlsVisible: boolean
    onStartStop: () => void
    onPauseResume: () => void
    onEnd: () => void
    onExit: () => void
}

function InOfficeOverlay(props: InOfficeOverlayProps) {
    const {
        config, runState, startedAt, audioActive, onPass,
        passCount, setCount, controlsVisible,
        onStartStop, onPauseResume, onEnd, onExit,
    } = props
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: '#0F172A',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'center',
            }}
        >
            <style>{`
                /* Force the entire preview pane subtree to fill the overlay.
                   BLSPreviewPane was designed for a small inline preview
                   (canvas height: 200, wrapper gap: 12, border radius). For
                   in-office mode we want it edge-to-edge — strip every
                   constraint that would letterbox the stimulus. */
                .bls-in-office-stage,
                .bls-in-office-stage > div,
                .bls-in-office-stage > div > div {
                    width: 100% !important;
                    height: 100% !important;
                    max-width: none !important;
                    max-height: none !important;
                    flex: 1 !important;
                    gap: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .bls-in-office-stage canvas {
                    width: 100% !important;
                    height: 100% !important;
                    max-width: none !important;
                    max-height: none !important;
                    border-radius: 0 !important;
                    border: none !important;
                    display: block !important;
                }
                /* Hide the "Preview" / "Paused" / "Running" badges and the
                   small L/R audio indicator — they belong to the inline
                   preview, not the full-screen patient view. */
                .bls-in-office-stage [aria-label="Preview of what the client will see"] ~ div,
                .bls-in-office-stage > div > div:nth-child(2) {
                    display: none !important;
                }
                .bls-in-office-controls {
                    transition: opacity 280ms ease;
                }
            `}</style>
            <div
                className="bls-in-office-stage"
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    width: '100%',
                    height: '100%',
                }}
            >
                <BLSPreviewPane
                    config={config}
                    runState={runState}
                    startedAt={startedAt}
                    audioActive={audioActive}
                    onPass={onPass}
                />
            </div>

            {/* Floating control bar */}
            <div
                className="bls-in-office-controls"
                style={{
                    position: 'fixed',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bottom: 28,
                    display: 'flex',
                    gap: 10,
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.82)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
                    opacity: controlsVisible ? 1 : 0,
                    pointerEvents: controlsVisible ? 'auto' : 'none',
                    alignItems: 'center',
                }}
            >
                <button
                    type="button"
                    onClick={onStartStop}
                    style={overlayPrimaryBtnStyle}
                    title={runState === 'running' ? 'Stop this set' : 'Start BLS'}
                >
                    {runState === 'running'
                        ? <><Stop size={18} weight="fill" /> Stop set</>
                        : <><Play size={18} weight="fill" /> Start</>
                    }
                </button>
                {(runState === 'running' || runState === 'paused') && (
                    <button
                        type="button"
                        onClick={onPauseResume}
                        style={overlaySecondaryBtnStyle}
                        title={runState === 'running' ? 'Pause' : 'Resume'}
                    >
                        {runState === 'running'
                            ? <><Pause size={18} weight="fill" /> Pause</>
                            : <><Play size={18} weight="fill" /> Resume</>
                        }
                    </button>
                )}
                <div style={overlayCountersStyle}>
                    <div><span style={overlayCountLabel}>Passes</span><span style={overlayCountValue}>{passCount}</span></div>
                    <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)' }} />
                    <div><span style={overlayCountLabel}>Sets</span><span style={overlayCountValue}>{setCount}</span></div>
                </div>
                <button
                    type="button"
                    onClick={onEnd}
                    style={overlayDangerBtnStyle}
                    title="End the session and save to the chart"
                >
                    End session
                </button>
                <button
                    type="button"
                    onClick={onExit}
                    style={overlayExitBtnStyle}
                    title="Exit fullscreen (does not end the session)"
                    aria-label="Exit fullscreen"
                >
                    <X size={18} weight="bold" />
                </button>
            </div>

            {/* Faint hint shown when the canvas is idle so therapists know
                the screen they're seeing is what the patient will see. */}
            {runState === 'idle' && controlsVisible && (
                <div style={{
                    position: 'fixed',
                    top: 24,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: 13,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    pointerEvents: 'none',
                }}>
                    Turn the screen to face the client and press Start
                </div>
            )}
        </div>
    )
}

const overlayPrimaryBtnStyle: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '11px 18px',
    background: '#0D9488', color: 'white',
    border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const overlaySecondaryBtnStyle: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '11px 16px',
    background: 'rgba(255,255,255,0.10)', color: 'white',
    border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const overlayDangerBtnStyle: CSSProperties = {
    padding: '11px 16px',
    background: 'rgba(239,68,68,0.18)', color: '#FCA5A5',
    border: '1px solid rgba(239,68,68,0.32)', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const overlayExitBtnStyle: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 38, height: 38,
    background: 'rgba(255,255,255,0.08)', color: 'white',
    border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10,
    cursor: 'pointer',
}
const overlayCountersStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '0 12px',
    color: 'white',
}
const overlayCountLabel: CSSProperties = {
    display: 'block',
    fontSize: 10, fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 2,
}
const overlayCountValue: CSSProperties = {
    display: 'block',
    fontSize: 18, fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const pageHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
    marginBottom: 18,
}

const pageHeaderLeftStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
}

const pageHeaderRightStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
}

const pageTitleStyle: CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
    letterSpacing: -0.2,
}

const pageSubtitleRowStyle: CSSProperties = {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
}

const contextChipStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    background: '#F1F5F9',
    padding: '4px 6px 4px 10px',
    borderRadius: 999,
}

const chipClearBtnStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    background: 'transparent',
    border: 'none',
    padding: 0,
    marginLeft: 2,
    cursor: 'pointer',
    color: '#94A3B8',
    borderRadius: '50%',
    transition: 'all 0.15s',
}

const reminderBannerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: 8,
    color: '#92400E',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
}

const mainGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 16,
    marginBottom: 16,
}

const cardStyle: CSSProperties = {
    padding: 18,
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
}

const previewSectionHeaderStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
}

const controlRowStyle: CSSProperties = {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 16,
}

const countersRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    padding: 18,
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 12,
}

const countersActionsStyle: CSSProperties = {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
}

const btnPrimaryStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#0D9488',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
}

const btnDisabledStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#E2E8F0',
    color: '#94A3B8',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'not-allowed',
}

const clientPickerBannerStyle: CSSProperties = {
    background: '#F0F9FF',
    border: '1px solid #BAE6FD',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
}

const btnSecondaryStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#FFFFFF',
    color: '#475569',
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
}

const btnDangerOutlineStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#FFFFFF',
    color: '#991B1B',
    border: '1px solid #FECACA',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
}

const btnStartStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 28px',
    background: '#0D9488',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(13,148,136,0.35)',
    transition: 'all 0.15s',
}

const btnStopStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 28px',
    background: '#DC2626',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(220,38,38,0.35)',
    transition: 'all 0.15s',
}

const shortcutsHintStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 500,
}

const kbdStyle: CSSProperties = {
    display: 'inline-block',
    padding: '1px 6px',
    background: '#F1F5F9',
    border: '1px solid #CBD5E1',
    borderRadius: 4,
    fontSize: 10,
    fontFamily: '"SF Mono", Menlo, Consolas, monospace',
    fontWeight: 600,
    color: '#475569',
    margin: '0 4px',
}

const hintDividerStyle: CSSProperties = {
    color: '#CBD5E1',
    margin: '0 4px',
}
