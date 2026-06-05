import { describe, it, expect } from 'vitest'
import { normalizeHex, isValidHex, hexToHsl, hslToHex, clamp } from './blsColor'

describe('normalizeHex', () => {
    it('returns null for non-strings', () => {
        expect(normalizeHex(123 as unknown as string)).toBeNull()
        expect(normalizeHex(undefined as unknown as string)).toBeNull()
    })

    it('normalizes 3-digit hex to 6-digit uppercase', () => {
        expect(normalizeHex('#abc')).toBe('#AABBCC')
        expect(normalizeHex('fff')).toBe('#FFFFFF')
        expect(normalizeHex('  #f0a  ')).toBe('#FF00AA')
    })

    it('normalizes 6-digit hex to uppercase', () => {
        expect(normalizeHex('#aabbcc')).toBe('#AABBCC')
        expect(normalizeHex('123abc')).toBe('#123ABC')
    })

    it('returns null for malformed input', () => {
        expect(normalizeHex('not a color')).toBeNull()
        expect(normalizeHex('#1234')).toBeNull()
        expect(normalizeHex('#gggggg')).toBeNull()
        expect(normalizeHex('rgb(1,2,3)')).toBeNull()
    })
})

describe('isValidHex', () => {
    it('agrees with normalizeHex about validity', () => {
        expect(isValidHex('#abc')).toBe(true)
        expect(isValidHex('#AABBCC')).toBe(true)
        expect(isValidHex('not')).toBe(false)
    })
})

describe('hexToHsl / hslToHex round-trip', () => {
    it('white → hsl(0,0,100)', () => {
        expect(hexToHsl('#FFFFFF')).toEqual({ h: 0, s: 0, l: 100 })
    })

    it('black → hsl(0,0,0)', () => {
        expect(hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 })
    })

    it('pure red → hsl(0,100,50)', () => {
        expect(hexToHsl('#FF0000')).toEqual({ h: 0, s: 100, l: 50 })
    })

    it('pure green → hsl(120,100,50)', () => {
        expect(hexToHsl('#00FF00')).toEqual({ h: 120, s: 100, l: 50 })
    })

    it('pure blue → hsl(240,100,50)', () => {
        expect(hexToHsl('#0000FF')).toEqual({ h: 240, s: 100, l: 50 })
    })

    it('hslToHex inverts hexToHsl for common colors', () => {
        const inputs = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000', '#808080']
        for (const hex of inputs) {
            const hsl = hexToHsl(hex)
            const back = hslToHex(hsl)
            // Allow ±1 per channel rounding tolerance
            const a = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
            const b = [parseInt(back.slice(1, 3), 16), parseInt(back.slice(3, 5), 16), parseInt(back.slice(5, 7), 16)]
            expect(Math.abs(a[0] - b[0])).toBeLessThanOrEqual(1)
            expect(Math.abs(a[1] - b[1])).toBeLessThanOrEqual(1)
            expect(Math.abs(a[2] - b[2])).toBeLessThanOrEqual(1)
        }
    })

    it('hslToHex clamps out-of-range values', () => {
        // s > 100 or l < 0 should still produce a valid hex
        expect(hslToHex({ h: 0, s: 150, l: 50 })).toMatch(/^#[0-9A-F]{6}$/)
        expect(hslToHex({ h: 0, s: -20, l: 50 })).toMatch(/^#[0-9A-F]{6}$/)
        expect(hslToHex({ h: 400, s: 50, l: 50 })).toMatch(/^#[0-9A-F]{6}$/)
    })

    it('hexToHsl falls back to black for invalid input', () => {
        expect(hexToHsl('garbage')).toEqual({ h: 0, s: 0, l: 0 })
    })
})

describe('clamp', () => {
    it('returns the value unchanged when in range', () => {
        expect(clamp(5, 0, 10)).toBe(5)
    })

    it('clips to min/max', () => {
        expect(clamp(-1, 0, 10)).toBe(0)
        expect(clamp(11, 0, 10)).toBe(10)
    })
})
