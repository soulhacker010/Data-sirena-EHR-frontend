import { describe, it, expect } from 'vitest'
import { computeBLSMotion, computePhase, speedToCycleMs } from './blsMotion'
import type { MotionInput } from './blsMotion'

const baseInput = (overrides: Partial<MotionInput> = {}): MotionInput => ({
    direction: 'horizontal',
    phase: 0,
    width: 400,
    height: 200,
    position: 'center',
    paddingPx: 20,
    ...overrides,
})

describe('computeBLSMotion — horizontal', () => {
    it('at phase 0 returns the base center (sine = 0)', () => {
        const result = computeBLSMotion(baseInput({ direction: 'horizontal', phase: 0 }))
        expect(result.x).toBeCloseTo(200, 5)  // width/2
        expect(result.y).toBeCloseTo(100, 5)  // height/2
    })

    it('at phase 0.25 reaches the rightmost extreme', () => {
        const result = computeBLSMotion(baseInput({ phase: 0.25 }))
        // baseX + xAmplitude = 200 + (200 - 20) = 380
        expect(result.x).toBeCloseTo(380, 5)
        expect(result.y).toBeCloseTo(100, 5)
        expect(result.passDirSign).toBe(1)
    })

    it('at phase 0.75 reaches the leftmost extreme', () => {
        const result = computeBLSMotion(baseInput({ phase: 0.75 }))
        expect(result.x).toBeCloseTo(20, 5)  // baseX - xAmplitude
        expect(result.y).toBeCloseTo(100, 5)
        expect(result.passDirSign).toBe(-1)
    })

    it('at phase 0.5 (midline crossing going left) returns to base', () => {
        const result = computeBLSMotion(baseInput({ phase: 0.5 }))
        expect(result.x).toBeCloseTo(200, 5)
        expect(result.y).toBeCloseTo(100, 5)
    })
})

describe('computeBLSMotion — vertical', () => {
    it('at phase 0.25 reaches the bottommost extreme', () => {
        const result = computeBLSMotion(baseInput({ direction: 'vertical', phase: 0.25 }))
        expect(result.x).toBeCloseTo(200, 5)  // X stays at base
        // baseY + yAmplitudeSafe = 100 + min(80, 80) = 180
        expect(result.y).toBeCloseTo(180, 5)
    })

    it('at phase 0.75 reaches the topmost extreme', () => {
        const result = computeBLSMotion(baseInput({ direction: 'vertical', phase: 0.75 }))
        expect(result.x).toBeCloseTo(200, 5)
        expect(result.y).toBeCloseTo(20, 5)  // baseY - yAmplitudeSafe
    })

    it('clamps Y travel when position is top so dot stays in canvas', () => {
        // Position top → baseY = 0.28 * 200 = 56. yRoomUp = 36 (less than yRoomDown=124).
        // yAmplitudeSafe = min(36, 124) = 36. Dot oscillates 56±36 = 20..92.
        const max = computeBLSMotion(baseInput({ direction: 'vertical', position: 'top', phase: 0.25 }))
        expect(max.y).toBeCloseTo(92, 5)
        const min = computeBLSMotion(baseInput({ direction: 'vertical', position: 'top', phase: 0.75 }))
        expect(min.y).toBeCloseTo(20, 5)
        // Both within bounds [paddingPx, height-paddingPx] = [20, 180]
        expect(min.y).toBeGreaterThanOrEqual(20)
        expect(max.y).toBeLessThanOrEqual(180)
    })

    it('mirrors symmetrically for position=bottom (clamps the OTHER edge)', () => {
        // Position bottom → baseY = 0.72 * 200 = 144. yRoomDown = 36 (smaller).
        // yAmplitudeSafe = 36 → dot oscillates 144±36 = 108..180.
        const max = computeBLSMotion(baseInput({ direction: 'vertical', position: 'bottom', phase: 0.25 }))
        expect(max.y).toBeCloseTo(180, 5)
        const min = computeBLSMotion(baseInput({ direction: 'vertical', position: 'bottom', phase: 0.75 }))
        expect(min.y).toBeCloseTo(108, 5)
        // Within bounds
        expect(min.y).toBeGreaterThanOrEqual(20)
        expect(max.y).toBeLessThanOrEqual(180)
    })

    it('horizontal at position=bottom keeps dot in lower portion', () => {
        const result = computeBLSMotion(baseInput({ direction: 'horizontal', position: 'bottom', phase: 0 }))
        // baseY = 0.72 * 200 = 144
        expect(result.y).toBeCloseTo(144, 5)
    })
})

describe('computeBLSMotion — diagonal_left (↗)', () => {
    it('at phase 0.25 goes upper-right (x+, y-)', () => {
        // Canvas Y is inverted: smaller Y = visually higher
        const result = computeBLSMotion(baseInput({ direction: 'diagonal_left', phase: 0.25 }))
        expect(result.x).toBeGreaterThan(200)
        expect(result.y).toBeLessThan(100)
    })

    it('at phase 0.75 goes lower-left (x-, y+)', () => {
        const result = computeBLSMotion(baseInput({ direction: 'diagonal_left', phase: 0.75 }))
        expect(result.x).toBeLessThan(200)
        expect(result.y).toBeGreaterThan(100)
    })
})

describe('computeBLSMotion — diagonal_right (↘)', () => {
    it('at phase 0.25 goes lower-right (x+, y+)', () => {
        const result = computeBLSMotion(baseInput({ direction: 'diagonal_right', phase: 0.25 }))
        expect(result.x).toBeGreaterThan(200)
        expect(result.y).toBeGreaterThan(100)
    })

    it('at phase 0.75 goes upper-left (x-, y-)', () => {
        const result = computeBLSMotion(baseInput({ direction: 'diagonal_right', phase: 0.75 }))
        expect(result.x).toBeLessThan(200)
        expect(result.y).toBeLessThan(100)
    })
})

describe('computeBLSMotion — infinity (∞)', () => {
    it('completes one figure-8 per cycle (crosses center mid-cycle)', () => {
        // At phase 0.5, sine(angle) = sine(π) = 0, sine(2*angle) = sine(2π) = 0
        // → dot is at exactly the base position (center of the ∞)
        const mid = computeBLSMotion(baseInput({ direction: 'infinity', phase: 0.5 }))
        expect(mid.x).toBeCloseTo(200, 5)
        expect(mid.y).toBeCloseTo(100, 5)
    })

    it('at phase 0.25 sits at the X extreme with Y back at base', () => {
        // sine(π/2) = 1 → x at right edge
        // sine(2 * π/2) = sine(π) = 0 → y back at base
        const result = computeBLSMotion(baseInput({ direction: 'infinity', phase: 0.25 }))
        expect(result.x).toBeCloseTo(380, 5)
        expect(result.y).toBeCloseTo(100, 5)
    })

    it('at phase 0.125 traces the upper-right of the figure-8', () => {
        // sine(π/4) ≈ 0.707, sine(π/2) = 1
        const result = computeBLSMotion(baseInput({ direction: 'infinity', phase: 0.125 }))
        expect(result.x).toBeGreaterThan(200)
        // y = baseY + sin(2*angle) * amplitude / 2 — sin(2*π/4) = 1, positive → y goes DOWN in canvas
        expect(result.y).toBeGreaterThan(100)
    })
})

describe('computeBLSMotion — passDirSign', () => {
    it('flips between +1 and -1 across the cycle', () => {
        const r1 = computeBLSMotion(baseInput({ phase: 0.1 }))
        const r2 = computeBLSMotion(baseInput({ phase: 0.4 }))
        const r3 = computeBLSMotion(baseInput({ phase: 0.6 }))
        const r4 = computeBLSMotion(baseInput({ phase: 0.9 }))
        expect(r1.passDirSign).toBe(1)
        expect(r2.passDirSign).toBe(1)
        expect(r3.passDirSign).toBe(-1)
        expect(r4.passDirSign).toBe(-1)
    })

    it('is direction-agnostic (same sign rule applies for all)', () => {
        const phases: number[] = [0.1, 0.4, 0.6, 0.9]
        const dirs = ['horizontal', 'vertical', 'diagonal_left', 'diagonal_right', 'infinity'] as const
        for (const dir of dirs) {
            for (const phase of phases) {
                const result = computeBLSMotion(baseInput({ direction: dir, phase }))
                expect([-1, 1]).toContain(result.passDirSign)
            }
        }
    })
})

describe('speedToCycleMs', () => {
    it('speed 1 → ~2500ms cycle (0.4 Hz)', () => {
        expect(speedToCycleMs(1)).toBeCloseTo(2500, 1)
    })

    it('speed 10 → ~500ms cycle (2.0 Hz)', () => {
        expect(speedToCycleMs(10)).toBeCloseTo(500, 1)
    })

    it('speed 5.5 sits between (1.2 Hz, ~833ms)', () => {
        expect(speedToCycleMs(5.5)).toBeCloseTo(833.33, 1)
    })
})

describe('computePhase', () => {
    it('returns 0 at startedAt', () => {
        expect(computePhase(1000, 1000, 800)).toBe(0)
    })

    it('returns 0.5 halfway through the cycle', () => {
        expect(computePhase(1000, 1400, 800)).toBeCloseTo(0.5, 5)
    })

    it('wraps modulo cycleMs', () => {
        expect(computePhase(1000, 1000 + 800 + 200, 800)).toBeCloseTo(0.25, 5)
    })

    it('handles startedAt > now (clock skew) without going negative', () => {
        const result = computePhase(2000, 1000, 800)
        // (-1000 % 800 + 800) % 800 / 800 = (... + 800) % 800 / 800 should be in [0, 1)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThan(1)
    })
})

describe('computeBLSMotion — bounds safety (never escapes canvas)', () => {
    it('dot stays inside canvas at all phases for every direction + position', () => {
        const dirs = ['horizontal', 'vertical', 'diagonal_left', 'diagonal_right', 'infinity'] as const
        const positions = ['center', 'top', 'bottom'] as const
        const phases = Array.from({ length: 40 }, (_, i) => i / 40)
        const width = 600
        const height = 300
        const paddingPx = 30

        for (const direction of dirs) {
            for (const position of positions) {
                for (const phase of phases) {
                    const { x, y } = computeBLSMotion({ direction, phase, width, height, position, paddingPx })
                    expect(x).toBeGreaterThanOrEqual(paddingPx - 0.001)
                    expect(x).toBeLessThanOrEqual(width - paddingPx + 0.001)
                    expect(y).toBeGreaterThanOrEqual(paddingPx - 0.001)
                    expect(y).toBeLessThanOrEqual(height - paddingPx + 0.001)
                }
            }
        }
    })
})
