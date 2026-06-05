/**
 * REST API client for the Bilateral Stimulation (BLS) module.
 *
 * Endpoints (mounted at /api/v1/bls/ on the backend):
 *   POST   /sessions/                       — create session, returns token + URL
 *   GET    /sessions/verify/?token=         — public, validates a token
 *   POST   /sessions/{id}/end/              — end session + persist counters
 *   GET    /clients/{client_id}/history/    — past BLS sessions for a client
 *   GET    /preferences/{client_id}/        — get per-client preferences
 *   PUT    /preferences/{client_id}/        — save per-client preferences
 *   GET    /defaults/                       — get org-wide BLS defaults
 *   PUT    /defaults/                       — save org-wide BLS defaults
 *
 * The verify endpoint is the only public one — uses a plain axios instance
 * without the auth interceptor so the client view can call it before the
 * patient ever sees the page.
 */
import axios from 'axios'
import apiClient from './client'

const API_BASE_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
    || 'http://localhost:8000/api/v1'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BLSCreateSessionResponse {
    session_id: string
    token: string
    short_code?: string | null
    invite_url: string
    expires_in_seconds: number
}

export interface BLSVerifyTokenResponse {
    valid: boolean
    session_id?: string
    status?: 'created' | 'waiting_for_client' | 'active' | 'paused' | 'ended' | 'abandoned'
}

export interface BLSResolveShortCodeResponse {
    session_id: string
    token: string
    status: 'created' | 'waiting_for_client' | 'active' | 'paused' | 'ended' | 'abandoned'
    expires_in_seconds: number
}

export interface BLSEndSessionPayload {
    duration_seconds: number
    pass_count: number
    set_count: number
    settings_snapshot?: Record<string, unknown>
    modality?: 'visual_only' | 'audio_only' | 'both'
}

export interface BLSHistoryRecordApi {
    id: string
    client_id: string
    appointment_id: string | null
    therapist_id: string
    status: string
    started_at: string | null
    ended_at: string | null
    pass_count: number
    set_count: number
    duration_seconds: number
    modality: string
    settings_snapshot: Record<string, unknown>
    created_at: string
    updated_at: string
}

export interface BLSPreferenceResponse {
    client_id: string
    config: Record<string, unknown>
    last_used_at: string | null
}

export interface BLSDefaultsResponse {
    config: Record<string, unknown>
}

// ─── Public axios instance for the verify endpoint ─────────────────────────
//
// The client view calls /verify/ before the patient has any session at all,
// so we deliberately do NOT carry the auth interceptor (which would attach a
// bearer that doesn't exist and may trip the backend's 401 fallback). The
// regular `apiClient` is used everywhere else.
const publicClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
})

// ─── API surface ────────────────────────────────────────────────────────────

export const blsApi = {
    /**
     * Create a new BLS session. Returns the session id, signed token, and the
     * client invite URL. Throws if the client is unknown to this org or the
     * caller isn't authenticated as clinical staff.
     */
    createSession: async (
        clientId: string,
        appointmentId?: string | null,
    ): Promise<BLSCreateSessionResponse> => {
        const body: Record<string, string> = { client_id: clientId }
        if (appointmentId) body.appointment_id = appointmentId
        const { data } = await apiClient.post<BLSCreateSessionResponse>('/bls/sessions/', body)
        return data
    },

    /**
     * Verify an invite token. Public — no auth required. The client view calls
     * this on mount to know whether to render the waiting screen or the
     * invalid-token message.
     */
    verifyToken: async (token: string): Promise<BLSVerifyTokenResponse> => {
        try {
            const { data } = await publicClient.get<BLSVerifyTokenResponse>(
                '/bls/sessions/verify/',
                { params: { token } },
            )
            return data
        } catch {
            // The endpoint always returns 200 with { valid: false } on bad
            // tokens — if we land in the catch, something else went wrong
            // (network, CORS). Treat as invalid so the UX is consistent.
            return { valid: false }
        }
    },

    /**
     * Resolve a 6-char short code to the full signed token. The client view
     * calls this when the URL looks like /bls/c/AB7K9Q instead of
     * /bls/c/<long-token>. Returns null on any non-2xx, including the
     * intentional 404 the backend returns for unknown/expired codes — the
     * UX is the same: show the "link not active" screen.
     */
    resolveShortCode: async (code: string): Promise<BLSResolveShortCodeResponse | null> => {
        try {
            const { data } = await publicClient.get<BLSResolveShortCodeResponse>(
                '/bls/sessions/resolve/',
                { params: { code } },
            )
            return data
        } catch {
            return null
        }
    },

    /**
     * End a session — persists counters + settings snapshot, transitions
     * status to ended. Also writes per-client preferences (so the next
     * session for this client loads the same settings).
     */
    endSession: async (
        sessionId: string,
        payload: BLSEndSessionPayload,
    ): Promise<BLSHistoryRecordApi> => {
        const { data } = await apiClient.post<BLSHistoryRecordApi>(
            `/bls/sessions/${sessionId}/end/`,
            payload,
        )
        return data
    },

    /** List past BLS sessions for a client (used by the BLS tab on the chart). */
    getHistory: async (clientId: string): Promise<BLSHistoryRecordApi[]> => {
        const { data } = await apiClient.get<BLSHistoryRecordApi[]>(
            `/bls/clients/${clientId}/history/`,
        )
        return data
    },

    /** Read per-client BLS preferences. Lazily creates an empty row if missing. */
    getPreferences: async (clientId: string): Promise<BLSPreferenceResponse> => {
        const { data } = await apiClient.get<BLSPreferenceResponse>(
            `/bls/preferences/${clientId}/`,
        )
        return data
    },

    /** Save per-client BLS preferences. */
    updatePreferences: async (
        clientId: string,
        config: Record<string, unknown>,
    ): Promise<BLSPreferenceResponse> => {
        const { data } = await apiClient.put<BLSPreferenceResponse>(
            `/bls/preferences/${clientId}/`,
            { config },
        )
        return data
    },

    /** Read org-wide BLS defaults. */
    getDefaults: async (): Promise<BLSDefaultsResponse> => {
        const { data } = await apiClient.get<BLSDefaultsResponse>('/bls/defaults/')
        return data
    },

    /** Save org-wide BLS defaults. */
    updateDefaults: async (config: Record<string, unknown>): Promise<BLSDefaultsResponse> => {
        const { data } = await apiClient.put<BLSDefaultsResponse>(
            '/bls/defaults/',
            { config },
        )
        return data
    },
}

/**
 * Build the WebSocket URL for the therapist consumer. Derives from the same
 * base as the REST client — if API runs on https://api.example.com, the WS
 * URL is wss://api.example.com/ws/bls/...
 */
export function buildTherapistWebSocketUrl(sessionId: string, accessToken: string): string {
    const wsBase = restToWsBase(API_BASE_URL)
    // Token is passed as a query param; the AuthMiddlewareStack on the
    // backend reads it from scope['query_string'] via a small token-auth
    // middleware that we'll wire when JWT auth on Channels is added. For
    // now scope['user'] is populated via the session cookie that travels
    // automatically on same-origin WS upgrades.
    const sep = accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''
    return `${wsBase}/ws/bls/therapist/${sessionId}/${sep}`
}

/**
 * Build the WebSocket URL for the client consumer. The token is in the path
 * (matches the routing pattern in apps/bls/routing.py).
 */
export function buildClientWebSocketUrl(token: string): string {
    const wsBase = restToWsBase(API_BASE_URL)
    return `${wsBase}/ws/bls/client/${encodeURIComponent(token)}/`
}

/** Convert https?://host/api/v1 → wss?://host */
function restToWsBase(restUrl: string): string {
    const stripped = restUrl.replace(/\/api\/v\d+\/?$/, '')
    return stripped.replace(/^http(s?):/, 'ws$1:')
}
