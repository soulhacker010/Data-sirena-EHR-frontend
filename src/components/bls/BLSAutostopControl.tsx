import type { CSSProperties } from 'react'
import { Timer } from '@phosphor-icons/react'
import type { BLSAutostopMode } from '../../types/bls'

interface BLSAutostopControlProps {
    mode: BLSAutostopMode
    onModeChange: (mode: BLSAutostopMode) => void

    passes: number
    onPassesChange: (passes: number) => void

    seconds: number
    onSecondsChange: (seconds: number) => void

    disabled?: boolean
}

/**
 * Autostop control — three-state segmented selector with inline numeric input
 * for the active mode. Off/Passes/Seconds is the same set bilateralstimulation.io
 * exposes; the numeric inputs let Dr. Joe set whatever cadence fits the
 * clinical work without us picking the numbers for him.
 */
export default function BLSAutostopControl({
    mode, onModeChange,
    passes, onPassesChange,
    seconds, onSecondsChange,
    disabled = false,
}: BLSAutostopControlProps) {
    return (
        <div style={containerStyle}>
            <div style={iconLabelStyle}>
                <Timer size={18} weight="duotone" />
                <span style={labelTextStyle}>Autostop</span>
            </div>

            <div style={segmentedStyle}>
                <button
                    type="button"
                    onClick={() => onModeChange('off')}
                    disabled={disabled}
                    style={segmentStyle(mode === 'off')}
                >
                    Off
                </button>
                <button
                    type="button"
                    onClick={() => onModeChange('passes')}
                    disabled={disabled}
                    style={segmentStyle(mode === 'passes')}
                >
                    Passes
                </button>
                <button
                    type="button"
                    onClick={() => onModeChange('seconds')}
                    disabled={disabled}
                    style={segmentStyle(mode === 'seconds')}
                >
                    Time
                </button>
            </div>

            {mode === 'passes' && (
                <div style={numericGroupStyle}>
                    <input
                        type="number"
                        min={1}
                        max={300}
                        value={passes}
                        onChange={e => onPassesChange(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={disabled}
                        style={numericInputStyle}
                        aria-label="Stop after number of passes"
                    />
                    <span style={numericSuffixStyle}>passes</span>
                </div>
            )}

            {mode === 'seconds' && (
                <div style={numericGroupStyle}>
                    <input
                        type="number"
                        min={5}
                        max={900}
                        step={5}
                        value={seconds}
                        onChange={e => onSecondsChange(Math.max(5, parseInt(e.target.value) || 5))}
                        disabled={disabled}
                        style={numericInputStyle}
                        aria-label="Stop after number of seconds"
                    />
                    <span style={numericSuffixStyle}>sec</span>
                </div>
            )}
        </div>
    )
}

const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: 10,
}

const iconLabelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#475569',
}

const labelTextStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
}

const segmentedStyle: CSSProperties = {
    display: 'flex',
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    overflow: 'hidden',
}

const segmentStyle = (selected: boolean): CSSProperties => ({
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    background: selected ? '#0D9488' : '#FFFFFF',
    color: selected ? '#FFFFFF' : '#475569',
    cursor: 'pointer',
    transition: 'all 0.15s',
})

const numericGroupStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
}

const numericInputStyle: CSSProperties = {
    width: 64,
    height: 30,
    padding: '0 8px',
    border: '1px solid #CBD5E1',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
}

const numericSuffixStyle: CSSProperties = {
    fontSize: 12,
    color: '#64748B',
    fontWeight: 600,
}
