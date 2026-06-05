import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Modal } from '../ui'
import {
    BLS_ILLUSTRATIONS_BY_CATEGORY,
    BLS_CATEGORY_LABEL,
    illustrationId,
} from '../../lib/blsIllustrations'
import type {
    BLSIllustration,
    BLSIllustrationCategory,
} from '../../lib/blsIllustrations'

interface BLSIllustrationPickerProps {
    isOpen: boolean
    onClose: () => void
    selectedId: string | null
    onSelect: (illustration: BLSIllustration) => void
}

/**
 * Choose Illustration modal. Three-tab layout (Animals / Emojis / Sports)
 * with a sidebar on the left and a grid of SVG previews on the right.
 *
 * Matches the bilateralstimulation.io look (left categories, right grid)
 * but uses our manifest as the data source. Each preview is a real <img>
 * pointing at the SVG in public/bls-illustrations/ — browsers cache them
 * automatically so reopening the modal is instant after first paint.
 */
export default function BLSIllustrationPicker({
    isOpen,
    onClose,
    selectedId,
    onSelect,
}: BLSIllustrationPickerProps) {
    // Initial tab — open on the category the current selection lives in,
    // or default to animals if nothing is selected.
    const initialCategory: BLSIllustrationCategory =
        selectedId?.startsWith('emdr/') ? 'emdr'
        : selectedId?.startsWith('emojis/') ? 'emojis'
        : selectedId?.startsWith('sports/') ? 'sports'
        : 'animals'

    const [activeCategory, setActiveCategory] = useState<BLSIllustrationCategory>(initialCategory)

    const handlePick = (illustration: BLSIllustration) => {
        onSelect(illustration)
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Choose Illustration"
            size="lg"
        >
            <div style={containerStyle}>
                {/* Category sidebar */}
                <div style={sidebarStyle}>
                    {(Object.keys(BLS_ILLUSTRATIONS_BY_CATEGORY) as BLSIllustrationCategory[]).map(cat => {
                        const isActive = cat === activeCategory
                        const previewIllustration = BLS_ILLUSTRATIONS_BY_CATEGORY[cat][0]
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setActiveCategory(cat)}
                                style={sidebarItemStyle(isActive)}
                            >
                                <img
                                    src={previewIllustration.path}
                                    alt=""
                                    width={28}
                                    height={28}
                                    style={{ flexShrink: 0 }}
                                />
                                <span>{BLS_CATEGORY_LABEL[cat]}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Grid of illustrations */}
                <div style={gridContainerStyle}>
                    <div style={categoryHeaderStyle}>
                        {BLS_CATEGORY_LABEL[activeCategory]}
                    </div>
                    <div style={gridStyle}>
                        {BLS_ILLUSTRATIONS_BY_CATEGORY[activeCategory].map(item => {
                            const itemId = illustrationId(item)
                            const isSelected = itemId === selectedId
                            return (
                                <button
                                    key={item.slug}
                                    type="button"
                                    onClick={() => handlePick(item)}
                                    style={gridItemStyle(isSelected)}
                                    title={item.label}
                                    aria-label={item.label}
                                    aria-pressed={isSelected}
                                >
                                    <img
                                        src={item.path}
                                        alt={item.label}
                                        width={48}
                                        height={48}
                                        loading="lazy"
                                        style={{ display: 'block' }}
                                    />
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const containerStyle: CSSProperties = {
    display: 'flex',
    gap: 16,
    minHeight: 360,
}

const sidebarStyle: CSSProperties = {
    width: 200,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flexShrink: 0,
}

const sidebarItemStyle = (active: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    border: active ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
    background: active ? 'rgba(13,148,136,0.06)' : '#FFFFFF',
    color: active ? '#0F766E' : '#1F2937',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'left',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
})

const gridContainerStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minWidth: 0,
}

const categoryHeaderStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
}

const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
    gap: 8,
}

const gridItemStyle = (selected: boolean): CSSProperties => ({
    width: '100%',
    height: 64,
    border: selected ? '2px solid #0D9488' : '1px solid #E2E8F0',
    background: selected ? 'rgba(13,148,136,0.08)' : '#FFFFFF',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    padding: 6,
    boxShadow: selected ? '0 0 0 3px rgba(13,148,136,0.18)' : 'none',
})
