import { describe, it, expect } from 'vitest'
import { parseLocalDate, formatDateSafe, calculateAge } from './dates'

describe('parseLocalDate', () => {
    it('parses YYYY-MM-DD as local timezone (no off-by-one)', () => {
        const d = parseLocalDate('1988-05-05')
        expect(d.getFullYear()).toBe(1988)
        expect(d.getMonth()).toBe(4) // 0-indexed: May = 4
        expect(d.getDate()).toBe(5)
    })

    it('parses 2024-11-09 correctly (client-reported bug)', () => {
        const d = parseLocalDate('2024-11-09')
        expect(d.getDate()).toBe(9)
        expect(d.getMonth()).toBe(10) // November = 10
    })

    it('parses 1966-03-15 correctly (old year — client-reported issue)', () => {
        const d = parseLocalDate('1966-03-15')
        expect(d.getFullYear()).toBe(1966)
        expect(d.getMonth()).toBe(2)
        expect(d.getDate()).toBe(15)
    })

    it('passes through full ISO datetime strings unchanged', () => {
        const d = parseLocalDate('2024-11-09T14:30:00Z')
        expect(d.getFullYear()).toBe(2024)
        // We don't assert exact date here because UTC conversion depends on local TZ
    })

    it('returns invalid Date for empty string', () => {
        const d = parseLocalDate('')
        expect(isNaN(d.getTime())).toBe(true)
    })
})

describe('formatDateSafe', () => {
    it('formats YYYY-MM-DD without off-by-one', () => {
        const result = formatDateSafe('1988-05-05')
        expect(result).toContain('May')
        expect(result).toContain('5')
        expect(result).toContain('1988')
    })

    it('formats 2024-11-09 as Nov 9 (not Nov 8)', () => {
        const result = formatDateSafe('2024-11-09')
        expect(result).toContain('Nov')
        expect(result).toContain('9')
        // Must NOT contain "8" as the day
        expect(result).not.toMatch(/Nov\s+8/)
    })

    it('returns em-dash for null', () => {
        expect(formatDateSafe(null)).toBe('—')
    })

    it('returns em-dash for undefined', () => {
        expect(formatDateSafe(undefined)).toBe('—')
    })

    it('returns em-dash for empty string', () => {
        expect(formatDateSafe('')).toBe('—')
    })

    it('returns original string for invalid date', () => {
        expect(formatDateSafe('not-a-date')).toBe('not-a-date')
    })

    it('respects custom format options', () => {
        const result = formatDateSafe('1988-05-05', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        })
        expect(result).toContain('05')
        expect(result).toContain('1988')
    })
})

describe('calculateAge', () => {
    it('calculates age correctly for a known DOB', () => {
        // Use a date far in the past so the test is stable
        const age = calculateAge('2000-01-01')
        const expectedAge = new Date().getFullYear() - 2000 -
            (new Date().getMonth() < 0 || (new Date().getMonth() === 0 && new Date().getDate() < 1) ? 1 : 0)
        expect(age).toBe(expectedAge)
    })

    it('calculates age correctly for 1966-03-15', () => {
        const age = calculateAge('1966-03-15')
        const today = new Date()
        let expected = today.getFullYear() - 1966
        const m = today.getMonth() - 2 // March = month 2
        if (m < 0 || (m === 0 && today.getDate() < 15)) expected--
        expect(age).toBe(expected)
    })

    it('does NOT produce off-by-one age (the bug)', () => {
        // Person born Dec 31 — the old bug with UTC could make them
        // appear to be born Jan 1 of next year, making them 1 year younger
        const age = calculateAge('1990-12-31')
        const today = new Date()
        let expected = today.getFullYear() - 1990
        const m = today.getMonth() - 11 // December = month 11
        if (m < 0 || (m === 0 && today.getDate() < 31)) expected--
        expect(age).toBe(expected)
    })
})
