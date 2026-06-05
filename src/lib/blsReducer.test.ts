import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { blsReducer, buildInitialBLSPanelState, mockSessionId } from './blsReducer'
import type { PanelState, BLSAction } from './blsReducer'
import { DEFAULT_BLS_LIVE } from './blsConstants'

/**
 * Unit tests for the BLS state machine. Targets the exact transitions that
 * have bitten us during development:
 *  - START stamps sessionStartedAt once, preserves across STOP_SET → START
 *  - PAUSE → RESUME shifts startedAt forward so the dot doesn't teleport
 *  - END_SESSION preserves client context (so the chart stays mounted)
 *  - INVITE_CLIENT generates URL + leaves clientStatus as 'no_client' (no
 *    fake "connecting" anymore)
 *  - STOP_SET increments setCount only when a pass was actually completed
 *  - CLIENT_DISCONNECTED auto-pauses if running (Kill Switch)
 */

const baseState = (): PanelState => buildInitialBLSPanelState()

const dispatch = (state: PanelState, ...actions: BLSAction[]): PanelState =>
    actions.reduce((s, a) => blsReducer(s, a), state)

// All transitions that use Date.now() are tested against a fixed clock so
// startedAt math is deterministic. We restore after each test.
beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T14:00:00.000Z'))
})
afterEach(() => {
    vi.useRealTimers()
})

describe('blsReducer — UPDATE_CONFIG', () => {
    it('shallow-merges the patch into config', () => {
        const result = blsReducer(baseState(), {
            type: 'UPDATE_CONFIG',
            patch: { speed: 8, sound: 'soft_bell' },
        })
        expect(result.config.speed).toBe(8)
        expect(result.config.sound).toBe('soft_bell')
        // Untouched fields preserved
        expect(result.config.color).toBe(baseState().config.color)
    })

    it('does not mutate the prior state', () => {
        const prior = baseState()
        const frozen = JSON.stringify(prior)
        blsReducer(prior, { type: 'UPDATE_CONFIG', patch: { speed: 3 } })
        expect(JSON.stringify(prior)).toBe(frozen)
    })
})

describe('blsReducer — INVITE_CLIENT', () => {
    it('generates a sessionId + invite URL', () => {
        const result = blsReducer(baseState(), { type: 'INVITE_CLIENT' })
        expect(result.live.sessionId).toBeTruthy()
        expect(result.live.sessionId).toMatch(/^[a-z0-9]{24}$/)
        expect(result.live.inviteUrl).toContain(result.live.sessionId!)
    })

    it('keeps clientStatus as no_client (no fake "connecting")', () => {
        const result = blsReducer(baseState(), { type: 'INVITE_CLIENT' })
        // Critical regression guard: we explicitly do NOT set this to
        // 'connecting' anymore because BroadcastChannel has no handshake.
        expect(result.live.clientStatus).toBe('no_client')
    })
})

describe('blsReducer — CLIENT_CONNECTED / CLIENT_DISCONNECTED', () => {
    it('CLIENT_CONNECTED flips clientStatus to connected', () => {
        const result = blsReducer(baseState(), { type: 'CLIENT_CONNECTED' })
        expect(result.live.clientStatus).toBe('connected')
    })

    it('CLIENT_DISCONNECTED while running auto-pauses (Kill Switch F4)', () => {
        const state = dispatch(
            baseState(),
            { type: 'INVITE_CLIENT' },
            { type: 'CLIENT_CONNECTED' },
            { type: 'START' },
        )
        expect(state.live.runState).toBe('running')

        const after = blsReducer(state, { type: 'CLIENT_DISCONNECTED', reason: 'network' })
        expect(after.live.clientStatus).toBe('disconnected')
        expect(after.live.runState).toBe('paused')
        expect(after.live.pausedAt).not.toBeNull()
    })

    it('CLIENT_DISCONNECTED while idle does not change runState', () => {
        const state = baseState()
        const after = blsReducer(state, { type: 'CLIENT_DISCONNECTED', reason: 'manual' })
        expect(after.live.clientStatus).toBe('disconnected')
        expect(after.live.runState).toBe('idle')
        expect(after.live.pausedAt).toBeNull()
    })
})

describe('blsReducer — START / PAUSE / RESUME', () => {
    it('START stamps startedAt and sessionStartedAt to now', () => {
        const result = blsReducer(baseState(), { type: 'START' })
        expect(result.live.runState).toBe('running')
        expect(result.live.startedAt).toBe(Date.now())
        expect(result.live.sessionStartedAt).toBe(Date.now())
        expect(result.live.pausedAt).toBeNull()
    })

    it('sessionStartedAt is preserved across STOP_SET → START', () => {
        // First start at t=0
        const firstStart = blsReducer(baseState(), { type: 'START' })
        const firstSessionStart = firstStart.live.sessionStartedAt

        // Time passes
        vi.advanceTimersByTime(5000)

        // Stop the set, then start a second one
        const afterSecondStart = dispatch(firstStart,
            { type: 'STOP_SET' },
            { type: 'START' },
        )

        // The CURRENT set started at the new time...
        expect(afterSecondStart.live.startedAt).toBe(Date.now())
        // ...but sessionStartedAt remains the original (clinical session start)
        expect(afterSecondStart.live.sessionStartedAt).toBe(firstSessionStart)
    })

    it('PAUSE records pausedAt without disturbing startedAt', () => {
        const started = blsReducer(baseState(), { type: 'START' })
        const startedAtBefore = started.live.startedAt

        vi.advanceTimersByTime(2000)
        const paused = blsReducer(started, { type: 'PAUSE' })

        expect(paused.live.runState).toBe('paused')
        expect(paused.live.pausedAt).toBe(Date.now())
        expect(paused.live.startedAt).toBe(startedAtBefore)  // unchanged
    })

    it('RESUME shifts startedAt forward by the pause duration (smooth resume)', () => {
        const started = blsReducer(baseState(), { type: 'START' })
        const originalStartedAt = started.live.startedAt!

        vi.advanceTimersByTime(2000)
        const paused = blsReducer(started, { type: 'PAUSE' })

        vi.advanceTimersByTime(3000)  // 3 seconds of pause
        const resumed = blsReducer(paused, { type: 'RESUME' })

        expect(resumed.live.runState).toBe('running')
        expect(resumed.live.pausedAt).toBeNull()
        // Critical: shifted forward by exactly the pause duration so the
        // phase math gives the same dot position as before the pause.
        expect(resumed.live.startedAt).toBe(originalStartedAt + 3000)
    })

    it('RESUME without a pausedAt falls back to "now" (defensive)', () => {
        const weird: PanelState = {
            ...baseState(),
            live: { ...baseState().live, runState: 'paused', pausedAt: null, startedAt: 1000 },
        }
        const result = blsReducer(weird, { type: 'RESUME' })
        // pauseDuration = 0 when pausedAt is null, so startedAt unchanged
        expect(result.live.startedAt).toBe(1000)
        expect(result.live.runState).toBe('running')
    })
})

describe('blsReducer — STOP_SET', () => {
    it('increments setCount only when at least one pass was completed', () => {
        // No passes → no set
        const noPassState = blsReducer(baseState(), { type: 'START' })
        const afterStopEmpty = blsReducer(noPassState, { type: 'STOP_SET' })
        expect(afterStopEmpty.live.setCount).toBe(0)

        // With passes → set increments
        const withPasses = dispatch(noPassState,
            { type: 'INCREMENT_PASS' },
            { type: 'INCREMENT_PASS' },
        )
        const afterStopWithPasses = blsReducer(withPasses, { type: 'STOP_SET' })
        expect(afterStopWithPasses.live.setCount).toBe(1)
        // Passes are PRESERVED — they accumulate across sets
        expect(afterStopWithPasses.live.passCount).toBe(2)
    })

    it('clears startedAt and pausedAt', () => {
        const state = blsReducer(baseState(), { type: 'START' })
        const stopped = blsReducer(state, { type: 'STOP_SET' })
        expect(stopped.live.startedAt).toBeNull()
        expect(stopped.live.pausedAt).toBeNull()
    })
})

describe('blsReducer — END_SESSION', () => {
    it('resets counters but preserves client + appointment context', () => {
        const populated = dispatch(baseState(),
            {
                type: 'POPULATE_CONTEXT',
                clientId: 'c-123',
                clientName: 'Jane Doe',
                appointmentId: 'a-456',
                appointmentLabel: 'Mon Jun 4 · 2:00 PM',
            },
            { type: 'INVITE_CLIENT' },
            { type: 'CLIENT_CONNECTED' },
            { type: 'START' },
            { type: 'INCREMENT_PASS' },
            { type: 'INCREMENT_PASS' },
            { type: 'STOP_SET' },
        )
        // Sanity check: counters accumulated
        expect(populated.live.passCount).toBe(2)
        expect(populated.live.setCount).toBe(1)

        const ended = blsReducer(populated, { type: 'END_SESSION' })

        // Counters cleared
        expect(ended.live.passCount).toBe(0)
        expect(ended.live.setCount).toBe(0)
        expect(ended.live.timeSeconds).toBe(0)
        expect(ended.live.runState).toBe('idle')
        expect(ended.live.sessionId).toBeNull()
        expect(ended.live.inviteUrl).toBeNull()
        expect(ended.live.clientStatus).toBe('no_client')

        // Context preserved — clinician can run another session for same client
        expect(ended.live.clientId).toBe('c-123')
        expect(ended.live.clientName).toBe('Jane Doe')
        expect(ended.live.appointmentId).toBe('a-456')
        expect(ended.live.appointmentLabel).toBe('Mon Jun 4 · 2:00 PM')
    })
})

describe('blsReducer — TICK / INCREMENT_PASS', () => {
    it('TICK accumulates deltaSeconds into timeSeconds', () => {
        const state = baseState()
        const after1 = blsReducer(state, { type: 'TICK', deltaSeconds: 0.2 })
        const after2 = blsReducer(after1, { type: 'TICK', deltaSeconds: 0.5 })
        expect(after2.live.timeSeconds).toBeCloseTo(0.7, 5)
    })

    it('INCREMENT_PASS increments passCount by 1', () => {
        const state = blsReducer(baseState(), { type: 'INCREMENT_PASS' })
        expect(state.live.passCount).toBe(1)
    })
})

describe('blsReducer — POPULATE_CONTEXT', () => {
    it('sets all four context fields together', () => {
        const result = blsReducer(baseState(), {
            type: 'POPULATE_CONTEXT',
            clientId: 'c-1',
            clientName: 'Alice',
            appointmentId: 'a-1',
            appointmentLabel: 'Wed 3pm',
        })
        expect(result.live.clientId).toBe('c-1')
        expect(result.live.clientName).toBe('Alice')
        expect(result.live.appointmentId).toBe('a-1')
        expect(result.live.appointmentLabel).toBe('Wed 3pm')
    })

    it('can clear context by passing nulls', () => {
        const populated = blsReducer(baseState(), {
            type: 'POPULATE_CONTEXT',
            clientId: 'c-1', clientName: 'Alice',
            appointmentId: 'a-1', appointmentLabel: 'Wed 3pm',
        })
        const cleared = blsReducer(populated, {
            type: 'POPULATE_CONTEXT',
            clientId: null, clientName: null,
            appointmentId: null, appointmentLabel: null,
        })
        expect(cleared.live.clientId).toBeNull()
        expect(cleared.live.clientName).toBeNull()
        expect(cleared.live.appointmentId).toBeNull()
        expect(cleared.live.appointmentLabel).toBeNull()
    })
})

describe('blsReducer — RESET_COUNTERS', () => {
    it('zeroes timeSeconds, passCount, setCount and returns to idle', () => {
        const state = dispatch(baseState(),
            { type: 'START' },
            { type: 'INCREMENT_PASS' },
            { type: 'INCREMENT_PASS' },
            { type: 'TICK', deltaSeconds: 5 },
            { type: 'STOP_SET' },  // sets setCount to 1
        )
        const reset = blsReducer(state, { type: 'RESET_COUNTERS' })
        expect(reset.live.timeSeconds).toBe(0)
        expect(reset.live.passCount).toBe(0)
        expect(reset.live.setCount).toBe(0)
        expect(reset.live.runState).toBe('idle')
    })
})

describe('mockSessionId', () => {
    it('returns a 24-char lowercase alphanumeric string', () => {
        for (let i = 0; i < 50; i++) {
            const id = mockSessionId()
            expect(id).toMatch(/^[a-z0-9]{24}$/)
        }
    })
})

describe('buildInitialBLSPanelState', () => {
    it('returns a fresh state that matches DEFAULT_BLS_LIVE', () => {
        const initial = buildInitialBLSPanelState()
        expect(initial.live).toEqual(DEFAULT_BLS_LIVE)
    })

    it('config carries org defaults from localStorage when present', () => {
        localStorage.setItem('bls_defaults', JSON.stringify({
            speed: 8.5,
            sound: 'soft_bell',
            color: 'green',
            background: 'pink',
            autostop_mode: 'passes',
            autostop_passes: 24,
            autostop_seconds: 60,
            show_headphones_reminder: false,
        }))

        const initial = buildInitialBLSPanelState()
        expect(initial.config.speed).toBe(8.5)
        expect(initial.config.sound).toBe('soft_bell')
        expect(initial.config.color).toBe('green')
        expect(initial.config.background).toBe('pink')
        expect(initial.config.autostopMode).toBe('passes')
        expect(initial.config.autostopPasses).toBe(24)

        localStorage.removeItem('bls_defaults')
    })
})
