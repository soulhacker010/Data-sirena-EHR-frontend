import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
    CaretRight,
    Headphones,
    MusicNotes,
    Play,
    SpeakerHigh,
    SpeakerSlash,
} from '@phosphor-icons/react'
import { BLS_SOUND_CATEGORIES, getSound } from '../../lib/blsConstants'
import { previewSound, unlockAudio } from '../../lib/blsAudio'
import { getSoundIconPath } from '../../lib/blsSoundIcons'
import BLSSoundLibraryModal from './BLSSoundLibraryModal'
import type { BLSSoundKey } from '../../types/bls'

interface BLSSoundPickerProps {
    selectedSound: BLSSoundKey
    onSoundChange: (key: BLSSoundKey) => void
    volume: number
    onVolumeChange: (value: number) => void
    muteForTherapist: boolean
    onMuteForTherapistChange: (mute: boolean) => void
    auditoryEnabled: boolean
    onAuditoryEnabledChange: (enabled: boolean) => void
}

export default function BLSSoundPicker({
    selectedSound,
    onSoundChange,
    volume,
    onVolumeChange,
    muteForTherapist,
    onMuteForTherapistChange,
    auditoryEnabled,
    onAuditoryEnabledChange,
}: BLSSoundPickerProps) {
    const [libraryOpen, setLibraryOpen] = useState(false)

    const handleLibrarySelect = (key: BLSSoundKey) => {
        onSoundChange(key)
        // Preview happens inside the modal already (with the row click). No
        // extra preview here, otherwise we'd double-trigger on every pick.
    }

    const handlePreviewCurrent = () => {
        if (!auditoryEnabled || muteForTherapist) return
        unlockAudio()
        previewSound(selectedSound, volume)
    }

    const currentSound = getSound(selectedSound)
    const currentCategoryLabel = BLS_SOUND_CATEGORIES[currentSound.category].label

    return (
        <div style={containerStyle}>
            <div style={sectionHeaderRowStyle}>
                <div style={sectionHeaderStyle}>
                    <Headphones size={18} weight="duotone" />
                    <span>Auditory</span>
                </div>
                <ToggleSwitch
                    checked={auditoryEnabled}
                    onChange={onAuditoryEnabledChange}
                    label="Auditory enabled"
                />
            </div>

            <div style={{ ...subSectionStyle, opacity: auditoryEnabled ? 1 : 0.4 }}>
                <div style={labelStyle}>Sound</div>
                <div style={currentSoundCardStyle}>
                    <div style={currentSoundIconStyle}>
                        <img
                            src={getSoundIconPath(selectedSound)}
                            alt=""
                            width={26}
                            height={26}
                            style={{ display: 'block' }}
                        />
                    </div>
                    <div style={currentSoundInfoStyle}>
                        <div style={currentSoundNameStyle}>{currentSound.label}</div>
                        <div style={currentSoundCategoryStyle}>{currentCategoryLabel}</div>
                    </div>
                    <button
                        type="button"
                        onClick={handlePreviewCurrent}
                        disabled={!auditoryEnabled || muteForTherapist}
                        style={previewIconBtnStyle}
                        title="Preview current sound"
                        aria-label="Preview current sound"
                    >
                        <Play size={14} weight="fill" color="#FFFFFF" />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => setLibraryOpen(true)}
                    disabled={!auditoryEnabled}
                    style={browseLibraryBtnStyle}
                >
                    <MusicNotes size={15} weight="duotone" />
                    <span>Browse Sound Library</span>
                    <CaretRight size={14} weight="bold" />
                </button>

                <div style={{ ...labelStyle, marginTop: 18 }}>Volume</div>
                <div style={volumeRowStyle}>
                    <SpeakerSlash size={16} weight="regular" style={{ color: '#94A3B8' }} />
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={e => onVolumeChange(parseFloat(e.target.value))}
                        disabled={!auditoryEnabled}
                        style={{ flex: 1 }}
                        aria-label="Audio volume"
                    />
                    <SpeakerHigh size={16} weight="regular" style={{ color: '#64748B' }} />
                    <span style={volumeNumberStyle}>{Math.round(volume * 100)}%</span>
                </div>

                <div style={muteRowStyle}>
                    <input
                        id="bls-mute-therapist"
                        type="checkbox"
                        checked={muteForTherapist}
                        onChange={e => onMuteForTherapistChange(e.target.checked)}
                        disabled={!auditoryEnabled}
                    />
                    <label htmlFor="bls-mute-therapist" style={{ fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                        Mute for therapist (client still hears the sound — useful for in-office sessions)
                    </label>
                </div>
            </div>

            <BLSSoundLibraryModal
                isOpen={libraryOpen}
                onClose={() => setLibraryOpen(false)}
                selectedSound={selectedSound}
                onSelectSound={handleLibrarySelect}
                previewVolume={volume}
            />
        </div>
    )
}

// ─── Reusable toggle (small, only used here for now) ────────────────────────

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            style={{
                width: 38,
                height: 22,
                borderRadius: 999,
                border: 'none',
                background: checked ? '#0D9488' : '#CBD5E1',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
                padding: 0,
            }}
        >
            <span style={{
                position: 'absolute',
                top: 2,
                left: checked ? 18 : 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#FFFFFF',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }} />
        </button>
    )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
}

const sectionHeaderRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
}

const sectionHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 15,
    fontWeight: 700,
    color: '#0F172A',
}

const subSectionStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    transition: 'opacity 0.2s',
}

const labelStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
}

// Card that shows the currently-selected sound — name, category badge, and an
// inline preview button. Replaces the old 8-chip grid since we now have 26
// sounds and a grid would be unmanageable.
const currentSoundCardStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: 10,
    background: '#F8FAFC',
}

const currentSoundIconStyle: CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'rgba(13,148,136,0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
}

const currentSoundInfoStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
}

const currentSoundNameStyle: CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#0F172A',
}

const currentSoundCategoryStyle: CSSProperties = {
    fontSize: 11,
    color: '#64748B',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
}

const previewIconBtnStyle: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#0D9488',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
}

const browseLibraryBtnStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '10px 14px',
    marginTop: 8,
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    background: '#FFFFFF',
    color: '#0F172A',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    justifyContent: 'space-between',
    transition: 'all 0.15s',
}

const volumeRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
}

const volumeNumberStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
    minWidth: 38,
    textAlign: 'right',
}

const muteRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
}
