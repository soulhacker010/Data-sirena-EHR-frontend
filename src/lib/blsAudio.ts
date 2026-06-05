/**
 * BLS audio synthesis (Web Audio API).
 *
 * Generates each sound on the fly from a synth recipe (see BLSSynthRecipe in
 * lib/blsConstants.ts). No audio files are loaded — every patch is built
 * from oscillators, white-noise buffers, and gain envelopes wired together
 * dynamically. Trade-off vs. recorded samples:
 *
 *   + Zero file weight, zero IP risk, works offline, deterministic
 *   + Easy to add patches (5 lines)
 *   − Doesn't capture the texture of a real recording. Acceptable for EMDR
 *     where clean predictable tones are clinically preferred anyway.
 *
 * Five recipe families are supported via the dispatcher in `playBeat`:
 *
 *   - 'osc'    simple oscillator + envelope
 *   - 'noise'  white-noise burst with optional band filter
 *   - 'drum'   pitched body (with pitch-sweep) + noise transient on attack
 *   - 'fm'     FM bell — carrier modulated by another oscillator at audio rate
 *              (creates the inharmonic spectrum that gives bells/bowls their
 *              characteristic shimmer)
 *   - 'strum'  detuned multi-oscillator stack — plucked-string texture
 */
import type { BLSSoundKey } from '../types/bls'
import { getSound } from './blsConstants'
import type { BLSSynthRecipe } from './blsConstants'

let _ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
    if (_ctx) return _ctx
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
    const Ctor = W.AudioContext ?? W.webkitAudioContext
    if (!Ctor) return null
    _ctx = new Ctor()
    return _ctx
}

/**
 * Build a stereo panner that works on both modern browsers and the older
 * Safari versions that lack StereoPannerNode. Returns the input AudioNode
 * the source should connect to, and the output node that connects to the
 * destination. Internally splits into two gain branches for the fallback.
 */
function buildPanner(ctx: AudioContext, pan: number): { input: AudioNode; output: AudioNode } {
    const clamped = Math.max(-1, Math.min(1, pan))
    if (typeof ctx.createStereoPanner === 'function') {
        const p = ctx.createStereoPanner()
        p.pan.value = clamped
        return { input: p, output: p }
    }
    // Equal-power pan via L/R gain split + channel merger
    const merger = ctx.createChannelMerger(2)
    const leftGain = ctx.createGain()
    const rightGain = ctx.createGain()
    const angle = ((clamped + 1) / 2) * (Math.PI / 2)
    leftGain.gain.value = Math.cos(angle)
    rightGain.gain.value = Math.sin(angle)
    leftGain.connect(merger, 0, 0)
    rightGain.connect(merger, 0, 1)
    // Both input legs feed both gains
    const fanout = ctx.createGain()
    fanout.connect(leftGain)
    fanout.connect(rightGain)
    return { input: fanout, output: merger }
}

/**
 * Build a white-noise buffer of the requested duration. Used by both the
 * 'noise' recipe and the noise transient inside 'drum' patches. Decay shape:
 *   amp = (1 - i/N) ^ (1 + (1 - decay) * 3)
 * Higher decay (closer to 1) → slower fade. Lower → fast attack-only.
 */
function buildNoiseBuffer(ctx: AudioContext, durationSec: number, decay: number): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * durationSec)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    const shape = 1 + (1 - decay) * 3
    for (let i = 0; i < bufferSize; i++) {
        const env = Math.pow(1 - i / bufferSize, shape)
        data[i] = (Math.random() * 2 - 1) * env
    }
    return buffer
}

function buildEnvelope(ctx: AudioContext, durationSec: number, volume: number, decay: number): GainNode {
    const gain = ctx.createGain()
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.005)
    // Use exponential fade — closer to how real sounds decay perceptually.
    // Decay shapes the fade tail: higher decay = faster fade.
    const targetTime = now + durationSec * (1 + (1 - decay))
    gain.gain.exponentialRampToValueAtTime(0.0001, targetTime)
    return gain
}

// ─── Per-recipe play functions ──────────────────────────────────────────────

interface PlayContext {
    ctx: AudioContext
    pan: number
    volume: number
    now: number
}

function playOsc(
    p: PlayContext,
    r: Extract<BLSSynthRecipe, { type: 'osc' }>,
): void {
    const durSec = r.durationMs / 1000
    const osc = p.ctx.createOscillator()
    osc.type = r.waveform
    osc.frequency.value = r.frequency
    const env = buildEnvelope(p.ctx, durSec, p.volume, r.decay)
    const panner = buildPanner(p.ctx, p.pan)
    osc.connect(env)
    env.connect(panner.input)
    panner.output.connect(p.ctx.destination)
    osc.start(p.now)
    osc.stop(p.now + durSec + 0.05)
}

function playNoise(
    p: PlayContext,
    r: Extract<BLSSynthRecipe, { type: 'noise' }>,
): void {
    const durSec = r.durationMs / 1000
    const buffer = buildNoiseBuffer(p.ctx, durSec, r.decay)
    const source = p.ctx.createBufferSource()
    source.buffer = buffer
    const env = buildEnvelope(p.ctx, durSec, p.volume, r.decay)
    const panner = buildPanner(p.ctx, p.pan)

    let chain: AudioNode = source
    if (r.highpassHz !== undefined) {
        const hp = p.ctx.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.value = r.highpassHz
        chain.connect(hp)
        chain = hp
    }
    if (r.lowpassHz !== undefined) {
        const lp = p.ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = r.lowpassHz
        chain.connect(lp)
        chain = lp
    }
    chain.connect(env)
    env.connect(panner.input)
    panner.output.connect(p.ctx.destination)
    source.start(p.now)
    source.stop(p.now + durSec + 0.05)
}

function playDrum(
    p: PlayContext,
    r: Extract<BLSSynthRecipe, { type: 'drum' }>,
): void {
    const durSec = r.durationMs / 1000

    // Pitched body with quick pitch-sweep (what makes a drum sound "tuned")
    const body = p.ctx.createOscillator()
    body.type = r.bodyWaveform
    body.frequency.setValueAtTime(r.startHz, p.now)
    body.frequency.exponentialRampToValueAtTime(Math.max(r.endHz, 1), p.now + durSec * 0.6)
    const bodyEnv = buildEnvelope(p.ctx, durSec, p.volume * (1 - r.noiseMix * 0.4), r.decay)

    // Noise transient (the "click" at attack)
    const noiseDurSec = r.noiseDurationMs / 1000
    const noiseBuf = buildNoiseBuffer(p.ctx, noiseDurSec, 0.85)
    const noise = p.ctx.createBufferSource()
    noise.buffer = noiseBuf
    let noiseChain: AudioNode = noise
    if (r.noiseHighpassHz !== undefined) {
        const hp = p.ctx.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.value = r.noiseHighpassHz
        noiseChain.connect(hp)
        noiseChain = hp
    }
    if (r.noiseLowpassHz !== undefined) {
        const lp = p.ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = r.noiseLowpassHz
        noiseChain.connect(lp)
        noiseChain = lp
    }
    const noiseEnv = buildEnvelope(p.ctx, noiseDurSec, p.volume * r.noiseMix, 0.9)

    const panner = buildPanner(p.ctx, p.pan)
    body.connect(bodyEnv)
    bodyEnv.connect(panner.input)
    noiseChain.connect(noiseEnv)
    noiseEnv.connect(panner.input)
    panner.output.connect(p.ctx.destination)

    body.start(p.now)
    body.stop(p.now + durSec + 0.05)
    noise.start(p.now)
    noise.stop(p.now + noiseDurSec + 0.02)
}

function playFM(
    p: PlayContext,
    r: Extract<BLSSynthRecipe, { type: 'fm' }>,
): void {
    const durSec = r.durationMs / 1000
    // Carrier (audible)
    const carrier = p.ctx.createOscillator()
    carrier.type = 'sine'
    carrier.frequency.value = r.carrierHz
    // Modulator drives the carrier's frequency at audio rate — this is FM
    // synthesis. The carrier's frequency oscillates ±modDepth around its
    // center, which produces sidebands at carrierHz ± n*modulatorHz.
    // Non-integer ratios give the inharmonic spectrum bells/bowls have.
    const modulator = p.ctx.createOscillator()
    modulator.type = 'sine'
    modulator.frequency.value = r.modulatorHz
    const modGain = p.ctx.createGain()
    // Mod depth decays over time so the bell starts bright and softens —
    // that's the natural attack-then-mellow shape of a real bell.
    const now = p.now
    modGain.gain.setValueAtTime(r.modDepth, now)
    modGain.gain.exponentialRampToValueAtTime(0.01, now + durSec * 0.7)

    modulator.connect(modGain)
    modGain.connect(carrier.frequency)

    const env = buildEnvelope(p.ctx, durSec, p.volume, r.decay)
    const panner = buildPanner(p.ctx, p.pan)
    carrier.connect(env)
    env.connect(panner.input)
    panner.output.connect(p.ctx.destination)

    modulator.start(now)
    carrier.start(now)
    modulator.stop(now + durSec + 0.1)
    carrier.stop(now + durSec + 0.1)
}

function playStrum(
    p: PlayContext,
    r: Extract<BLSSynthRecipe, { type: 'strum' }>,
): void {
    const durSec = r.durationMs / 1000
    // 4 detuned triangle oscillators give a chorus-like plucked texture
    const detunes = [-12, -7, 0, 7]  // semitone offsets — basic chord-ish stack
    const panner = buildPanner(p.ctx, p.pan)
    const env = buildEnvelope(p.ctx, durSec, p.volume / detunes.length, r.decay)
    for (const semitones of detunes) {
        const osc = p.ctx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.value = r.baseHz * Math.pow(2, semitones / 12)
        osc.connect(env)
        osc.start(p.now)
        osc.stop(p.now + durSec + 0.05)
    }
    env.connect(panner.input)
    panner.output.connect(p.ctx.destination)
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Play one beat of the named sound at the given stereo pan + volume.
 *  - pan: -1 = full left, 0 = center, +1 = full right
 *  - volume: 0–1
 */
export function playBeat(soundKey: BLSSoundKey, pan: number, volume: number): void {
    const ctx = getCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { /* best-effort */ })
    }
    const recipe = getSound(soundKey).synth
    const context: PlayContext = {
        ctx,
        pan,
        volume,
        now: ctx.currentTime,
    }
    switch (recipe.type) {
        case 'osc':   playOsc(context, recipe);   return
        case 'noise': playNoise(context, recipe); return
        case 'drum':  playDrum(context, recipe);  return
        case 'fm':    playFM(context, recipe);    return
        case 'strum': playStrum(context, recipe); return
    }
}

/**
 * Two-beat L/R preview at the top-of-modal volume. Used by the sound library
 * preview buttons so the clinician hears the L→R alternation pattern.
 */
export function previewSound(soundKey: BLSSoundKey, volume: number = 0.7): void {
    playBeat(soundKey, -1, volume)
    setTimeout(() => playBeat(soundKey, +1, volume), 280)
}

/**
 * Force-resume the AudioContext (call inside a user gesture handler the first
 * time audio is needed — required on iOS Safari).
 */
export function unlockAudio(): void {
    const ctx = getCtx()
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => { /* best-effort */ })
    }
}
