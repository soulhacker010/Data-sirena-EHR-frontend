import { useState } from 'react'
import type { CSSProperties, ElementType } from 'react'
import {
    CaretDown,
    CaretUp,
    Check,
    Play,
    MusicNotes,
    MusicNotesSimple,
    BellRinging,
    WaveSquare,
} from '@phosphor-icons/react'
import { Modal } from '../ui'
import {
    BLS_SOUNDS_BY_CATEGORY,
    BLS_SOUND_CATEGORIES,
} from '../../lib/blsConstants'
import type { BLSSoundDef } from '../../lib/blsConstants'
import { previewSound, unlockAudio } from '../../lib/blsAudio'
import { getSoundIconPath } from '../../lib/blsSoundIcons'
import type { BLSSoundCategory, BLSSoundKey } from '../../types/bls'

interface BLSSoundLibraryModalProps {
    isOpen: boolean
    onClose: () => void
    selectedSound: BLSSoundKey
    onSelectSound: (key: BLSSoundKey) => void
    previewVolume?: number
}

/**
 * Phosphor icon per category — replaces the emoji-circle look so the modal
 * reads as clinical software rather than a kids' app. Each category gets a
 * focused, recognizable glyph from the same icon set used throughout Sirena.
 */
const CATEGORY_ICON: Record<BLSSoundCategory, ElementType> = {
    classics:     MusicNotes,
    drums:        MusicNotesSimple,   // closest stand-in for "drumming" in Phosphor
    bowls:        BellRinging,
    new_classics: WaveSquare,
}

/**
 * Sound Library modal. Collapsible category sections, each with a list of
 * sound rows. Clean Phosphor-icon look (no emojis) for clinical professionalism.
 * Auto-opens the category containing the currently-selected sound; other
 * categories start collapsed.
 */
export default function BLSSoundLibraryModal({
    isOpen,
    onClose,
    selectedSound,
    onSelectSound,
    previewVolume = 0.7,
}: BLSSoundLibraryModalProps) {
    const initialOpen = findCategoryOfSound(selectedSound)
    const [openCategories, setOpenCategories] = useState<Set<BLSSoundCategory>>(
        new Set([initialOpen])
    )

    const toggleCategory = (cat: BLSSoundCategory) => {
        setOpenCategories(prev => {
            const next = new Set(prev)
            if (next.has(cat)) next.delete(cat)
            else next.add(cat)
            return next
        })
    }

    const handleSelect = (sound: BLSSoundDef) => {
        onSelectSound(sound.key)
        unlockAudio()
        previewSound(sound.key, previewVolume)
    }

    const handlePreview = (sound: BLSSoundDef, e: React.MouseEvent) => {
        e.stopPropagation()
        unlockAudio()
        previewSound(sound.key, previewVolume)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Sound Library"
            size="lg"
        >
            <p style={subtitleStyle}>Choose the sound options for your auditory BLS.</p>

            <div style={categoriesContainerStyle}>
                {(Object.keys(BLS_SOUND_CATEGORIES) as BLSSoundCategory[]).map(cat => {
                    const meta = BLS_SOUND_CATEGORIES[cat]
                    const Icon = CATEGORY_ICON[cat]
                    const sounds = BLS_SOUNDS_BY_CATEGORY[cat]
                    const isOpen = openCategories.has(cat)
                    const hasSelectedSound = sounds.some(s => s.key === selectedSound)

                    return (
                        <div key={cat} style={categorySectionStyle(hasSelectedSound)}>
                            <button
                                type="button"
                                onClick={() => toggleCategory(cat)}
                                style={categoryHeaderStyle}
                            >
                                <div style={categoryIconStyle}>
                                    <Icon size={20} weight="duotone" color="#0D9488" />
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <div style={categoryLabelStyle}>{meta.label}</div>
                                    <div style={categoryDescStyle}>{meta.description}</div>
                                </div>
                                {isOpen
                                    ? <CaretUp size={16} weight="bold" color="#64748B" />
                                    : <CaretDown size={16} weight="bold" color="#64748B" />
                                }
                            </button>

                            {isOpen && (
                                <div style={soundListStyle}>
                                    {sounds.map(sound => {
                                        const isSelected = sound.key === selectedSound
                                        return (
                                            <button
                                                key={sound.key}
                                                type="button"
                                                onClick={() => handleSelect(sound)}
                                                style={soundRowStyle(isSelected)}
                                            >
                                                <img
                                                    src={getSoundIconPath(sound.key)}
                                                    alt=""
                                                    width={28}
                                                    height={28}
                                                    style={soundIconStyle}
                                                    loading="lazy"
                                                />
                                                <span style={soundLabelStyle(isSelected)}>
                                                    {sound.label}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={e => handlePreview(sound, e)}
                                                    style={previewBtnStyle}
                                                    title="Preview sound"
                                                    aria-label={`Preview ${sound.label}`}
                                                >
                                                    <Play size={13} weight="fill" color="#FFFFFF" />
                                                </button>
                                                <span style={selectIndicatorStyle(isSelected)}>
                                                    {isSelected && <Check size={12} weight="bold" color="#FFFFFF" />}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </Modal>
    )
}

function findCategoryOfSound(key: BLSSoundKey): BLSSoundCategory {
    for (const cat of Object.keys(BLS_SOUNDS_BY_CATEGORY) as BLSSoundCategory[]) {
        if (BLS_SOUNDS_BY_CATEGORY[cat].some(s => s.key === key)) return cat
    }
    return 'classics'
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const subtitleStyle: CSSProperties = {
    margin: '0 0 20px',
    fontSize: 13,
    color: '#64748B',
}

const categoriesContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,                  // breathing room between section cards
    maxHeight: '60vh',
    overflowY: 'auto',
    paddingRight: 6,
    paddingBottom: 4,
}

const categorySectionStyle = (containsSelected: boolean): CSSProperties => ({
    border: containsSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
    borderRadius: 12,
    // No overflow:hidden — dividers render flush with the section border.
    background: '#FFFFFF',
    boxShadow: containsSelected ? '0 0 0 3px rgba(13,148,136,0.08)' : 'none',
})

const categoryHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: '16px 18px',     // 18px — felt cramped at 14
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    borderRadius: 12,         // matches section so the hover surface is clean
}

const categoryIconStyle: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(13,148,136,0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
}

const categoryLabelStyle: CSSProperties = {
    fontSize: 15,
    fontWeight: 700,
    color: '#0F172A',
    lineHeight: 1.2,
}

const categoryDescStyle: CSSProperties = {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 1.3,
}

const soundListStyle: CSSProperties = {
    borderTop: '1px solid #F1F5F9',
    padding: '6px 0',         // breathing room inside the list block
}

const soundRowStyle = (selected: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '12px 20px',     // wider horizontal padding — feels less crowded
    background: selected ? 'rgba(13,148,136,0.06)' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
})

const soundIconStyle: CSSProperties = {
    width: 28,
    height: 28,
    flexShrink: 0,
    display: 'block',
}

const soundLabelStyle = (selected: boolean): CSSProperties => ({
    flex: 1,
    fontSize: 14,
    fontWeight: selected ? 700 : 600,
    color: selected ? '#0F766E' : '#1F2937',
    textAlign: 'left',
})

const previewBtnStyle: CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: '#0D9488',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
}

const selectIndicatorStyle = (selected: boolean): CSSProperties => ({
    width: 22,
    height: 22,
    borderRadius: 6,
    border: selected ? '1.5px solid #0D9488' : '1.5px solid #CBD5E1',
    background: selected ? '#0D9488' : '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
})
