import type { CSSProperties } from 'react'

interface BLSSessionCountersProps {
    timeSeconds: number
    passCount: number
    setCount: number
}

/**
 * Live session counters. Display-only — the values are driven by the page's
 * state (and by the server in production). Tabular-nums prevents the values
 * from "jittering" sideways as digits change during an active session.
 */
export default function BLSSessionCounters({ timeSeconds, passCount, setCount }: BLSSessionCountersProps) {
    return (
        <div style={containerStyle}>
            <Counter label="Time" value={formatTime(timeSeconds)} highlight={timeSeconds > 0} />
            <Counter label="Passes" value={passCount.toString()} highlight={passCount > 0} />
            <Counter label="Sets" value={setCount.toString()} highlight={setCount > 0} />
        </div>
    )
}

function Counter({ label, value, highlight }: { label: string; value: string; highlight: boolean }) {
    return (
        <div style={counterStyle}>
            <div style={counterLabelStyle}>{label}</div>
            <div style={counterValueStyle(highlight)}>{value}</div>
        </div>
    )
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
}

const containerStyle: CSSProperties = {
    display: 'flex',
    gap: 32,
}

const counterStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    minWidth: 70,
}

const counterLabelStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
}

const counterValueStyle = (highlight: boolean): CSSProperties => ({
    fontSize: 28,
    fontWeight: 700,
    color: highlight ? '#0F172A' : '#94A3B8',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
})
