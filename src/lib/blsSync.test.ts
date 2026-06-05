import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BLSSyncTransport } from './blsSync'
import type { BLSSyncMessage, BLSStateMessage } from './blsSync'
import { DEFAULT_BLS_CONFIG } from './blsConstants'

/**
 * BroadcastChannel in jsdom is real per-instance but does NOT cross-deliver
 * between sibling instances on the same channel name. So we simulate the
 * cross-tab path with a minimal mock that records postMessage calls and
 * exposes a helper to fire incoming messages at listeners.
 *
 * This is sufficient to test the transport's API surface — publish, subscribe,
 * close, message filtering, and round-trip without relying on the host
 * environment's exact BroadcastChannel semantics.
 */
class MockBroadcastChannel {
    name: string
    private listeners: ((e: MessageEvent) => void)[] = []
    posted: unknown[] = []
    closed = false

    constructor(name: string) {
        this.name = name
        MockBroadcastChannel.instances.push(this)
    }

    addEventListener(type: string, fn: (e: MessageEvent) => void) {
        if (type === 'message') this.listeners.push(fn)
    }

    removeEventListener(type: string, fn: (e: MessageEvent) => void) {
        if (type === 'message') {
            this.listeners = this.listeners.filter(l => l !== fn)
        }
    }

    postMessage(data: unknown) {
        this.posted.push(data)
    }

    close() {
        this.closed = true
        this.listeners = []
    }

    // Test helper: simulate an incoming message from another tab.
    fire(data: unknown) {
        const evt = { data } as MessageEvent
        this.listeners.forEach(fn => fn(evt))
    }

    static instances: MockBroadcastChannel[] = []
    static reset() { MockBroadcastChannel.instances = [] }
}

beforeEach(() => {
    MockBroadcastChannel.reset()
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
})

describe('BLSSyncTransport — construction', () => {
    it('opens a BroadcastChannel named bls_session_<sessionId>', () => {
        new BLSSyncTransport('abc123', 'therapist')
        expect(MockBroadcastChannel.instances.length).toBe(1)
        expect(MockBroadcastChannel.instances[0].name).toBe('bls_session_abc123')
    })

    it('reports isAvailable=true when BroadcastChannel exists', () => {
        const t = new BLSSyncTransport('s1', 'client')
        expect(t.isAvailable).toBe(true)
    })

    it('falls back to no-op when BroadcastChannel is undefined', () => {
        vi.stubGlobal('BroadcastChannel', undefined)
        const t = new BLSSyncTransport('s2', 'client')
        expect(t.isAvailable).toBe(false)
        // publish doesn't throw in fallback mode
        expect(() => t.publish({ type: 'CLIENT_HELLO' })).not.toThrow()
    })
})

describe('BLSSyncTransport — publish / subscribe', () => {
    it('publish() calls postMessage on the underlying channel', () => {
        const t = new BLSSyncTransport('s3', 'therapist')
        const channel = MockBroadcastChannel.instances[0]

        const msg: BLSSyncMessage = { type: 'CLIENT_HELLO' }
        t.publish(msg)

        expect(channel.posted).toEqual([msg])
    })

    it('onMessage receives messages fired on the channel', () => {
        const t = new BLSSyncTransport('s4', 'therapist')
        const channel = MockBroadcastChannel.instances[0]

        const received: BLSSyncMessage[] = []
        t.onMessage(m => received.push(m))

        const stateMsg: BLSStateMessage = {
            type: 'STATE',
            config: DEFAULT_BLS_CONFIG,
            runState: 'running',
            startedAt: 1717000000000,
        }
        channel.fire(stateMsg)

        expect(received).toEqual([stateMsg])
    })

    it('onMessage returns an unsubscribe function', () => {
        const t = new BLSSyncTransport('s5', 'therapist')
        const channel = MockBroadcastChannel.instances[0]
        const received: BLSSyncMessage[] = []

        const unsubscribe = t.onMessage(m => received.push(m))
        unsubscribe()

        channel.fire({ type: 'CLIENT_HELLO' })
        expect(received).toEqual([])
    })

    it('ignores malformed (non-message-object) payloads silently', () => {
        const t = new BLSSyncTransport('s6', 'therapist')
        const channel = MockBroadcastChannel.instances[0]
        const received: BLSSyncMessage[] = []
        t.onMessage(m => received.push(m))

        channel.fire(null)
        channel.fire('string payload')
        channel.fire({ no_type_field: true })

        expect(received).toEqual([])
    })

    it('echoes own PING role back into self get filtered out', () => {
        const t = new BLSSyncTransport('s7', 'therapist')
        const channel = MockBroadcastChannel.instances[0]
        const received: BLSSyncMessage[] = []
        t.onMessage(m => received.push(m))

        // Echo of own PING — should be filtered
        channel.fire({ type: 'PING', from: 'therapist', t: 1 })
        // PING from the other side — should pass through
        channel.fire({ type: 'PING', from: 'client', t: 2 })

        expect(received).toEqual([{ type: 'PING', from: 'client', t: 2 }])
    })

    it('listener exceptions do not break the bus', () => {
        const t = new BLSSyncTransport('s8', 'therapist')
        const channel = MockBroadcastChannel.instances[0]

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const received2: BLSSyncMessage[] = []
        t.onMessage(() => { throw new Error('boom') })
        t.onMessage(m => received2.push(m))

        channel.fire({ type: 'CLIENT_HELLO' })

        // The second listener still got the message even though the first threw
        expect(received2).toEqual([{ type: 'CLIENT_HELLO' }])
        expect(consoleSpy).toHaveBeenCalled()

        consoleSpy.mockRestore()
    })
})

describe('BLSSyncTransport — close', () => {
    it('closes the channel and stops delivering messages', () => {
        const t = new BLSSyncTransport('s9', 'therapist')
        const channel = MockBroadcastChannel.instances[0]
        const received: BLSSyncMessage[] = []
        t.onMessage(m => received.push(m))

        t.close()

        expect(channel.closed).toBe(true)

        // Further publishes are no-ops (channel is gone) — should not throw
        expect(() => t.publish({ type: 'CLIENT_BYE' })).not.toThrow()
        // No new messages delivered after close
        expect(received).toEqual([])
    })

    it('close() is idempotent', () => {
        const t = new BLSSyncTransport('s10', 'client')
        t.close()
        expect(() => t.close()).not.toThrow()
    })
})

describe('BLSSyncTransport — heartbeat', () => {
    it('startHeartbeat publishes PINGs at the configured interval', () => {
        vi.useFakeTimers()
        const t = new BLSSyncTransport('s11', 'therapist')
        const channel = MockBroadcastChannel.instances[0]

        t.startHeartbeat(1000)

        vi.advanceTimersByTime(3500)
        const pings = channel.posted.filter((m): m is { type: 'PING' } =>
            typeof m === 'object' && m !== null && (m as { type: string }).type === 'PING'
        )
        expect(pings.length).toBe(3)

        t.stopHeartbeat()
        vi.useRealTimers()
    })

    it('stopHeartbeat stops further PINGs', () => {
        vi.useFakeTimers()
        const t = new BLSSyncTransport('s12', 'therapist')
        const channel = MockBroadcastChannel.instances[0]

        t.startHeartbeat(500)
        vi.advanceTimersByTime(1100)
        const countBefore = channel.posted.length
        t.stopHeartbeat()
        vi.advanceTimersByTime(2000)
        const countAfter = channel.posted.length

        expect(countAfter).toBe(countBefore)
        vi.useRealTimers()
    })
})
