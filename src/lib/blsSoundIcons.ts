/**
 * Maps each BLS sound to its Fluent Emoji SVG icon. SVGs live in
 * public/bls-sound-icons/ (see scripts/download-bls-sound-icons.mjs).
 *
 * Multiple sounds may share the same icon when Fluent Emoji doesn't offer
 * enough variety — for example, all 5 Tibetan bowls reference
 * "bowl-with-spoon.svg" because that's the only bowl in the set. Sound
 * name + category context distinguishes them visually.
 */
import type { BLSSoundKey } from '../types/bls'

const path = (slug: string): string => `/bls-sound-icons/${slug}.svg`

export const BLS_SOUND_ICON_PATH: Record<BLSSoundKey, string> = {
    // ─── Classics ─────────────────────────────────────────────────────────
    finger_snap:  path('pinched-fingers'),
    heartbeat:    path('beating-heart'),
    beep:         path('robot'),
    bass_guitar:  path('guitar'),
    soft_bell:    path('bell'),
    soft_flame:   path('fire'),
    lip_pop:      path('kiss-mark'),
    badminton:    path('badminton'),

    // ─── Drums ────────────────────────────────────────────────────────────
    // Claves are wooden striking sticks → hammer is the closest match
    claves:       path('hammer'),
    bongo:        path('drum'),
    djembe:       path('long-drum'),
    tom_drum:     path('drum'),
    snare:        path('drum'),
    tribal_beat:  path('long-drum'),

    // ─── Sound Bowls ──────────────────────────────────────────────────────
    tibetan_low:  path('bowl-with-spoon'),
    tibetan_mid:  path('bowl-with-spoon'),
    tibetan_high: path('bowl-with-spoon'),
    bell_ring:    path('bellhop-bell'),
    gong:         path('bell'),

    // ─── New Classics ─────────────────────────────────────────────────────
    beep_1:       path('loudspeaker'),
    beep_2:       path('megaphone'),
    strum:        path('musical-notes'),
    mouse_click:  path('computer-mouse'),
    clock_tick:   path('alarm-clock'),
    tongue_pop:   path('tongue'),
    snap:         path('sparkles'),
}

export function getSoundIconPath(key: BLSSoundKey): string {
    return BLS_SOUND_ICON_PATH[key]
}
