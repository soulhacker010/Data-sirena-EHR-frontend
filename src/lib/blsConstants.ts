/**
 * Static configuration for the BLS module — color palettes, sound metadata,
 * kids-mode emoji/animal sets, default config, and human labels.
 *
 * Keep this file pure (no React, no DOM, no audio context) so it can be
 * imported by both the therapist control panel and the future client view
 * without dragging anything heavy.
 */
import type {
    BLSColorKey,
    BLSBackgroundKey,
    BLSDirectionKey,
    BLSPositionKey,
    BLSSoundKey,
    BLSSoundCategory,
    BLSConfig,
    BLSLiveState,
} from '../types/bls'
import { findBLSBackground } from './blsBackgrounds'

// ─── Visual: dot colors ─────────────────────────────────────────────────────

export interface BLSColorDef {
    key: BLSColorKey
    label: string
    hex: string
}

export const BLS_COLORS: BLSColorDef[] = [
    { key: 'blue',   label: 'Blue',   hex: '#1E3A8A' },
    { key: 'green',  label: 'Green',  hex: '#15803D' },
    { key: 'yellow', label: 'Yellow', hex: '#EAB308' },
    { key: 'red',    label: 'Red',    hex: '#9F1239' },
]

// ─── Visual: backgrounds ────────────────────────────────────────────────────

export interface BLSBackgroundDef {
    key: BLSBackgroundKey
    label: string
    hex: string
}

export const BLS_BACKGROUNDS: BLSBackgroundDef[] = [
    { key: 'gray',  label: 'Gray',  hex: '#CBD5E1' },
    { key: 'white', label: 'White', hex: '#FFFFFF' },
    { key: 'pink',  label: 'Pink',  hex: '#FBCFE8' },
]

// ─── Visual: direction ──────────────────────────────────────────────────────
// All five directions ship in v1. Motion math lives in lib/blsMotion.ts and
// is shared by the preview pane and the client view (one source of truth so
// they can't drift).

export interface BLSDirectionDef {
    key: BLSDirectionKey
    label: string
    symbol: string
    locked: boolean
}

export const BLS_DIRECTIONS: BLSDirectionDef[] = [
    { key: 'horizontal',     label: 'Horizontal',     symbol: '↔',  locked: false },
    { key: 'diagonal_left',  label: 'Diagonal ↗',     symbol: '↗',  locked: false },
    { key: 'diagonal_right', label: 'Diagonal ↘',     symbol: '↘',  locked: false },
    { key: 'vertical',       label: 'Vertical',       symbol: '↕',  locked: false },
    { key: 'infinity',       label: 'Infinity',       symbol: '∞',  locked: false },
]

// ─── Visual: position ───────────────────────────────────────────────────────

export interface BLSPositionDef {
    key: BLSPositionKey
    label: string
    symbol: string
}

export const BLS_POSITIONS: BLSPositionDef[] = [
    { key: 'center', label: 'Center', symbol: '⇅' },
    { key: 'top',    label: 'Top',    symbol: '⊤' },
    { key: 'bottom', label: 'Bottom', symbol: '⊥' },
]

// ─── Auditory: sounds ───────────────────────────────────────────────────────

/**
 * Synth recipes — a discriminated union so each sound family can carry its
 * own parameters. The actual audio generation lives in lib/blsAudio.ts; this
 * file just holds the data.
 *
 *  - osc:   simple oscillator (sine/square/triangle/sawtooth)
 *  - noise: white-noise burst, optionally band-filtered
 *  - drum:  percussive body — oscillator with quick pitch-sweep + noise transient
 *  - fm:    FM bell synthesis — carrier modulated by another oscillator
 *           (used for bowls / bells / gongs because the modulation creates
 *           the inharmonic spectrum bells have)
 *  - strum: detuned multi-oscillator stack for plucked-string textures
 */
export type BLSSynthRecipe =
    | { type: 'osc'
        waveform: 'sine' | 'square' | 'triangle' | 'sawtooth'
        frequency: number
        durationMs: number
        decay: number
    }
    | { type: 'noise'
        durationMs: number
        decay: number
        /** Optional band-pass for sharper / softer character */
        lowpassHz?: number
        highpassHz?: number
    }
    | { type: 'drum'
        /** Starting pitch of the body — sweeps to endHz over decay */
        startHz: number
        endHz: number
        /** Body waveform — 'sine' for clean drums, 'triangle' for warmer */
        bodyWaveform: 'sine' | 'triangle'
        durationMs: number
        decay: number
        /** Duration of the noise transient added at attack */
        noiseDurationMs: number
        /** Noise volume relative to body, 0–1 */
        noiseMix: number
        /** Optional band-pass for the noise transient (lowpass = soft, highpass = sharp) */
        noiseLowpassHz?: number
        noiseHighpassHz?: number
    }
    | { type: 'fm'
        /** Carrier (audible) frequency */
        carrierHz: number
        /** Modulator frequency — ratio with carrier creates the bell spectrum */
        modulatorHz: number
        /** Modulation depth in Hz — higher = more inharmonic, brighter */
        modDepth: number
        durationMs: number
        decay: number
    }
    | { type: 'strum'
        baseHz: number
        durationMs: number
        decay: number
    }

export interface BLSSoundDef {
    key: BLSSoundKey
    category: BLSSoundCategory
    label: string
    icon: string                // emoji icon shown on the picker chip
    synth: BLSSynthRecipe
}

export const BLS_SOUNDS: BLSSoundDef[] = [
    // ─── Classics ────────────────────────────────────────────────────────────
    { key: 'finger_snap', category: 'classics', label: 'Finger Snap', icon: '👋',
      synth: { type: 'noise',  durationMs: 120, decay: 0.95, highpassHz: 2000 } },
    { key: 'heartbeat',   category: 'classics', label: 'Heartbeat',   icon: '❤️',
      synth: { type: 'osc', waveform: 'sine',     frequency: 70,   durationMs: 220, decay: 0.85 } },
    { key: 'beep',        category: 'classics', label: 'Beep',        icon: '🔊',
      synth: { type: 'osc', waveform: 'square',   frequency: 880,  durationMs: 150, decay: 0.6  } },
    { key: 'bass_guitar', category: 'classics', label: 'Bass Guitar', icon: '🎸',
      synth: { type: 'osc', waveform: 'triangle', frequency: 110,  durationMs: 380, decay: 0.7  } },
    { key: 'soft_bell',   category: 'classics', label: 'Soft Bell',   icon: '🔔',
      synth: { type: 'osc', waveform: 'sine',     frequency: 1320, durationMs: 600, decay: 0.55 } },
    { key: 'soft_flame',  category: 'classics', label: 'Soft Flame',  icon: '🔥',
      synth: { type: 'noise', durationMs: 280, decay: 0.7, lowpassHz: 800 } },
    { key: 'lip_pop',     category: 'classics', label: 'Lip Pop',     icon: '💋',
      synth: { type: 'osc', waveform: 'sine',     frequency: 220,  durationMs: 110, decay: 0.95 } },
    { key: 'badminton',   category: 'classics', label: 'Badminton',   icon: '🏸',
      synth: { type: 'osc', waveform: 'square',   frequency: 540,  durationMs: 180, decay: 0.9  } },

    // ─── Drums ───────────────────────────────────────────────────────────────
    // Claves — high-pitched wood block, very short and sharp
    { key: 'claves', category: 'drums', label: 'Claves', icon: '🪵',
      synth: { type: 'drum', startHz: 2500, endHz: 2200, bodyWaveform: 'sine',
               durationMs: 70, decay: 0.97, noiseDurationMs: 20, noiseMix: 0.15, noiseHighpassHz: 3000 } },
    // Bongo — mid drum with quick pitch drop
    { key: 'bongo', category: 'drums', label: 'Bongo', icon: '🥁',
      synth: { type: 'drum', startHz: 250, endHz: 160, bodyWaveform: 'sine',
               durationMs: 150, decay: 0.9, noiseDurationMs: 30, noiseMix: 0.25, noiseHighpassHz: 1500 } },
    // Djembe — deep hand drum, longer body
    { key: 'djembe', category: 'drums', label: 'Djembe', icon: '🪘',
      synth: { type: 'drum', startHz: 150, endHz: 90, bodyWaveform: 'sine',
               durationMs: 230, decay: 0.85, noiseDurationMs: 40, noiseMix: 0.3, noiseHighpassHz: 1200 } },
    // Tom Drum — punchy mid drum
    { key: 'tom_drum', category: 'drums', label: 'Tom Drum', icon: '🥁',
      synth: { type: 'drum', startHz: 180, endHz: 110, bodyWaveform: 'triangle',
               durationMs: 220, decay: 0.88, noiseDurationMs: 25, noiseMix: 0.2, noiseHighpassHz: 2000 } },
    // Snare — low body + bright noise (the "rattle")
    { key: 'snare', category: 'drums', label: 'Snare', icon: '🪘',
      synth: { type: 'drum', startHz: 200, endHz: 180, bodyWaveform: 'triangle',
               durationMs: 140, decay: 0.85, noiseDurationMs: 110, noiseMix: 0.6, noiseHighpassHz: 1500 } },
    // Tribal beat — djembe-like but louder, more transient noise
    { key: 'tribal_beat', category: 'drums', label: 'Tribal', icon: '🪘',
      synth: { type: 'drum', startHz: 130, endHz: 75, bodyWaveform: 'sine',
               durationMs: 280, decay: 0.82, noiseDurationMs: 60, noiseMix: 0.4, noiseHighpassHz: 800 } },

    // ─── Sound Bowls — FM synthesis for inharmonic bell spectra ──────────────
    { key: 'tibetan_low',  category: 'bowls', label: 'Tibetan 1', icon: '🥣',
      synth: { type: 'fm', carrierHz: 220, modulatorHz: 660, modDepth: 180, durationMs: 1800, decay: 0.35 } },
    { key: 'tibetan_mid',  category: 'bowls', label: 'Tibetan 2', icon: '🥣',
      synth: { type: 'fm', carrierHz: 330, modulatorHz: 990, modDepth: 200, durationMs: 1600, decay: 0.4  } },
    { key: 'tibetan_high', category: 'bowls', label: 'Tibetan 3', icon: '🥣',
      synth: { type: 'fm', carrierHz: 528, modulatorHz: 1320, modDepth: 220, durationMs: 1400, decay: 0.45 } },
    { key: 'bell_ring',    category: 'bowls', label: 'Bell ring', icon: '🛎️',
      synth: { type: 'fm', carrierHz: 660, modulatorHz: 1980, modDepth: 280, durationMs: 1200, decay: 0.5  } },
    { key: 'gong',         category: 'bowls', label: 'Gong',     icon: '🔔',
      synth: { type: 'fm', carrierHz: 110, modulatorHz: 275, modDepth: 220, durationMs: 2500, decay: 0.3  } },

    // ─── New Classics ────────────────────────────────────────────────────────
    { key: 'beep_1',      category: 'new_classics', label: 'Beep 1',      icon: '📡',
      synth: { type: 'osc', waveform: 'sine',     frequency: 880,  durationMs: 80, decay: 0.7  } },
    { key: 'beep_2',      category: 'new_classics', label: 'Beep 2',      icon: '📡',
      synth: { type: 'osc', waveform: 'triangle', frequency: 660,  durationMs: 80, decay: 0.75 } },
    { key: 'strum',       category: 'new_classics', label: 'Strum',       icon: '🎶',
      synth: { type: 'strum', baseHz: 220, durationMs: 420, decay: 0.65 } },
    { key: 'mouse_click', category: 'new_classics', label: 'Mouse Click', icon: '🖱️',
      synth: { type: 'noise', durationMs: 30, decay: 0.99, highpassHz: 5000 } },
    { key: 'clock_tick',  category: 'new_classics', label: 'Clock Tick',  icon: '⏱️',
      synth: { type: 'osc', waveform: 'triangle', frequency: 1500, durationMs: 45, decay: 0.95 } },
    { key: 'tongue_pop',  category: 'new_classics', label: 'Tongue Pop',  icon: '👅',
      synth: { type: 'osc', waveform: 'sine',     frequency: 350, durationMs: 90, decay: 0.95 } },
    { key: 'snap',        category: 'new_classics', label: 'Snap',        icon: '✨',
      synth: { type: 'noise', durationMs: 60, decay: 0.97, highpassHz: 4000 } },
]

export const BLS_SOUND_CATEGORIES: Record<BLSSoundCategory, {
    label: string
    description: string
    icon: string
}> = {
    classics: {
        label: 'Classics',
        description: 'Original BLS sounds',
        icon: '🎵',
    },
    drums: {
        label: 'Drums',
        description: 'Claves, Bongo, Djembe, Tom & Tribal',
        icon: '🥁',
    },
    bowls: {
        label: 'Sound Bowls',
        description: 'Tibetan bowls and gongs',
        icon: '🔔',
    },
    new_classics: {
        label: 'New Classics',
        description: 'Beeps, clicks, clocks, strums & snaps',
        icon: '📡',
    },
}

export const BLS_SOUNDS_BY_CATEGORY: Record<BLSSoundCategory, BLSSoundDef[]> = {
    classics:     BLS_SOUNDS.filter(s => s.category === 'classics'),
    drums:        BLS_SOUNDS.filter(s => s.category === 'drums'),
    bowls:        BLS_SOUNDS.filter(s => s.category === 'bowls'),
    new_classics: BLS_SOUNDS.filter(s => s.category === 'new_classics'),
}

// ─── Kids mode: emoji and animal sets ───────────────────────────────────────

export const BLS_KIDS_EMOJI: string[] = [
    '⭐', '❤️', '😊', '🌈', '🎈', '🍎', '🚀', '🌟',
]

export const BLS_KIDS_ANIMAL: string[] = [
    '🐶', '🐱', '🦋', '🐰', '🐻', '🦉', '🐠', '🦊',
]

// ─── Speed bounds ───────────────────────────────────────────────────────────

export const BLS_SPEED_MIN = 1
export const BLS_SPEED_MAX = 10
export const BLS_SPEED_DEFAULT = 5.5

// ─── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_BLS_CONFIG: BLSConfig = {
    color: 'blue',
    background: 'gray',
    customColorHex: '#0EA5E9',         // pleasant teal-blue if user picks custom
    customBackgroundHex: '#F1F5F9',    // soft neutral if user picks custom
    backgroundImageId: null,
    backgroundImageDataUrl: null,
    direction: 'horizontal',
    position: 'center',
    stimulus: 'dot',
    sound: 'finger_snap',
    volume: 0.6,
    muteForTherapist: false,
    visualEnabled: true,
    auditoryEnabled: true,
    speed: BLS_SPEED_DEFAULT,
    autostopMode: 'off',
    autostopPasses: 30,
    autostopSeconds: 60,
}

export const DEFAULT_BLS_LIVE: BLSLiveState = {
    runState: 'idle',
    clientStatus: 'no_client',
    timeSeconds: 0,
    passCount: 0,
    setCount: 0,
    startedAt: null,
    pausedAt: null,
    sessionStartedAt: null,
    sessionId: null,
    inviteUrl: null,
    clientId: null,
    clientName: null,
    appointmentId: null,
    appointmentLabel: null,
}

// ─── Helper lookups ─────────────────────────────────────────────────────────

export const getColor = (key: BLSColorKey) =>
    BLS_COLORS.find(c => c.key === key) ?? BLS_COLORS[0]

export const getBackground = (key: BLSBackgroundKey) =>
    BLS_BACKGROUNDS.find(b => b.key === key) ?? BLS_BACKGROUNDS[0]

export const getSound = (key: BLSSoundKey) =>
    BLS_SOUNDS.find(s => s.key === key) ?? BLS_SOUNDS[0]

/**
 * Resolve the final hex color the canvas should paint for the dot. Handles
 * the 'custom' case by reading config.customColorHex (which is always
 * present even when color !== 'custom', so the wire format stays stable).
 */
export function getResolvedColorHex(config: BLSConfig): string {
    if (config.color === 'custom') return config.customColorHex
    return getColor(config.color).hex
}

export function getResolvedBackgroundHex(config: BLSConfig): string {
    if (config.background === 'custom') return config.customBackgroundHex
    if (config.background === 'image') {
        // Dark slate fallback while the image is loading, or if it fails to
        // load entirely. The canvas overlays the image on top when ready.
        return '#0F172A'
    }
    return getBackground(config.background).hex
}

/**
 * URL the canvas should draw as the background image, or null if the current
 * background isn't an image. Handles both bundled (manifest path) and
 * uploaded (data: URL) sources transparently. The actual `findBLSBackground`
 * import is at the bottom of this file — keeping it out of the top-level
 * imports avoids a circular-import risk if blsBackgrounds ever needs to
 * read from blsConstants.
 */
export function getBackgroundImageUrl(config: BLSConfig): string | null {
    if (config.background !== 'image') return null
    if (config.backgroundImageDataUrl) return config.backgroundImageDataUrl
    if (!config.backgroundImageId) return null
    return findBLSBackground(config.backgroundImageId)?.path ?? null
}
