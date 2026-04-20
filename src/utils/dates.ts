/**
 * Date utilities that handle timezone-safe parsing of date-only strings.
 *
 * Problem: `new Date("1988-05-05")` is parsed as UTC midnight.
 * In US timezones (UTC-5 to UTC-8) this renders as May 4 — one day off.
 *
 * Solution: Append `T00:00:00` to force local-timezone interpretation,
 * or split the ISO string and build from parts.
 */

/**
 * Parse a date-only ISO string (YYYY-MM-DD) into a local-timezone Date.
 * For full ISO datetime strings (with "T"), falls through to normal parsing.
 */
export function parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date(NaN)
    // If it's a date-only string (YYYY-MM-DD), parse as local
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number)
        return new Date(year, month - 1, day)
    }
    // Otherwise fall through to standard parsing
    return new Date(dateStr)
}

/**
 * Format a date-only or datetime string for display.
 * Timezone-safe: always shows the intended date, never off by one.
 */
export function formatDateSafe(
    date: string | null | undefined,
    options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
    if (!date) return '—'
    const d = parseLocalDate(date)
    if (isNaN(d.getTime())) return date
    return d.toLocaleDateString('en-US', options)
}

/**
 * Calculate age from a date-of-birth string. Timezone-safe.
 */
export function calculateAge(dob: string): number {
    const today = new Date()
    const birth = parseLocalDate(dob)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--
    }
    return age
}
