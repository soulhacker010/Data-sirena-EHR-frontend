/**
 * Per-organization BLS defaults — localStorage-backed for the mock.
 *
 * When a clinician opens the BLS control panel, the initial config is seeded
 * from these defaults instead of the hardcoded `DEFAULT_BLS_CONFIG`. Lets
 * Dr. Joe (and the rest of the practice) set "we always start at speed 4,
 * soft bell, autostop after 30 passes" once instead of every session.
 *
 * Shape mirrors the eventual /api/bls/defaults endpoint exactly — swapping
 * for a real API call is a one-file change.
 */
import type {
    BLSColorKey,
    BLSBackgroundKey,
    BLSSoundKey,
    BLSAutostopMode,
} from '../types/bls'
import { BLS_SPEED_DEFAULT } from './blsConstants'

const STORAGE_KEY = 'bls_defaults'

export interface BLSDefaults {
    speed: number
    sound: BLSSoundKey
    color: BLSColorKey
    background: BLSBackgroundKey
    autostop_mode: BLSAutostopMode
    autostop_passes: number
    autostop_seconds: number
    show_headphones_reminder: boolean
}

export const FACTORY_DEFAULTS: BLSDefaults = {
    speed: BLS_SPEED_DEFAULT,
    sound: 'finger_snap',
    color: 'blue',
    background: 'gray',
    autostop_mode: 'off',
    autostop_passes: 30,
    autostop_seconds: 60,
    show_headphones_reminder: true,
}

export function getBLSDefaults(): BLSDefaults {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return FACTORY_DEFAULTS
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return FACTORY_DEFAULTS
        return { ...FACTORY_DEFAULTS, ...parsed }
    } catch {
        return FACTORY_DEFAULTS
    }
}

export function saveBLSDefaults(defaults: BLSDefaults): boolean {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
        return true
    } catch {
        return false
    }
}

export function resetBLSDefaults(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore */ }
}
