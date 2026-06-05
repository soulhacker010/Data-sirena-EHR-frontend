import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { BLSConfig, BLSRunState } from '../../types/bls'
import { getResolvedColorHex, getResolvedBackgroundHex, getBackgroundImageUrl } from '../../lib/blsConstants'
import { computeBLSMotion, speedToCycleMs, computePhase } from '../../lib/blsMotion'
import { findBLSIllustration } from '../../lib/blsIllustrations'

interface BLSPreviewPaneProps {
    config: BLSConfig
    runState: BLSRunState
    /** Date.now() epoch ms when the current run started. Same domain the
     *  client view uses (sync messages carry Date.now() values), so therapist
     *  and client renderers stay phase-locked. */
    startedAt: number | null
    /** Whether the audio L/R indicator should animate (mirrors auditory enabled + running). */
    audioActive: boolean
    /** Called whenever the dot completes a pass (crosses the midline). The page
     *  uses this to advance the local pass counter in the mock. In prod, the
     *  server emits pass counts via WebSocket and this stops being driven by
     *  the client. */
    onPass?: () => void
}

/**
 * "What Client Sees" preview pane.
 *
 * Renders a small canvas with the bilateral-stimulus dot bouncing at the
 * configured speed. This is intentionally the same renderer the real client
 * view will use — pulling it out into a hook is on the list for when the
 * client surface goes live.
 *
 * Speed-to-frequency mapping: speed 1 → 0.4 Hz cycle, speed 10 → 2.0 Hz cycle.
 * A "pass" is one half-cycle (one midline crossing), so passes/sec is double
 * the cycle frequency.
 */
export default function BLSPreviewPane({ config, runState, startedAt, audioActive, onPass }: BLSPreviewPaneProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rafRef = useRef<number | null>(null)
    const lastPassDirRef = useRef<number>(0)
    // Cache the SVG illustration image so drawImage doesn't have to round-trip
    // to the network every frame. Image stays null until the SVG has loaded —
    // canvas draws a fallback dot in the meantime.
    const illustrationImgRef = useRef<HTMLImageElement | null>(null)
    const illustrationReadyRef = useRef<boolean>(false)
    // Same caching pattern for the background image. URL covers both bundled
    // (/bls-backgrounds/...) and uploaded (data: URLs) — the underlying
    // Image element handles both transparently.
    const backgroundImgRef = useRef<HTMLImageElement | null>(null)
    const backgroundReadyRef = useRef<boolean>(false)

    const backgroundImageUrl = getBackgroundImageUrl(config)

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

    // Reload the illustration whenever id changes. We deliberately don't tear
    // down on stimulus change — keeping the image cached means switching back
    // to illustration mode is instant.
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
            // Guard: a newer effect run may have replaced the ref before we
            // resolved. Only flip ready if we're still the current image.
            if (illustrationImgRef.current === img) {
                illustrationReadyRef.current = true
            }
        }
        img.src = illustration.path
    }, [config.illustrationId])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        ctx.scale(dpr, dpr)

        const width = rect.width
        const height = rect.height

        const cycleMs = speedToCycleMs(config.speed)
        const dotRadius = Math.min(width, height) * 0.045
        const paddingPx = dotRadius * 2

        const drawFrame = () => {
            const bgHex = getResolvedBackgroundHex(config)
            const dotHex = getResolvedColorHex(config)

            // Always paint the fallback color first — covers the "image still
            // loading" case AND fills any letterbox area if the bg image's
            // aspect ratio doesn't match the canvas. Then overlay the image
            // (object-fit: cover) if it's ready.
            ctx.fillStyle = bgHex
            ctx.fillRect(0, 0, width, height)

            if (config.background === 'image'
                && backgroundImgRef.current
                && backgroundReadyRef.current
            ) {
                drawCoverImage(ctx, backgroundImgRef.current, width, height)
            }

            // Resting position when idle/paused = wherever the motion helper
            // places the dot at phase 0 (i.e., centered for all directions).
            let x = width / 2
            let y = config.position === 'top'    ? height * 0.28
                  : config.position === 'bottom' ? height * 0.72
                                                 : height * 0.5

            if (runState === 'running' && startedAt !== null) {
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

                if (motion.passDirSign !== lastPassDirRef.current && lastPassDirRef.current !== 0) {
                    onPass?.()
                }
                lastPassDirRef.current = motion.passDirSign
            } else {
                lastPassDirRef.current = 0
            }

            if (config.visualEnabled) {
                if (config.stimulus === 'illustration'
                    && illustrationImgRef.current
                    && illustrationReadyRef.current
                ) {
                    const size = dotRadius * 4
                    ctx.drawImage(illustrationImgRef.current, x - size / 2, y - size / 2, size, size)
                } else if (config.stimulus === 'dot' || config.stimulus === 'illustration') {
                    // Illustration not yet loaded → fall back to a colored dot
                    // so the preview never goes blank.
                    ctx.beginPath()
                    ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
                    ctx.fillStyle = dotHex
                    ctx.fill()
                } else {
                    // Legacy Unicode glyph paths (stimulus === 'emoji' or
                    // 'animal'). Kept for backward compat with old session
                    // configs that haven't been migrated to illustrations.
                    const glyph = config.stimulus === 'emoji'
                        ? (config.stimulusEmoji ?? '⭐')
                        : (config.stimulusAnimal ?? '🐶')
                    const fontSize = dotRadius * 2.6
                    ctx.font = `${fontSize}px system-ui, -apple-system, "Segoe UI Emoji"`
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText(glyph, x, y)
                }
            } else {
                ctx.fillStyle = '#94A3B8'
                ctx.font = '11px system-ui, -apple-system'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText('Audio only', width / 2, height / 2)
            }

            rafRef.current = requestAnimationFrame(drawFrame)
        }

        rafRef.current = requestAnimationFrame(drawFrame)

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
        }
    }, [config, runState, startedAt, onPass])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative' }}>
                <canvas
                    ref={canvasRef}
                    style={{
                        width: '100%',
                        height: 200,
                        borderRadius: 10,
                        border: '1px solid #E2E8F0',
                        display: 'block',
                    }}
                    aria-label="Preview of what the client will see"
                />
                {runState === 'idle' && (
                    <div style={previewBadgeStyle('default')}>Preview</div>
                )}
                {runState === 'paused' && (
                    <div style={{ ...previewBadgeStyle('warning'), left: 'auto', right: 10 }}>Paused</div>
                )}
                {runState === 'running' && (
                    <div style={{ ...previewBadgeStyle('live'), left: 'auto', right: 10 }}>
                        <span style={{
                            display: 'inline-block',
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: '#EF4444',
                            marginRight: 6,
                            animation: 'bls-pulse 1.2s ease-in-out infinite',
                        }} />
                        Live
                    </div>
                )}
            </div>

            {config.auditoryEnabled && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 14,
                    fontSize: 12,
                    color: '#64748B',
                    fontWeight: 600,
                }}>
                    <span>Audio</span>
                    <AudioLRIndicator active={audioActive} />
                </div>
            )}

            <style>{`
                @keyframes bls-pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.85); }
                }
            `}</style>
        </div>
    )
}

/**
 * Draw `img` so it fills (canvasW × canvasH) like CSS `object-fit: cover`:
 * scale to the larger side, center-crop the overflow. Avoids stretching or
 * letterboxing, which matters for background photos where geometry counts.
 */
function drawCoverImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    canvasW: number,
    canvasH: number,
): void {
    const imgRatio = img.width / img.height
    const canvasRatio = canvasW / canvasH
    let sx = 0
    let sy = 0
    let sw = img.width
    let sh = img.height
    if (imgRatio > canvasRatio) {
        // Image is wider than canvas → crop horizontally
        sw = img.height * canvasRatio
        sx = (img.width - sw) / 2
    } else {
        // Image is taller → crop vertically
        sh = img.width / canvasRatio
        sy = (img.height - sh) / 2
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasW, canvasH)
}

function previewBadgeStyle(variant: 'default' | 'warning' | 'live'): CSSProperties {
    const palettes = {
        default: { bg: 'rgba(255,255,255,0.85)', fg: '#64748B' },
        warning: { bg: '#FEF3C7', fg: '#B45309' },
        live:    { bg: 'rgba(255,255,255,0.92)', fg: '#991B1B' },
    } as const
    const p = palettes[variant]
    return {
        position: 'absolute',
        top: 8,
        left: 10,
        fontSize: 11,
        fontWeight: 700,
        color: p.fg,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        background: p.bg,
        padding: '3px 9px',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
    }
}

/**
 * Two dots flanking the L/R labels — alternate while audio is active so the
 * therapist can visually confirm the L/R pattern is firing without needing to
 * listen on their own speakers.
 */
function AudioLRIndicator({ active }: { active: boolean }) {
    const [lit, setLit] = useState(false)

    useEffect(() => {
        if (!active) { setLit(false); return }
        const id = setInterval(() => setLit(prev => !prev), 500)
        return () => clearInterval(id)
    }, [active])

    const dotStyle = (on: boolean): CSSProperties => ({
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: on ? '#0D9488' : '#CBD5E1',
        transition: 'background 0.15s',
    })

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11 }}>L</span>
            <span style={dotStyle(active && lit)} />
            <span style={dotStyle(active && !lit)} />
            <span style={{ fontSize: 11 }}>R</span>
        </div>
    )
}
