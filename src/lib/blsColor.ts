/**
 * Pure color math for the BLS custom color picker.
 *
 * Two coordinate spaces are used:
 *  - HSL: matches CSS `hsl()` syntax and is easy to manipulate in UI sliders
 *    (Hue 0..360, Saturation 0..100, Lightness 0..100).
 *  - Hex: what we persist in the config + send over the wire to the client.
 *
 * Everything in this file is a pure function — easy to unit-test, no DOM,
 * no React.
 */

export interface HSL {
    h: number  // 0..360
    s: number  // 0..100
    l: number  // 0..100
}

const HEX_RE = /^#?([a-f\d]{3}|[a-f\d]{6})$/i

/**
 * Loose hex check — accepts both shorthand (#abc) and full (#aabbcc). Returns
 * the normalized 6-digit form with a leading `#` if valid, or null otherwise.
 */
export function normalizeHex(input: string): string | null {
    if (typeof input !== 'string') return null
    const trimmed = input.trim()
    const m = trimmed.match(HEX_RE)
    if (!m) return null
    let hex = m[1]
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('')
    }
    return `#${hex.toUpperCase()}`
}

export function isValidHex(input: string): boolean {
    return normalizeHex(input) !== null
}

/**
 * Convert a hex color to HSL. Invalid input returns black (0,0,0).
 */
export function hexToHsl(hex: string): HSL {
    const normalized = normalizeHex(hex)
    if (!normalized) return { h: 0, s: 0, l: 0 }

    const r = parseInt(normalized.slice(1, 3), 16) / 255
    const g = parseInt(normalized.slice(3, 5), 16) / 255
    const b = parseInt(normalized.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    let h = 0
    let s = 0

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
        }
        h *= 60
    }

    return {
        h: Math.round(h),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    }
}

/**
 * Convert HSL to hex. Values are clamped to their valid ranges.
 */
export function hslToHex(hsl: HSL): string {
    const h = clamp(hsl.h, 0, 360)
    const s = clamp(hsl.s, 0, 100) / 100
    const l = clamp(hsl.l, 0, 100) / 100

    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) =>
        l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))

    const r = Math.round(255 * f(0))
    const g = Math.round(255 * f(8))
    const b = Math.round(255 * f(4))

    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}
