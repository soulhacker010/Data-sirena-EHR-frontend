/**
 * Type definitions for the Bilateral Stimulation (BLS) module.
 *
 * Mirrors the schema in BLS-SYSTEM-DESIGN.md. The shapes here are what the
 * therapist control panel manipulates locally; once the backend lands these
 * become the wire format too (just snake_cased through the serializer).
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type BLSColorKey = 'blue' | 'green' | 'yellow' | 'red' | 'custom'
export type BLSBackgroundKey = 'gray' | 'white' | 'pink' | 'custom' | 'image'
export type BLSDirectionKey = 'horizontal' | 'diagonal_left' | 'diagonal_right' | 'vertical' | 'infinity'
export type BLSPositionKey = 'center' | 'top' | 'bottom'
export type BLSModalityKey = 'visual_only' | 'audio_only' | 'both'
export type BLSStimulusKey = 'dot' | 'emoji' | 'animal' | 'illustration'
export type BLSSoundCategory = 'classics' | 'drums' | 'bowls' | 'new_classics'

export type BLSSoundKey =
    // Classics — the original 8 patches
    | 'finger_snap' | 'heartbeat' | 'beep' | 'bass_guitar'
    | 'soft_bell' | 'soft_flame' | 'lip_pop' | 'badminton'
    // Drums — percussive patches with pitched body + noise transient
    | 'claves' | 'bongo' | 'djembe' | 'tom_drum' | 'snare' | 'tribal_beat'
    // Sound Bowls — FM-synthesized bells, bowls and gongs
    | 'tibetan_low' | 'tibetan_mid' | 'tibetan_high' | 'bell_ring' | 'gong'
    // New Classics — modern utility sounds (beeps, clicks, snaps)
    | 'beep_1' | 'beep_2' | 'strum' | 'mouse_click' | 'clock_tick' | 'tongue_pop' | 'snap'

export type BLSAutostopMode = 'off' | 'passes' | 'seconds'

export type BLSClientStatus =
    | 'no_client'      // session created, no client connected yet
    | 'connecting'     // client just clicked the link
    | 'connected'      // client active
    | 'disconnected'   // lost connection mid-session
    | 'audio_failed'   // client cannot play audio

export type BLSRunState = 'idle' | 'running' | 'paused' | 'ended'

// ─── Config (what the therapist controls) ───────────────────────────────────

export interface BLSConfig {
    // Visual
    color: BLSColorKey
    background: BLSBackgroundKey
    /** Free-form hex (#RRGGBB) used only when color === 'custom'. Always
     *  carried so the wire format / config persistence shape stays stable. */
    customColorHex: string
    /** Free-form hex used only when background === 'custom'. */
    customBackgroundHex: string
    /** Bundled background id (`{category}/{slug}`) — set when background ===
     *  'image' AND backgroundImageDataUrl is null. */
    backgroundImageId?: string | null
    /** Inline data URL for an uploaded background — set when background ===
     *  'image' AND the user picked an upload (rather than a bundled image).
     *  Sent over the wire to the client view as part of the STATE message. */
    backgroundImageDataUrl?: string | null
    direction: BLSDirectionKey
    position: BLSPositionKey
    stimulus: BLSStimulusKey
    stimulusEmoji?: string         // when stimulus === 'emoji' (legacy Unicode)
    stimulusAnimal?: string        // when stimulus === 'animal' (legacy Unicode)
    /** Persisted id from the illustration manifest (`{category}/{slug}`).
     *  Set when stimulus === 'illustration'. Resolved at render time via
     *  findBLSIllustration(). */
    illustrationId?: string

    // Auditory
    sound: BLSSoundKey
    volume: number           // 0.0–1.0
    muteForTherapist: boolean

    // Modalities (which channels are on)
    visualEnabled: boolean
    auditoryEnabled: boolean

    // Speed
    speed: number            // 1.0–10.0 (passes/sec equivalent)

    // Autostop
    autostopMode: BLSAutostopMode
    autostopPasses: number   // used when mode === 'passes'
    autostopSeconds: number  // used when mode === 'seconds'
}

// ─── Live session state (what changes during a session) ─────────────────────

export interface BLSLiveState {
    runState: BLSRunState
    clientStatus: BLSClientStatus

    // Counters — server-authoritative in prod; locally tracked in the mock dashboard
    timeSeconds: number      // elapsed active stimulation time
    passCount: number        // cumulative passes across all sets
    setCount: number         // number of distinct sets

    // Timing — these flow over the wire to the client so its renderer stays
    // in lock-step with the therapist's. `startedAt` is shifted forward on
    // RESUME so the dot resumes smoothly from where it paused.
    startedAt: number | null      // ms epoch — null when not running
    pausedAt: number | null       // ms epoch — set during paused, cleared on resume

    // sessionStartedAt is set on the FIRST start in this session and
    // preserved across STOP_SET → START cycles. Used only for the history
    // record's "session started" timestamp — does NOT drive rendering.
    sessionStartedAt: number | null

    // Session identity (set when "Invite Client" generates the token)
    sessionId: string | null
    inviteUrl: string | null

    // Context (populated when launched from an appointment)
    clientId: string | null
    clientName: string | null
    appointmentId: string | null
    appointmentLabel: string | null  // e.g., "Mon Jun 4 · 2:00 PM · 90837"
}

// ─── Combined panel state ───────────────────────────────────────────────────

export interface BLSPanelState {
    config: BLSConfig
    live: BLSLiveState
}
