import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import toast from 'react-hot-toast'
import { Waveform, FloppyDisk, ArrowCounterClockwise } from '@phosphor-icons/react'
import {
    BLS_COLORS,
    BLS_BACKGROUNDS,
    BLS_SOUNDS,
    BLS_SPEED_MIN,
    BLS_SPEED_MAX,
} from '../../lib/blsConstants'
import {
    getBLSDefaults,
    saveBLSDefaults,
    resetBLSDefaults,
    FACTORY_DEFAULTS,
} from '../../lib/blsDefaults'
import type { BLSDefaults } from '../../lib/blsDefaults'
import type {
    BLSColorKey,
    BLSBackgroundKey,
    BLSSoundKey,
    BLSAutostopMode,
} from '../../types/bls'

/**
 * Practice-wide BLS defaults — lives as a section inside the existing
 * Settings page. Six fields, one save button. Resolves the "no dedicated
 * settings page for BLS" decision from BLS-SYSTEM-DESIGN.md §9 by giving
 * the practice a single place for the few preferences that are genuinely
 * org-wide instead of per-session.
 *
 * State management: local copy + dirty flag, so the Save button only enables
 * when the form differs from what's persisted. Reset returns to factory
 * defaults (and re-renders, so the form reflects the cleared state).
 */
export default function BLSDefaultsSection() {
    const [defaults, setDefaults] = useState<BLSDefaults>(getBLSDefaults)
    const [original, setOriginal] = useState<BLSDefaults>(getBLSDefaults)

    // Reload from storage if the storage key gets externally modified
    // (e.g., resetBLSDefaults called from somewhere else).
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === 'bls_defaults') {
                const next = getBLSDefaults()
                setDefaults(next)
                setOriginal(next)
            }
        }
        window.addEventListener('storage', handler)
        return () => window.removeEventListener('storage', handler)
    }, [])

    const isDirty = JSON.stringify(defaults) !== JSON.stringify(original)

    const handleSave = () => {
        const ok = saveBLSDefaults(defaults)
        if (ok) {
            setOriginal(defaults)
            toast.success('BLS defaults saved')
        } else {
            toast.error('Could not save — storage may be full or disabled')
        }
    }

    const handleReset = () => {
        if (!window.confirm('Reset BLS defaults to factory settings?')) return
        resetBLSDefaults()
        setDefaults(FACTORY_DEFAULTS)
        setOriginal(FACTORY_DEFAULTS)
        toast.success('Defaults reset to factory')
    }

    const update = <K extends keyof BLSDefaults>(key: K, value: BLSDefaults[K]) => {
        setDefaults(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="settings-section">
            <h2 className="settings-section-title">
                <Waveform size={22} weight="duotone" style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Bilateral Stimulation Defaults
            </h2>
            <p className="settings-section-desc">
                Default settings applied when a clinician opens a new BLS session.
                Individual sessions can override any of these from the control panel —
                this just sets the starting point.
            </p>

            <div style={fieldsGridStyle}>
                {/* Default speed */}
                <div className="form-group">
                    <label className="form-label">Default Speed</label>
                    <div style={sliderRowStyle}>
                        <input
                            type="range"
                            min={BLS_SPEED_MIN}
                            max={BLS_SPEED_MAX}
                            step={0.1}
                            value={defaults.speed}
                            onChange={e => update('speed', parseFloat(e.target.value))}
                            style={{ flex: 1 }}
                            aria-label="Default speed"
                        />
                        <span style={valueBadgeStyle}>{defaults.speed.toFixed(1)}</span>
                    </div>
                    <p className="form-help">
                        Speed 1 (slow, calming) to 10 (rapid, taxing working memory).
                    </p>
                </div>

                {/* Default sound */}
                <div className="form-group">
                    <label className="form-label">Default Sound</label>
                    <select
                        className="form-input"
                        value={defaults.sound}
                        onChange={e => update('sound', e.target.value as BLSSoundKey)}
                    >
                        {BLS_SOUNDS.map(s => (
                            <option key={s.key} value={s.key}>
                                {s.icon}  {s.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Default dot color */}
                <div className="form-group">
                    <label className="form-label">Default Dot Color</label>
                    <div style={swatchRowStyle}>
                        {BLS_COLORS.map(c => (
                            <button
                                type="button"
                                key={c.key}
                                onClick={() => update('color', c.key as BLSColorKey)}
                                title={c.label}
                                aria-label={c.label}
                                aria-pressed={defaults.color === c.key}
                                style={swatchStyle(defaults.color === c.key, c.hex)}
                            />
                        ))}
                    </div>
                </div>

                {/* Default background */}
                <div className="form-group">
                    <label className="form-label">Default Background</label>
                    <div style={swatchRowStyle}>
                        {BLS_BACKGROUNDS.map(b => (
                            <button
                                type="button"
                                key={b.key}
                                onClick={() => update('background', b.key as BLSBackgroundKey)}
                                title={b.label}
                                aria-label={b.label}
                                aria-pressed={defaults.background === b.key}
                                style={swatchStyle(defaults.background === b.key, b.hex, true)}
                            />
                        ))}
                    </div>
                </div>

                {/* Default autostop */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Default Autostop</label>
                    <div style={autostopRowStyle}>
                        <select
                            className="form-input"
                            style={{ maxWidth: 180 }}
                            value={defaults.autostop_mode}
                            onChange={e => update('autostop_mode', e.target.value as BLSAutostopMode)}
                        >
                            <option value="off">Off (manual stop only)</option>
                            <option value="passes">Stop after N passes</option>
                            <option value="seconds">Stop after N seconds</option>
                        </select>
                        {defaults.autostop_mode === 'passes' && (
                            <input
                                type="number"
                                className="form-input"
                                style={{ maxWidth: 110 }}
                                min={1}
                                max={300}
                                value={defaults.autostop_passes}
                                onChange={e => update('autostop_passes', Math.max(1, parseInt(e.target.value) || 1))}
                                aria-label="Autostop passes"
                            />
                        )}
                        {defaults.autostop_mode === 'seconds' && (
                            <input
                                type="number"
                                className="form-input"
                                style={{ maxWidth: 110 }}
                                min={5}
                                max={900}
                                step={5}
                                value={defaults.autostop_seconds}
                                onChange={e => update('autostop_seconds', Math.max(5, parseInt(e.target.value) || 5))}
                                aria-label="Autostop seconds"
                            />
                        )}
                    </div>
                    <p className="form-help">
                        Hard timeout for individual sets. Lets the clinician focus on
                        the client instead of the stopwatch.
                    </p>
                </div>

                {/* Headphones reminder toggle */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Headphones Reminder</label>
                    <div style={toggleRowStyle}>
                        <input
                            type="checkbox"
                            id="bls-headphones-reminder"
                            checked={defaults.show_headphones_reminder}
                            onChange={e => update('show_headphones_reminder', e.target.checked)}
                        />
                        <label
                            htmlFor="bls-headphones-reminder"
                            style={{ cursor: 'pointer', fontSize: 14, color: '#475569' }}
                        >
                            Show a "confirm client has headphones" reminder when a client
                            connects to a session with audio enabled.
                        </label>
                    </div>
                </div>
            </div>

            <div style={actionsRowStyle}>
                <button
                    type="button"
                    className="btn-primary"
                    disabled={!isDirty}
                    onClick={handleSave}
                >
                    <FloppyDisk size={16} weight="fill" />
                    Save Defaults
                </button>
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleReset}
                >
                    <ArrowCounterClockwise size={16} weight="bold" />
                    Reset to factory
                </button>
                {isDirty && (
                    <span style={dirtyHintStyle}>You have unsaved changes</span>
                )}
            </div>
        </div>
    )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const fieldsGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 20,
    marginBottom: 24,
}

const sliderRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
}

const valueBadgeStyle: CSSProperties = {
    minWidth: 42,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 700,
    color: '#0F766E',
    background: '#CCFBF1',
    padding: '4px 10px',
    borderRadius: 6,
    fontVariantNumeric: 'tabular-nums',
}

const swatchRowStyle: CSSProperties = {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
}

const swatchStyle = (selected: boolean, hex: string, withBorder = false): CSSProperties => ({
    width: 36,
    height: 36,
    borderRadius: 8,
    background: hex,
    border: selected ? '2.5px solid #0D9488' : withBorder ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: selected ? '0 0 0 3px rgba(13,148,136,0.18)' : 'none',
    padding: 0,
})

const autostopRowStyle: CSSProperties = {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
}

const toggleRowStyle: CSSProperties = {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    padding: '10px 14px',
    background: '#F8FAFC',
    borderRadius: 8,
    border: '1px solid #E2E8F0',
}

const actionsRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTop: '1px solid #E2E8F0',
    flexWrap: 'wrap',
}

const dirtyHintStyle: CSSProperties = {
    fontSize: 12,
    color: '#B45309',
    fontWeight: 600,
    marginLeft: 'auto',
}
