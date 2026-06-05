import { describe, it, expect, beforeEach } from 'vitest'
import {
    getBLSDefaults,
    saveBLSDefaults,
    resetBLSDefaults,
    FACTORY_DEFAULTS,
} from './blsDefaults'

beforeEach(() => {
    localStorage.clear()
})

describe('getBLSDefaults', () => {
    it('returns FACTORY_DEFAULTS when nothing is saved', () => {
        expect(getBLSDefaults()).toEqual(FACTORY_DEFAULTS)
    })

    it('returns FACTORY_DEFAULTS when storage contains malformed JSON', () => {
        localStorage.setItem('bls_defaults', '{not valid json')
        expect(getBLSDefaults()).toEqual(FACTORY_DEFAULTS)
    })

    it('returns FACTORY_DEFAULTS when storage contains a non-object', () => {
        localStorage.setItem('bls_defaults', '"a string"')
        expect(getBLSDefaults()).toEqual(FACTORY_DEFAULTS)
    })

    it('merges partial saved data with FACTORY_DEFAULTS', () => {
        // Save a partial set — speed only — and confirm the rest stays factory.
        // This guards against schema additions silently nullifying other fields.
        localStorage.setItem('bls_defaults', JSON.stringify({ speed: 8.5 }))

        const result = getBLSDefaults()
        expect(result.speed).toBe(8.5)
        expect(result.sound).toBe(FACTORY_DEFAULTS.sound)
        expect(result.color).toBe(FACTORY_DEFAULTS.color)
        expect(result.autostop_mode).toBe(FACTORY_DEFAULTS.autostop_mode)
        expect(result.show_headphones_reminder).toBe(FACTORY_DEFAULTS.show_headphones_reminder)
    })
})

describe('saveBLSDefaults', () => {
    it('round-trips defaults to storage', () => {
        const custom = {
            ...FACTORY_DEFAULTS,
            speed: 3.5,
            sound: 'beep' as const,
            color: 'red' as const,
            autostop_mode: 'seconds' as const,
            autostop_seconds: 90,
            show_headphones_reminder: false,
        }
        const ok = saveBLSDefaults(custom)
        expect(ok).toBe(true)

        const read = getBLSDefaults()
        expect(read).toEqual(custom)
    })

    it('overwrites existing saved defaults', () => {
        saveBLSDefaults({ ...FACTORY_DEFAULTS, speed: 1 })
        saveBLSDefaults({ ...FACTORY_DEFAULTS, speed: 9 })
        expect(getBLSDefaults().speed).toBe(9)
    })
})

describe('resetBLSDefaults', () => {
    it('removes the saved defaults so getBLSDefaults returns factory again', () => {
        saveBLSDefaults({ ...FACTORY_DEFAULTS, speed: 9 })
        expect(getBLSDefaults().speed).toBe(9)

        resetBLSDefaults()

        expect(getBLSDefaults()).toEqual(FACTORY_DEFAULTS)
    })
})
