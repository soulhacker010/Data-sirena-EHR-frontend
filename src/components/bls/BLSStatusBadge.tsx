import type { CSSProperties } from 'react'
import type { BLSClientStatus } from '../../types/bls'

interface BLSStatusBadgeProps {
    status: BLSClientStatus
    /** True if an invite link has been generated but no client has connected
     *  yet. Used to distinguish "the link doesn't exist" from "the link is
     *  out, we're waiting for someone to open it" — same underlying status
     *  (no_client) but very different UX implication. */
    inviteSent?: boolean
}

/**
 * Connection status pill — mirrors the "No client connected" / "Connected"
 * indicator in bilateralstimulation.io's header, expanded to cover the
 * additional states our system tracks (audio failure, mid-session
 * disconnect, post-invite waiting).
 */
export default function BLSStatusBadge({ status, inviteSent }: BLSStatusBadgeProps) {
    const view = status === 'no_client' && inviteSent
        ? AWAITING_CLIENT_VIEW
        : STATUS_VIEW[status]
    return (
        <div style={badgeStyle(view.bg, view.border)}>
            <span style={dotStyle(view.dot, view.pulse)} />
            <span style={{ fontSize: 12, fontWeight: 700, color: view.text }}>{view.label}</span>

            {view.pulse && (
                <style>{`
                    @keyframes bls-status-pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.6); opacity: 0.3; }
                    }
                `}</style>
            )}
        </div>
    )
}

interface StatusView {
    label: string
    bg: string
    border: string
    text: string
    dot: string
    pulse: boolean
}

const STATUS_VIEW: Record<BLSClientStatus, StatusView> = {
    no_client:      { label: 'No client connected', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', dot: '#DC2626', pulse: false },
    connecting:     { label: 'Connecting…',         bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B', pulse: true  },
    connected:      { label: 'Client connected',    bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', dot: '#10B981', pulse: false },
    disconnected:   { label: 'Client disconnected', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', dot: '#DC2626', pulse: true  },
    audio_failed:   { label: 'Client audio failed', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B', pulse: false },
}

const AWAITING_CLIENT_VIEW: StatusView = {
    label: 'Awaiting client',
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    dot: '#F59E0B',
    pulse: true,
}

const badgeStyle = (bg: string, border: string): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 12px',
    borderRadius: 999,
    background: bg,
    border: `1px solid ${border}`,
})

const dotStyle = (color: string, pulse: boolean): CSSProperties => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    animation: pulse ? 'bls-status-pulse 1.4s ease-in-out infinite' : 'none',
})
