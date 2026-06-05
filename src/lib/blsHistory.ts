/**
 * BLS session history — localStorage-backed for the mock.
 *
 * Stores completed BLS sessions per client so the BLS tab in the client chart
 * has data to render before the backend lands. The data shape mirrors what
 * the `bls_sessions` table will return (see BLS-SYSTEM-DESIGN.md §4), so
 * swapping these calls for real API calls in Phase 1 is a one-file change.
 *
 * Why localStorage (not sessionStorage / memory):
 *  - Persists across page reloads, so a clinician closing the BLS tab and
 *    reopening the client chart still sees the session in history
 *  - Per-origin (no cross-tab leakage by accident)
 *  - Bounded by the LS quota (we cap at 50 sessions per client just in case)
 *
 * What we DON'T store here:
 *  - PHI beyond what's strictly clinical metadata (no narrative content)
 *  - Tokens (they're one-time and dead after session end)
 *  - Therapist identity (added back when backend wires audit log)
 */
import type {
    BLSColorKey,
    BLSBackgroundKey,
    BLSSoundKey,
    BLSStimulusKey,
} from '../types/bls'

const STORAGE_KEY = (clientId: string) => `bls_history_${clientId}`
const MAX_SESSIONS_PER_CLIENT = 50

/**
 * One completed BLS session record. Field names use snake_case to match the
 * eventual JSON shape from `bls_sessions` so the future API swap is a no-op
 * for the consuming components.
 */
export interface BLSHistoryRecord {
    id: string
    client_id: string
    appointment_id: string | null
    started_at: number   // ms epoch
    ended_at: number     // ms epoch
    duration_seconds: number
    pass_count: number
    set_count: number
    modality: 'visual_only' | 'audio_only' | 'both'
    settings_snapshot: {
        speed: number
        sound: BLSSoundKey
        color: BLSColorKey
        background: BLSBackgroundKey
        stimulus: BLSStimulusKey
        stimulus_glyph?: string
    }
}

function safeParse(raw: string | null): BLSHistoryRecord[] {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter(isValidRecord)
    } catch {
        return []
    }
}

function isValidRecord(r: unknown): r is BLSHistoryRecord {
    if (!r || typeof r !== 'object') return false
    const o = r as Record<string, unknown>
    return typeof o.id === 'string'
        && typeof o.client_id === 'string'
        && typeof o.started_at === 'number'
        && typeof o.ended_at === 'number'
        && typeof o.duration_seconds === 'number'
        && typeof o.pass_count === 'number'
        && typeof o.set_count === 'number'
        && (o.modality === 'visual_only' || o.modality === 'audio_only' || o.modality === 'both')
        && typeof o.settings_snapshot === 'object' && o.settings_snapshot !== null
}

export function getBLSHistory(clientId: string): BLSHistoryRecord[] {
    if (!clientId) return []
    try {
        const raw = localStorage.getItem(STORAGE_KEY(clientId))
        return safeParse(raw).sort((a, b) => b.started_at - a.started_at)
    } catch {
        return []
    }
}

export function recordBLSSession(record: Omit<BLSHistoryRecord, 'id'>): BLSHistoryRecord | null {
    if (!record.client_id) return null

    const fullRecord: BLSHistoryRecord = {
        ...record,
        id: generateId(),
    }

    try {
        const existing = getBLSHistory(record.client_id)
        const updated = [fullRecord, ...existing].slice(0, MAX_SESSIONS_PER_CLIENT)
        localStorage.setItem(STORAGE_KEY(record.client_id), JSON.stringify(updated))
        return fullRecord
    } catch {
        // Storage quota or disabled (privacy mode) — silently degrade.
        // The session still completes; we just can't replay it later.
        return null
    }
}

export function clearBLSHistory(clientId: string): void {
    try {
        localStorage.removeItem(STORAGE_KEY(clientId))
    } catch { /* ignore */ }
}

function generateId(): string {
    // Synthesize an id resembling a UUID's visible shape. Real ids come from
    // the DB; the mock just needs uniqueness within a browser.
    const rnd = () => Math.random().toString(36).slice(2, 10)
    return `bls_${rnd()}${rnd()}`
}
