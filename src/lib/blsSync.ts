/**
 * BLS sync transport — demo mode (BroadcastChannel).
 *
 * Design intent: the message schema below mirrors the WebSocket protocol from
 * BLS-SYSTEM-DESIGN.md §5. When the backend lands, the transport class swaps
 * BroadcastChannel for a WebSocket — the message shape and the consuming code
 * (therapist panel, client view) stay the same.
 *
 * Why BroadcastChannel for the demo:
 *  - Works between two tabs of the same origin with zero backend
 *  - Lets us validate the dual-screen UX before we commit to a sync protocol
 *  - Fails safely (browsers without support just don't sync — both pages still
 *    render correctly in isolation)
 *
 * Production differences once WebSocket is wired:
 *  - Connection lifecycle adds: connect, auth via token, reconnect-with-replay
 *  - Messages get sequence numbers + server-stamped timestamps
 *  - Therapist surface is authenticated; client surface is token-gated
 *  - State authority moves to the server (counters, started_at)
 *
 * Keeping this file pure (no React) so it's testable and so the client view —
 * which deliberately avoids pulling in heavy modules — stays lean.
 */
import type { BLSConfig, BLSRunState } from '../types/bls'

// ─── Message schema ─────────────────────────────────────────────────────────

/**
 * Therapist → client: full config + run state snapshot. Sent on every config
 * change AND on every run state change, so the client never has to reconstruct
 * state from a stream of deltas (matches the design doc's "STATE is full" rule
 * — bandwidth is cheap, correctness is everything).
 */
export interface BLSStateMessage {
    type: 'STATE'
    config: BLSConfig
    runState: BLSRunState
    /** Unix epoch ms when the current run started; null if not running. The
     *  client uses this to compute its own pass-phase locally without needing
     *  per-frame sync (see design doc §5 "bandwidth budget"). */
    startedAt: number | null
}

/** Client → therapist: I just joined, please send current state. */
export interface BLSClientHelloMessage {
    type: 'CLIENT_HELLO'
}

/** Client → therapist: I am leaving (tab closed, navigated away). */
export interface BLSClientByeMessage {
    type: 'CLIENT_BYE'
}

/** Client → therapist: audio playback failed on my end. */
export interface BLSClientAudioFailedMessage {
    type: 'CLIENT_AUDIO_FAILED'
    reason: string
}

/** Client → therapist: my tab is hidden / visible (visibilitychange). */
export interface BLSClientVisibilityMessage {
    type: 'CLIENT_VISIBILITY'
    visible: boolean
}

/** Heartbeat (both directions). */
export interface BLSPingMessage {
    type: 'PING'
    from: 'therapist' | 'client'
    t: number
}

/** Server → therapist: client just opened the invite URL.
 *  Emitted by the backend BLSClientConsumer on connect. The BroadcastChannel
 *  demo path uses CLIENT_HELLO instead — we accept both. */
export interface BLSServerClientConnectedMessage {
    type: 'CLIENT_CONNECTED'
}

/** Server → both sides: client tab disconnected (closed or transport closed). */
export interface BLSServerClientDisconnectedMessage {
    type: 'CLIENT_DISCONNECTED'
    reason?: string
}

/** Server → both sides: session ended (therapist hit END or server timed out). */
export interface BLSServerSessionEndMessage {
    type: 'SESSION_END'
    reason?: string
}

/** Server → both sides: session was killed (admin intervention, breach, etc.). */
export interface BLSServerKillMessage {
    type: 'KILL'
    reason?: string
}

export type BLSSyncMessage =
    | BLSStateMessage
    | BLSClientHelloMessage
    | BLSClientByeMessage
    | BLSClientAudioFailedMessage
    | BLSClientVisibilityMessage
    | BLSPingMessage
    | BLSServerClientConnectedMessage
    | BLSServerClientDisconnectedMessage
    | BLSServerSessionEndMessage
    | BLSServerKillMessage

// ─── Transport ──────────────────────────────────────────────────────────────

export type BLSSyncRole = 'therapist' | 'client'

/**
 * Thin wrapper over BroadcastChannel with a typed message API. Falls back to a
 * no-op transport when BroadcastChannel is unavailable (older Safari, some
 * privacy modes). Both pages still render correctly without sync — the
 * therapist panel just shows "no client connected" forever in that case.
 */
export class BLSSyncTransport {
    private channel: BroadcastChannel | null
    private listeners = new Set<(msg: BLSSyncMessage) => void>()
    private heartbeatId: number | null = null
    public readonly role: BLSSyncRole
    public readonly sessionId: string

    constructor(sessionId: string, role: BLSSyncRole) {
        this.sessionId = sessionId
        this.role = role

        if (typeof BroadcastChannel === 'undefined') {
            this.channel = null
            return
        }

        const channelName = `bls_session_${sessionId}`
        this.channel = new BroadcastChannel(channelName)
        this.channel.addEventListener('message', this.handleMessage)
    }

    private handleMessage = (e: MessageEvent) => {
        const msg = e.data as BLSSyncMessage
        if (!msg || typeof msg !== 'object' || !('type' in msg)) return
        // Loop guard — BroadcastChannel doesn't echo to the sender, but be
        // defensive in case the transport gets swapped for one that does.
        if (msg.type === 'PING' && msg.from === this.role) return
        for (const listener of this.listeners) {
            try {
                listener(msg)
            } catch (err) {
                // Listener exceptions must not break the message bus
                console.error('[BLS sync] listener error', err)
            }
        }
    }

    publish(msg: BLSSyncMessage): void {
        if (!this.channel) return
        try {
            this.channel.postMessage(msg)
        } catch (err) {
            // Some browsers throw on postMessage with structured-clone-incompatible
            // payloads. Our messages are plain JSON-compatible, so this should
            // never fire — but log it loudly if it does so the cause is obvious.
            console.error('[BLS sync] postMessage failed', err)
        }
    }

    onMessage(listener: (msg: BLSSyncMessage) => void): () => void {
        this.listeners.add(listener)
        return () => { this.listeners.delete(listener) }
    }

    startHeartbeat(intervalMs: number = 5000): void {
        if (this.heartbeatId !== null) return
        this.heartbeatId = window.setInterval(() => {
            this.publish({ type: 'PING', from: this.role, t: Date.now() })
        }, intervalMs)
    }

    stopHeartbeat(): void {
        if (this.heartbeatId !== null) {
            clearInterval(this.heartbeatId)
            this.heartbeatId = null
        }
    }

    close(): void {
        this.stopHeartbeat()
        this.listeners.clear()
        if (this.channel) {
            this.channel.removeEventListener('message', this.handleMessage)
            this.channel.close()
            this.channel = null
        }
    }

    /** True if the underlying transport is usable; false if we silently fell
     *  back to no-op mode. Pages can use this to surface a "syncing requires
     *  a modern browser" notice. */
    get isAvailable(): boolean {
        return this.channel !== null
    }
}

// ─── WebSocket transport (Phase 1 — real backend) ───────────────────────────

/**
 * Production transport — connects to the Django Channels backend over a real
 * WebSocket. Same public API as BLSSyncTransport so calling code doesn't need
 * to branch on transport mode.
 *
 * Features:
 *  - Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s, capped at 16s)
 *  - Heartbeat (forwards to the same PING shape the BroadcastChannel uses,
 *    so the server's optional ping handler can echo it back)
 *  - Loop guard on PING — own pings don't fire local listeners on echo
 *  - Silent drop on publish() before the socket opens (caller doesn't have
 *    to await a connect promise; the next state change re-publishes anyway)
 */
export class BLSWebSocketTransport {
    private ws: WebSocket | null = null
    private listeners = new Set<(msg: BLSSyncMessage) => void>()
    private heartbeatId: number | null = null
    private reconnectAttempts = 0
    private reconnectTimer: number | null = null
    private explicitlyClosed = false
    public readonly role: BLSSyncRole
    public readonly sessionId: string
    public readonly url: string

    constructor(url: string, sessionId: string, role: BLSSyncRole) {
        this.url = url
        this.sessionId = sessionId
        this.role = role
        this.connect()
    }

    private connect = () => {
        if (this.explicitlyClosed) return
        try {
            this.ws = new WebSocket(this.url)
            this.ws.addEventListener('open', this.handleOpen)
            this.ws.addEventListener('message', this.handleMessage)
            this.ws.addEventListener('close', this.handleClose)
            this.ws.addEventListener('error', this.handleError)
        } catch (err) {
            console.error('[BLS WS] connect failed', err)
            this.scheduleReconnect()
        }
    }

    private handleOpen = () => {
        this.reconnectAttempts = 0
    }

    private handleMessage = (e: MessageEvent) => {
        let msg: BLSSyncMessage
        try {
            msg = JSON.parse(e.data) as BLSSyncMessage
        } catch (err) {
            console.error('[BLS WS] malformed message', err)
            return
        }
        if (!msg || typeof msg !== 'object' || !('type' in msg)) return
        // Echo guard — same role's PING bouncing back shouldn't fire listeners.
        if (msg.type === 'PING' && msg.from === this.role) return
        for (const listener of this.listeners) {
            try {
                listener(msg)
            } catch (err) {
                console.error('[BLS WS] listener error', err)
            }
        }
    }

    private handleClose = () => {
        this.ws = null
        if (!this.explicitlyClosed) {
            this.scheduleReconnect()
        }
    }

    private handleError = (e: Event) => {
        // The browser will fire `close` right after `error`; reconnect happens
        // in the close handler. We just log for visibility.
        console.warn('[BLS WS] error event', e.type)
    }

    private scheduleReconnect() {
        if (this.reconnectTimer !== null) return
        // 1s, 2s, 4s, 8s, then capped at 16s. Server-side hard timeout on a
        // BLS session is 90 minutes (per design doc §7 F12) so we never need
        // to back off beyond a minute or two.
        const delay = Math.min(16000, 1000 * Math.pow(2, this.reconnectAttempts))
        this.reconnectAttempts += 1
        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null
            this.connect()
        }, delay)
    }

    publish(msg: BLSSyncMessage): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            // The socket isn't open yet (still connecting or in backoff). Drop
            // the message — the next state change will re-publish. State sync
            // is idempotent so this is safe.
            return
        }
        try {
            this.ws.send(JSON.stringify(msg))
        } catch (err) {
            console.error('[BLS WS] send failed', err)
        }
    }

    onMessage(listener: (msg: BLSSyncMessage) => void): () => void {
        this.listeners.add(listener)
        return () => { this.listeners.delete(listener) }
    }

    startHeartbeat(intervalMs: number = 5000): void {
        if (this.heartbeatId !== null) return
        this.heartbeatId = window.setInterval(() => {
            this.publish({ type: 'PING', from: this.role, t: Date.now() })
        }, intervalMs)
    }

    stopHeartbeat(): void {
        if (this.heartbeatId !== null) {
            clearInterval(this.heartbeatId)
            this.heartbeatId = null
        }
    }

    close(): void {
        this.explicitlyClosed = true
        this.stopHeartbeat()
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
        this.listeners.clear()
        if (this.ws) {
            this.ws.removeEventListener('open', this.handleOpen)
            this.ws.removeEventListener('message', this.handleMessage)
            this.ws.removeEventListener('close', this.handleClose)
            this.ws.removeEventListener('error', this.handleError)
            try { this.ws.close() } catch { /* ignore */ }
            this.ws = null
        }
    }

    get isAvailable(): boolean {
        return typeof WebSocket !== 'undefined'
    }
}

// ─── Polymorphic type + factory ─────────────────────────────────────────────

/**
 * Either transport is callable with the same shape — code that holds a
 * reference type-checks against this union so we can swap implementations
 * without touching call sites.
 */
export type BLSSyncTransportAPI = BLSSyncTransport | BLSWebSocketTransport

export interface BLSSyncTransportOpts {
    /** Forced transport selection. `auto` picks WebSocket when wsUrl is provided. */
    mode?: 'broadcast' | 'websocket' | 'auto'
    sessionId: string
    role: BLSSyncRole
    /** Required for websocket / auto mode. Built via api/bls.ts helpers. */
    wsUrl?: string
}

/**
 * Pick the right transport. Decision rule:
 *  - mode='websocket'           → BLSWebSocketTransport (throws if no wsUrl)
 *  - mode='broadcast'           → BLSSyncTransport (BroadcastChannel)
 *  - mode='auto' (or omitted)   → WebSocket if wsUrl present, else BroadcastChannel
 *
 * The auto mode is what BLSControlPage uses — when the backend is reachable
 * the page hands a wsUrl and we get a real WebSocket; when running purely on
 * mock state the page omits wsUrl and we fall through to BroadcastChannel.
 */
export function createBLSSyncTransport(opts: BLSSyncTransportOpts): BLSSyncTransportAPI {
    const mode = opts.mode ?? 'auto'
    if (mode === 'websocket') {
        if (!opts.wsUrl) {
            throw new Error('createBLSSyncTransport: wsUrl required for websocket mode')
        }
        return new BLSWebSocketTransport(opts.wsUrl, opts.sessionId, opts.role)
    }
    if (mode === 'auto' && opts.wsUrl) {
        return new BLSWebSocketTransport(opts.wsUrl, opts.sessionId, opts.role)
    }
    return new BLSSyncTransport(opts.sessionId, opts.role)
}
