/**
 * BLS motion math — pure function used by both BLSPreviewPane (mini preview
 * canvas) and BLSClientPage (full-screen client view).
 *
 * Pulled out so:
 *  - Both renderers stay locked to the same formula (no drift)
 *  - The math is unit-testable in isolation (see blsMotion.test.ts)
 *  - Future direction additions land in one place
 *
 * Coordinate system: canvas Y increases DOWNWARD. So "going up" subtracts
 * from baseY, "going down" adds.
 *
 * Direction semantics matching bilateralstimulation.io's icons:
 *  - horizontal (↔): dot sweeps left ↔ right
 *  - diagonal_left (↗): lower-left ↔ upper-right
 *  - diagonal_right (↘): upper-left ↔ lower-right
 *  - vertical (↕): dot sweeps up ↔ down
 *  - infinity (∞): figure-8 / lemniscate of Gerono
 *
 * Pass detection: `passDirSign` flips ±1 each half-cycle. Both renderers
 * watch for sign changes (excluding the initial 0) to fire onPass callbacks.
 * Counts identically across all five directions — a "pass" is one
 * half-cycle's worth of motion, the same definition EMDR clinicians use.
 */
import type { BLSDirectionKey, BLSPositionKey } from '../types/bls'

export interface MotionInput {
    direction: BLSDirectionKey
    /** Phase 0..1 representing one full cycle. Repeats every cycleMs. */
    phase: number
    /** Canvas width and height in CSS pixels. */
    width: number
    height: number
    /** Position picker — 'center' or 'top' anchors the base of motion. */
    position: BLSPositionKey
    /** Visual padding so the dot never clips the edge. */
    paddingPx: number
}

export interface MotionOutput {
    x: number
    y: number
    /** ±1 — flips at each half-cycle. Stable readers use sign-change as the
     *  "one pass completed" trigger. */
    passDirSign: number
}

const TAU = Math.PI * 2

export function computeBLSMotion(input: MotionInput): MotionOutput {
    const { direction, phase, width, height, position, paddingPx } = input

    const baseX = width / 2
    const baseY = position === 'top'    ? height * 0.28
                : position === 'bottom' ? height * 0.72
                                        : height * 0.5

    // Available travel — clamped per axis so the dot can never escape the
    // canvas regardless of position. For Y this is critical at position='top'
    // (small headroom upward) and we use the smaller of head/foot room as the
    // amplitude bound (motion stays symmetric around base).
    const xRoom = baseX - paddingPx
    const yRoomUp = baseY - paddingPx
    const yRoomDown = height - paddingPx - baseY
    const xAmplitude = Math.max(0, xRoom)
    const yAmplitudeSafe = Math.max(0, Math.min(yRoomUp, yRoomDown))

    const angle = phase * TAU
    const sine = Math.sin(angle)

    let x = baseX
    let y = baseY

    switch (direction) {
        case 'horizontal':
            x = baseX + sine * xAmplitude
            break

        case 'vertical':
            y = baseY + sine * yAmplitudeSafe
            break

        case 'diagonal_left':
            // ↗ — sine+ goes upper-right, sine- goes lower-left
            x = baseX + sine * xAmplitude
            y = baseY - sine * yAmplitudeSafe
            break

        case 'diagonal_right':
            // ↘ — sine+ goes lower-right, sine- goes upper-left
            x = baseX + sine * xAmplitude
            y = baseY + sine * yAmplitudeSafe
            break

        case 'infinity': {
            // Lemniscate of Gerono — figure-8 shape.
            // x traces one sine wave per cycle; y traces TWO (sine of 2θ),
            // halved in amplitude so the loops are roughly square.
            x = baseX + sine * xAmplitude
            y = baseY + (Math.sin(angle * 2) * yAmplitudeSafe) / 2
            break
        }
    }

    // Sign-based pass detection. For directions where Y is the dominant
    // axis (vertical-only motion in 'vertical'), we still use sine — which
    // is what drives Y in that case anyway. So a single sign-flip rule
    // works across all five directions.
    const passDirSign = sine >= 0 ? 1 : -1

    return { x, y, passDirSign }
}

/**
 * Convert the panel's speed (1–10) to cycle frequency (Hz) and cycle period
 * (ms). Mirrors the existing formula in BLSPreviewPane and the audio loop
 * in BLSControlPage — exporting it here so they all share one source.
 *
 * speed 1  → 0.4 Hz (slow, calming)
 * speed 10 → 2.0 Hz (rapid, taxing)
 */
export function speedToCycleMs(speed: number): number {
    const cycleHz = 0.4 + (speed - 1) * (1.6 / 9)
    return 1000 / cycleHz
}

/**
 * Compute phase (0..1) for the current moment given a startedAt epoch ms.
 * Pure — accepts the current time as input so tests can pass deterministic
 * values without mocking the clock.
 */
export function computePhase(startedAt: number, nowMs: number, cycleMs: number): number {
    const elapsedMs = nowMs - startedAt
    return ((elapsedMs % cycleMs) + cycleMs) % cycleMs / cycleMs
}
