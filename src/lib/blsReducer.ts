/**
 * BLS panel state machine — pure reducer extracted so it can be unit-tested
 * in isolation from BLSControlPage's hooks, transports, and side effects.
 *
 * All side effects (history persistence, transport publish, toast,
 * timer/audio loops) stay in the page component. This file contains only
 * deterministic state transitions.
 */
import type { BLSConfig, BLSLiveState } from '../types/bls'
import { DEFAULT_BLS_CONFIG, DEFAULT_BLS_LIVE } from './blsConstants'
import { getBLSDefaults } from './blsDefaults'

export interface PanelState {
    config: BLSConfig
    live: BLSLiveState
}

export type BLSAction =
    | { type: 'UPDATE_CONFIG'; patch: Partial<BLSConfig> }
    | { type: 'INVITE_CLIENT' }
    | { type: 'INVITE_CLIENT_FROM_BACKEND'; sessionId: string; inviteUrl: string }
    | { type: 'CLIENT_CONNECTED' }
    | { type: 'CLIENT_DISCONNECTED'; reason: 'network' | 'manual' }
    | { type: 'START' }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'STOP_SET' }
    | { type: 'RESET_COUNTERS' }
    | { type: 'END_SESSION' }
    | { type: 'TICK'; deltaSeconds: number }
    | { type: 'INCREMENT_PASS' }
    | {
        type: 'POPULATE_CONTEXT'
        clientId: string | null
        clientName: string | null
        appointmentId: string | null
        appointmentLabel: string | null
    }

/**
 * Initial state — computed at panel mount so it picks up any org-wide
 * defaults the practice has saved in Settings → BLS Defaults. Merges over
 * DEFAULT_BLS_CONFIG so any fields the user hasn't customized (e.g. kids
 * mode, volume, mute) still get their hardcoded sensible values.
 */
export function buildInitialBLSPanelState(): PanelState {
    const orgDefaults = getBLSDefaults()
    return {
        config: {
            ...DEFAULT_BLS_CONFIG,
            speed: orgDefaults.speed,
            sound: orgDefaults.sound,
            color: orgDefaults.color,
            background: orgDefaults.background,
            autostopMode: orgDefaults.autostop_mode,
            autostopPasses: orgDefaults.autostop_passes,
            autostopSeconds: orgDefaults.autostop_seconds,
        },
        live: DEFAULT_BLS_LIVE,
    }
}

/**
 * Synthesize an opaque-looking id for the mock URL. Real tokens are signed
 * server-side (TimestampSigner). See BLS-SYSTEM-DESIGN.md §6.
 *
 * Lifted out of the reducer body so tests can stub it for deterministic
 * assertions on the generated URL shape.
 */
export function mockSessionId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let s = ''
    for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)]
    return s
}

export function blsReducer(state: PanelState, action: BLSAction): PanelState {
    switch (action.type) {
        case 'UPDATE_CONFIG':
            return { ...state, config: { ...state.config, ...action.patch } }

        case 'INVITE_CLIENT': {
            // Demo / fallback mode — no backend reachable. Synthesize the
            // session id + URL locally so the BroadcastChannel transport can
            // still connect two tabs of the same browser. Used as the catch
            // branch in handleInvite when the API call to POST /sessions/
            // fails (preview deploys without a backend, dev without a server
            // running, etc.).
            //
            // We DON'T set clientStatus to 'connecting' here — there's no
            // actual handshake happening yet, just a link sitting in the
            // clinician's clipboard. The status flips to 'connected' only
            // when the client tab opens and sends CLIENT_HELLO.
            const sessionId = mockSessionId()
            const inviteUrl = `${window.location.origin}/bls/c/${sessionId}`
            return {
                ...state,
                live: {
                    ...state.live,
                    sessionId,
                    inviteUrl,
                    clientStatus: 'no_client',
                },
            }
        }

        case 'INVITE_CLIENT_FROM_BACKEND': {
            // Backend mode — session_id and signed token came from
            // POST /api/v1/bls/sessions/. The URL was composed server-side
            // using the frontend host (settings.FRONTEND_BASE_URL).
            return {
                ...state,
                live: {
                    ...state.live,
                    sessionId: action.sessionId,
                    inviteUrl: action.inviteUrl,
                    clientStatus: 'no_client',
                },
            }
        }

        case 'CLIENT_CONNECTED':
            return { ...state, live: { ...state.live, clientStatus: 'connected' } }

        case 'CLIENT_DISCONNECTED':
            // If BLS was running, fall back to paused (Kill Switch behavior
            // from BLS-SYSTEM-DESIGN.md §7 F4). The clinician can decide
            // whether to resume or end the session when the client returns.
            return {
                ...state,
                live: {
                    ...state.live,
                    clientStatus: 'disconnected',
                    runState: state.live.runState === 'running' ? 'paused' : state.live.runState,
                    pausedAt: state.live.runState === 'running' ? Date.now() : state.live.pausedAt,
                },
            }

        case 'START':
            return {
                ...state,
                live: {
                    ...state.live,
                    runState: 'running',
                    startedAt: Date.now(),
                    pausedAt: null,
                    // Stamp the session's first-start time if not already set.
                    // Preserved through STOP_SET so the history record reflects
                    // when the *clinical session* began, not the last set.
                    sessionStartedAt: state.live.sessionStartedAt ?? Date.now(),
                },
            }

        case 'PAUSE':
            return {
                ...state,
                live: {
                    ...state.live,
                    runState: 'paused',
                    pausedAt: Date.now(),
                },
            }

        case 'RESUME': {
            // Smooth resume: shift startedAt forward by the pause duration so
            // the dot continues from where it stopped instead of teleporting.
            // Without this the visual jumps back to center on every resume,
            // which is jarring for the client mid-EMDR set.
            const pauseDuration = state.live.pausedAt ? Date.now() - state.live.pausedAt : 0
            return {
                ...state,
                live: {
                    ...state.live,
                    runState: 'running',
                    startedAt: state.live.startedAt !== null
                        ? state.live.startedAt + pauseDuration
                        : Date.now(),
                    pausedAt: null,
                },
            }
        }

        case 'STOP_SET':
            // End-of-set: dot stops, counters preserve, set counter increments.
            return {
                ...state,
                live: {
                    ...state.live,
                    runState: 'idle',
                    setCount: state.live.passCount > 0 ? state.live.setCount + 1 : state.live.setCount,
                    startedAt: null,
                    pausedAt: null,
                },
            }

        case 'RESET_COUNTERS':
            return {
                ...state,
                live: {
                    ...state.live,
                    timeSeconds: 0,
                    passCount: 0,
                    setCount: 0,
                    runState: 'idle',
                    startedAt: null,
                    pausedAt: null,
                },
            }

        case 'END_SESSION':
            // In prod: POST /bls/sessions/{id}/end — persists counters, writes
            // session-note auto-log, expires the token, broadcasts SESSION_END.
            // Preserve the context fields so the panel still shows the client
            // header (the chart stays mounted; only the session resets).
            return {
                ...state,
                live: {
                    ...DEFAULT_BLS_LIVE,
                    clientId: state.live.clientId,
                    clientName: state.live.clientName,
                    appointmentId: state.live.appointmentId,
                    appointmentLabel: state.live.appointmentLabel,
                },
            }

        case 'TICK':
            return {
                ...state,
                live: { ...state.live, timeSeconds: state.live.timeSeconds + action.deltaSeconds },
            }

        case 'INCREMENT_PASS':
            return { ...state, live: { ...state.live, passCount: state.live.passCount + 1 } }

        case 'POPULATE_CONTEXT':
            return {
                ...state,
                live: {
                    ...state.live,
                    clientId: action.clientId,
                    clientName: action.clientName,
                    appointmentId: action.appointmentId,
                    appointmentLabel: action.appointmentLabel,
                },
            }

        default:
            return state
    }
}
