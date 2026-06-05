import type { CSSProperties } from 'react'
import { Gauge } from '@phosphor-icons/react'
import { BLS_SPEED_MIN, BLS_SPEED_MAX } from '../../lib/blsConstants'

interface BLSSpeedSliderProps {
    value: number
    onChange: (value: number) => void
    disabled?: boolean
}

/**
 * Speed slider. Lives prominently across the bottom of the panel (not nested
 * in a section) because it's adjusted most frequently during a session.
 * Speed maps to bilateral cycle frequency in BLSPreviewPane via the same
 * formula the eventual real client renderer will use.
 */
export default function BLSSpeedSlider({ value, onChange, disabled = false }: BLSSpeedSliderProps) {
    return (
        <div style={containerStyle}>
            <div style={iconLabelStyle}>
                <Gauge size={18} weight="duotone" />
                <span style={labelTextStyle}>Speed</span>
            </div>

            <input
                type="range"
                min={BLS_SPEED_MIN}
                max={BLS_SPEED_MAX}
                step={0.1}
                value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                disabled={disabled}
                style={sliderStyle}
                aria-label="BLS speed"
            />

            <div style={valueBadgeStyle}>{value.toFixed(1)}</div>
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
    flex: 1,
    minWidth: 240,
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

const sliderStyle: CSSProperties = {
    flex: 1,
}

const valueBadgeStyle: CSSProperties = {
    minWidth: 42,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 700,
    color: '#0F766E',
    background: '#CCFBF1',
    padding: '4px 10px',
    borderRadius: 6,
    fontVariantNumeric: 'tabular-nums',
}
