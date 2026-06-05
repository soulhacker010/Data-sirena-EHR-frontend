import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { hexToHsl, hslToHex, normalizeHex, clamp } from '../../lib/blsColor'

interface BLSColorPickerPopoverProps {
    value: string  // hex, e.g. "#0EA5E9"
    onChange: (hex: string) => void
    onClose: () => void
    /** Anchor element used by outside-click detection so clicking back on the
     *  trigger doesn't fire both "close" and "re-open". */
    anchorRef?: RefObject<HTMLElement | null>
}

/**
 * HSV-style color picker popover. Matches the bilateralstimulation.io look:
 *  - 2D area for Hue × Saturation
 *  - Vertical slider for Lightness
 *  - Hex input + close button
 *
 * Drag support, click-outside-to-close, Escape-key-to-close, hex input with
 * validation. All color math is in lib/blsColor.ts so this file stays
 * focused on the rendering and event wiring.
 */
export default function BLSColorPickerPopover({
    value, onChange, onClose, anchorRef,
}: BLSColorPickerPopoverProps) {
    const { h, s, l } = hexToHsl(value)
    const areaRef = useRef<HTMLDivElement>(null)
    const sliderRef = useRef<HTMLDivElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)
    const [hexInput, setHexInput] = useState(value)

    // Keep the hex input synced when value changes from outside (e.g. user
    // drags the 2D area cursor — we want the input to reflect it).
    useEffect(() => { setHexInput(value) }, [value])

    // Outside-click → close, but treat the anchor as part of the popover
    // (clicking the trigger again should close cleanly, not re-open).
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node
            if (popoverRef.current?.contains(target)) return
            if (anchorRef?.current?.contains(target)) return
            onClose()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose, anchorRef])

    // Escape closes.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
            }
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    // ─── 2D area: click + drag → set H from X, S from inverse Y ────────────
    const updateFromAreaEvent = (clientX: number, clientY: number) => {
        if (!areaRef.current) return
        const rect = areaRef.current.getBoundingClientRect()
        const x = clamp(clientX - rect.left, 0, rect.width)
        const y = clamp(clientY - rect.top, 0, rect.height)
        const newH = Math.round((x / rect.width) * 360)
        const newS = Math.round(100 - (y / rect.height) * 100)
        onChange(hslToHex({ h: newH, s: newS, l }))
    }

    const handleAreaMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        updateFromAreaEvent(e.clientX, e.clientY)
        const move = (ev: MouseEvent) => updateFromAreaEvent(ev.clientX, ev.clientY)
        const up = () => {
            document.removeEventListener('mousemove', move)
            document.removeEventListener('mouseup', up)
        }
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup', up)
    }

    // ─── Lightness slider: click + drag → set L ────────────────────────────
    const updateFromSliderEvent = (clientY: number) => {
        if (!sliderRef.current) return
        const rect = sliderRef.current.getBoundingClientRect()
        const y = clamp(clientY - rect.top, 0, rect.height)
        const newL = Math.round(100 - (y / rect.height) * 100)
        onChange(hslToHex({ h, s, l: newL }))
    }

    const handleSliderMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        updateFromSliderEvent(e.clientY)
        const move = (ev: MouseEvent) => updateFromSliderEvent(ev.clientY)
        const up = () => {
            document.removeEventListener('mousemove', move)
            document.removeEventListener('mouseup', up)
        }
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup', up)
    }

    // ─── Hex input ─────────────────────────────────────────────────────────
    const commitHex = () => {
        const normalized = normalizeHex(hexInput)
        if (normalized) onChange(normalized)
        else setHexInput(value)  // revert to last valid
    }

    return (
        <div ref={popoverRef} style={popoverStyle} role="dialog" aria-label="Color picker">
            {/* Picker area row */}
            <div style={pickerRowStyle}>
                <div
                    ref={areaRef}
                    style={areaStyle}
                    onMouseDown={handleAreaMouseDown}
                    role="application"
                    aria-label="Hue and saturation picker"
                >
                    <div
                        style={areaCursorStyle({
                            left: `${(h / 360) * 100}%`,
                            top: `${100 - s}%`,
                        })}
                        aria-hidden="true"
                    />
                </div>

                <div
                    ref={sliderRef}
                    style={sliderStyle}
                    onMouseDown={handleSliderMouseDown}
                    role="application"
                    aria-label="Lightness picker"
                >
                    <div
                        style={sliderCursorStyle({ top: `${100 - l}%` })}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {/* Hex input row */}
            <div style={inputRowStyle}>
                <button type="button" onClick={onClose} style={closeBtnStyle}>
                    Close
                </button>
                <input
                    type="text"
                    value={hexInput}
                    onChange={e => setHexInput(e.target.value)}
                    onBlur={commitHex}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            commitHex()
                            ;(e.target as HTMLInputElement).blur()
                        }
                    }}
                    spellCheck={false}
                    style={hexInputStyle}
                    aria-label="Hex color value"
                />
            </div>
        </div>
    )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const popoverStyle: CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    zIndex: 100,
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
    padding: 12,
    width: 280,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
}

const pickerRowStyle: CSSProperties = {
    display: 'flex',
    gap: 10,
}

const areaStyle: CSSProperties = {
    width: 220,
    height: 140,
    borderRadius: 6,
    cursor: 'crosshair',
    position: 'relative',
    border: '1px solid #E2E8F0',
    // Layered: white fade overlay (vertical) on top of rainbow (horizontal).
    background: `
        linear-gradient(to bottom, transparent, #FFFFFF),
        linear-gradient(to right,
            hsl(0, 100%, 50%),
            hsl(60, 100%, 50%),
            hsl(120, 100%, 50%),
            hsl(180, 100%, 50%),
            hsl(240, 100%, 50%),
            hsl(300, 100%, 50%),
            hsl(360, 100%, 50%)
        )
    `,
    userSelect: 'none',
}

const areaCursorStyle = (pos: { left: string; top: string }): CSSProperties => ({
    position: 'absolute',
    left: pos.left,
    top: pos.top,
    width: 14,
    height: 14,
    border: '2px solid #FFFFFF',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
    pointerEvents: 'none',
})

const sliderStyle: CSSProperties = {
    width: 22,
    height: 140,
    borderRadius: 6,
    cursor: 'ns-resize',
    position: 'relative',
    border: '1px solid #E2E8F0',
    // Top = light (white), bottom = dark (black)
    background: 'linear-gradient(to bottom, #FFFFFF, #808080, #000000)',
    userSelect: 'none',
}

const sliderCursorStyle = (pos: { top: string }): CSSProperties => ({
    position: 'absolute',
    left: -2,
    right: -2,
    top: pos.top,
    height: 8,
    border: '2px solid #1F2937',
    borderRadius: 3,
    background: '#FFFFFF',
    transform: 'translateY(-50%)',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.5)',
    pointerEvents: 'none',
})

const inputRowStyle: CSSProperties = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
}

const closeBtnStyle: CSSProperties = {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    background: '#FFFFFF',
    color: '#475569',
    border: '1px solid #CBD5E1',
    borderRadius: 6,
    cursor: 'pointer',
}

const hexInputStyle: CSSProperties = {
    flex: 1,
    padding: '6px 10px',
    fontSize: 12,
    fontFamily: '"SF Mono", Menlo, Consolas, monospace',
    fontWeight: 600,
    color: '#1F2937',
    border: '1px solid #CBD5E1',
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
}
