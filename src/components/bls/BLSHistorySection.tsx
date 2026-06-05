import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Waveform,
    Play,
    Clock,
    ArrowsLeftRight,
    Stack,
    ArrowClockwise,
    Eye,
    Headphones,
} from '@phosphor-icons/react'
import { getBLSHistory } from '../../lib/blsHistory'
import type { BLSHistoryRecord } from '../../lib/blsHistory'
import { getColor, getSound, BLS_SOUNDS } from '../../lib/blsConstants'

interface BLSHistorySectionProps {
    clientId: string
    clientName: string
}

/**
 * BLS history section in the client chart. Shows past Bilateral Stimulation
 * sessions for this client, most-recent first. Empty state when none.
 *
 * Data source: localStorage via lib/blsHistory (mock). Swaps for a real API
 * call in Phase 1 — same record shape, same render. Reads on mount and on
 * manual refresh; we don't poll because BLS history changes infrequently
 * compared to other tabs.
 */
export default function BLSHistorySection({ clientId, clientName }: BLSHistorySectionProps) {
    const navigate = useNavigate()
    const [records, setRecords] = useState<BLSHistoryRecord[]>([])
    const [refreshing, setRefreshing] = useState(false)

    const load = useCallback(() => {
        setRefreshing(true)
        try {
            setRecords(getBLSHistory(clientId))
        } finally {
            // tiny debounce so the spinner is visible even on instant reads
            setTimeout(() => setRefreshing(false), 200)
        }
    }, [clientId])

    useEffect(() => { load() }, [load])

    const handleLaunchBLS = () => {
        const params = new URLSearchParams({
            client_id: clientId,
            client_name: clientName,
        })
        navigate(`/bls/control?${params.toString()}`)
    }

    return (
        <div className="space-y-6">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">
                        <Waveform size={18} weight="duotone" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                        Bilateral Stimulation Sessions
                    </h2>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className="btn-secondary btn-sm"
                            onClick={load}
                            disabled={refreshing}
                            title="Refresh"
                        >
                            <ArrowClockwise size={14} weight={refreshing ? 'fill' : 'regular'} />
                            Refresh
                        </button>
                        <button
                            className="btn-primary btn-sm"
                            onClick={handleLaunchBLS}
                        >
                            <Play size={14} weight="fill" />
                            Launch BLS
                        </button>
                    </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {records.length === 0
                        ? <EmptyState onLaunch={handleLaunchBLS} />
                        : <SessionList records={records} />
                    }
                </div>
            </div>
        </div>
    )
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onLaunch }: { onLaunch: () => void }) {
    return (
        <div style={emptyStateStyle}>
            <div style={emptyIconCircleStyle}>
                <Waveform size={32} weight="duotone" />
            </div>
            <h3 style={emptyTitleStyle}>No BLS sessions yet</h3>
            <p style={emptyTextStyle}>
                When you run a Bilateral Stimulation session with this client, the
                duration, sets, and settings used will appear here automatically.
            </p>
            <button className="btn-primary" onClick={onLaunch} style={{ marginTop: 8 }}>
                <Play size={14} weight="fill" />
                Launch first BLS session
            </button>
        </div>
    )
}

// ─── Session list ───────────────────────────────────────────────────────────

function SessionList({ records }: { records: BLSHistoryRecord[] }) {
    // Group by month for scannability. Order preserved within each group.
    const groups = useMemo(() => groupByMonth(records), [records])

    return (
        <div>
            {groups.map(group => (
                <div key={group.label}>
                    <div style={groupHeaderStyle}>{group.label}</div>
                    {group.records.map(r => <SessionRow key={r.id} record={r} />)}
                </div>
            ))}
        </div>
    )
}

function SessionRow({ record }: { record: BLSHistoryRecord }) {
    const startDate = new Date(record.started_at)
    const dotColor = getColor(record.settings_snapshot.color)
    const sound = getSound(record.settings_snapshot.sound)

    return (
        <div style={rowStyle}>
            <div style={rowLeftStyle}>
                <div style={dateColStyle}>
                    <div style={dateDayStyle}>
                        {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div style={dateTimeStyle}>
                        {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                </div>

                <div style={dotPreviewStyle(dotColor.hex)} aria-hidden="true" />

                <div style={metaColStyle}>
                    <div style={metaRowStyle}>
                        <ModalityBadge modality={record.modality} />
                        <span style={settingsTextStyle}>
                            {sound.icon} {sound.label} · Speed {record.settings_snapshot.speed.toFixed(1)}
                        </span>
                    </div>
                    {record.settings_snapshot.stimulus !== 'dot' && record.settings_snapshot.stimulus_glyph && (
                        <div style={kidsTagStyle}>
                            Kids mode · {record.settings_snapshot.stimulus_glyph}
                        </div>
                    )}
                </div>
            </div>

            <div style={rowRightStyle}>
                <Stat icon={<Clock size={14} />} label={formatDuration(record.duration_seconds)} />
                <Stat icon={<Stack size={14} />} label={`${record.set_count} ${record.set_count === 1 ? 'set' : 'sets'}`} />
                <Stat icon={<ArrowsLeftRight size={14} />} label={`${record.pass_count} passes`} />
            </div>
        </div>
    )
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div style={statStyle}>
            <span style={{ color: '#94A3B8' }}>{icon}</span>
            <span>{label}</span>
        </div>
    )
}

function ModalityBadge({ modality }: { modality: BLSHistoryRecord['modality'] }) {
    if (modality === 'both') {
        return (
            <span style={modalityBadgeStyle('#E0F2FE', '#075985')}>
                <Eye size={11} weight="fill" /> + <Headphones size={11} weight="fill" /> Visual + Audio
            </span>
        )
    }
    if (modality === 'visual_only') {
        return (
            <span style={modalityBadgeStyle('#FEF3C7', '#92400E')}>
                <Eye size={11} weight="fill" /> Visual only
            </span>
        )
    }
    return (
        <span style={modalityBadgeStyle('#EDE9FE', '#5B21B6')}>
            <Headphones size={11} weight="fill" /> Audio only
        </span>
    )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (s === 0) return `${m}m`
    return `${m}m ${s}s`
}

interface MonthGroup { label: string; records: BLSHistoryRecord[] }

function groupByMonth(records: BLSHistoryRecord[]): MonthGroup[] {
    const groups: MonthGroup[] = []
    for (const r of records) {
        const d = new Date(r.started_at)
        const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        const existing = groups.find(g => g.label === label)
        if (existing) existing.records.push(r)
        else groups.push({ label, records: [r] })
    }
    return groups
}

// Silence the unused-import warning for BLS_SOUNDS — the array is exported so
// other consumers can iterate; we only need getSound here, but keeping the
// import explicit makes the dependency obvious during future edits.
void BLS_SOUNDS

// ─── Styles ─────────────────────────────────────────────────────────────────

const emptyStateStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '48px 24px',
    gap: 14,
}

const emptyIconCircleStyle: CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'rgba(13,148,136,0.10)',
    color: '#0D9488',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}

const emptyTitleStyle: CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
}

const emptyTextStyle: CSSProperties = {
    fontSize: 13,
    color: '#64748B',
    margin: 0,
    maxWidth: 380,
    lineHeight: 1.55,
}

const groupHeaderStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    padding: '14px 20px 8px',
    borderTop: '1px solid #F1F5F9',
}

const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderTop: '1px solid #F1F5F9',
    gap: 16,
    flexWrap: 'wrap',
}

const rowLeftStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
}

const dateColStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 60,
}

const dateDayStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: '#0F172A',
    whiteSpace: 'nowrap',
}

const dateTimeStyle: CSSProperties = {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 600,
    whiteSpace: 'nowrap',
}

const dotPreviewStyle = (hex: string): CSSProperties => ({
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: hex,
    flexShrink: 0,
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
})

const metaColStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
}

const metaRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
}

const settingsTextStyle: CSSProperties = {
    fontSize: 12,
    color: '#475569',
    fontWeight: 500,
}

const kidsTagStyle: CSSProperties = {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: 600,
    background: '#CCFBF1',
    padding: '2px 8px',
    borderRadius: 999,
    width: 'fit-content',
}

const rowRightStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    flexWrap: 'wrap',
}

const statStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    fontVariantNumeric: 'tabular-nums',
}

const modalityBadgeStyle = (bg: string, fg: string): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    background: bg,
    color: fg,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    borderRadius: 999,
})
