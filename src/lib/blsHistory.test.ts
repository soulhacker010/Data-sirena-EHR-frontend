import { describe, it, expect, beforeEach } from 'vitest'
import { getBLSHistory, recordBLSSession, clearBLSHistory } from './blsHistory'
import type { BLSHistoryRecord } from './blsHistory'

const CLIENT_A = 'client-aaa'
const CLIENT_B = 'client-bbb'

const baseRecord = (overrides: Partial<Omit<BLSHistoryRecord, 'id'>> = {}): Omit<BLSHistoryRecord, 'id'> => ({
    client_id: CLIENT_A,
    appointment_id: null,
    started_at: 1717000000000,
    ended_at: 1717000300000,
    duration_seconds: 300,
    pass_count: 60,
    set_count: 3,
    modality: 'both',
    settings_snapshot: {
        speed: 5.5,
        sound: 'finger_snap',
        color: 'blue',
        background: 'gray',
        stimulus: 'dot',
    },
    ...overrides,
})

beforeEach(() => {
    localStorage.clear()
})

describe('getBLSHistory', () => {
    it('returns [] when no history exists for the client', () => {
        expect(getBLSHistory(CLIENT_A)).toEqual([])
    })

    it('returns [] for empty clientId (defensive)', () => {
        expect(getBLSHistory('')).toEqual([])
    })

    it('returns [] when storage contains malformed JSON', () => {
        localStorage.setItem(`bls_history_${CLIENT_A}`, '{not valid json')
        expect(getBLSHistory(CLIENT_A)).toEqual([])
    })

    it('returns [] when storage contains a non-array', () => {
        localStorage.setItem(`bls_history_${CLIENT_A}`, '{"foo": "bar"}')
        expect(getBLSHistory(CLIENT_A)).toEqual([])
    })

    it('filters out records that fail validation', () => {
        // First record is well-formed, second is junk
        localStorage.setItem(`bls_history_${CLIENT_A}`, JSON.stringify([
            { ...baseRecord(), id: 'good-1' },
            { id: 'bad', client_id: 'x' },  // missing required fields
        ]))
        const result = getBLSHistory(CLIENT_A)
        expect(result.length).toBe(1)
        expect(result[0].id).toBe('good-1')
    })
})

describe('recordBLSSession', () => {
    it('returns null when client_id is missing', () => {
        const result = recordBLSSession(baseRecord({ client_id: '' }))
        expect(result).toBeNull()
    })

    it('round-trips a record to localStorage and back', () => {
        const written = recordBLSSession(baseRecord())
        expect(written).not.toBeNull()
        expect(written!.id).toBeTruthy()

        const read = getBLSHistory(CLIENT_A)
        expect(read.length).toBe(1)
        expect(read[0].id).toBe(written!.id)
        expect(read[0].duration_seconds).toBe(300)
        expect(read[0].pass_count).toBe(60)
        expect(read[0].modality).toBe('both')
        expect(read[0].settings_snapshot.color).toBe('blue')
    })

    it('returns records sorted newest-first by started_at', () => {
        recordBLSSession(baseRecord({ started_at: 1000 }))
        recordBLSSession(baseRecord({ started_at: 3000 }))
        recordBLSSession(baseRecord({ started_at: 2000 }))

        const result = getBLSHistory(CLIENT_A)
        expect(result.map(r => r.started_at)).toEqual([3000, 2000, 1000])
    })

    it('caps history at 50 records per client', () => {
        for (let i = 0; i < 55; i++) {
            recordBLSSession(baseRecord({ started_at: 1000 + i }))
        }
        const result = getBLSHistory(CLIENT_A)
        expect(result.length).toBe(50)
        // The 5 oldest were dropped (cap is FIFO via .slice(0, 50) after
        // prepending the newest — the most recent 50 should survive).
        expect(result[0].started_at).toBe(1054)
        expect(result[49].started_at).toBe(1005)
    })

    it('keeps separate history per client', () => {
        recordBLSSession(baseRecord({ client_id: CLIENT_A, started_at: 1000 }))
        recordBLSSession(baseRecord({ client_id: CLIENT_B, started_at: 2000 }))

        expect(getBLSHistory(CLIENT_A).length).toBe(1)
        expect(getBLSHistory(CLIENT_B).length).toBe(1)
        expect(getBLSHistory(CLIENT_A)[0].client_id).toBe(CLIENT_A)
        expect(getBLSHistory(CLIENT_B)[0].client_id).toBe(CLIENT_B)
    })

    it('preserves the full settings snapshot (including kids glyph)', () => {
        recordBLSSession(baseRecord({
            settings_snapshot: {
                speed: 7,
                sound: 'soft_bell',
                color: 'green',
                background: 'pink',
                stimulus: 'animal',
                stimulus_glyph: '🐶',
            },
        }))
        const result = getBLSHistory(CLIENT_A)[0]
        expect(result.settings_snapshot.stimulus).toBe('animal')
        expect(result.settings_snapshot.stimulus_glyph).toBe('🐶')
    })
})

describe('clearBLSHistory', () => {
    it('removes all records for the given client', () => {
        recordBLSSession(baseRecord({ client_id: CLIENT_A }))
        recordBLSSession(baseRecord({ client_id: CLIENT_B }))

        clearBLSHistory(CLIENT_A)

        expect(getBLSHistory(CLIENT_A)).toEqual([])
        // Other clients untouched
        expect(getBLSHistory(CLIENT_B).length).toBe(1)
    })
})
