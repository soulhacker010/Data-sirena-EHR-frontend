import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Eye, Image as ImageIcon, Lock, PaintBrush } from '@phosphor-icons/react'
import {
    BLS_COLORS,
    BLS_BACKGROUNDS,
    BLS_DIRECTIONS,
    BLS_POSITIONS,
} from '../../lib/blsConstants'
import {
    findBLSIllustration,
    DEFAULT_ILLUSTRATION_ID,
    illustrationId as makeIllustrationId,
} from '../../lib/blsIllustrations'
import type { BLSIllustration } from '../../lib/blsIllustrations'
import BLSColorPickerPopover from './BLSColorPickerPopover'
import BLSIllustrationPicker from './BLSIllustrationPicker'
import BLSBackgroundPicker from './BLSBackgroundPicker'
import type { BLSBackground, BLSUploadedBackground } from '../../lib/blsBackgrounds'
import { findBLSBackground } from '../../lib/blsBackgrounds'
import type {
    BLSColorKey,
    BLSBackgroundKey,
    BLSDirectionKey,
    BLSPositionKey,
    BLSStimulusKey,
} from '../../types/bls'

interface BLSVisualControlsProps {
    color: BLSColorKey
    onColorChange: (key: BLSColorKey) => void

    /** Free-form hex used when color === 'custom'. Always present. */
    customColorHex: string
    /** Called when the picker emits a new hex. Also flips color → 'custom'. */
    onCustomColorChange: (hex: string) => void

    background: BLSBackgroundKey
    onBackgroundChange: (key: BLSBackgroundKey) => void

    customBackgroundHex: string
    onCustomBackgroundChange: (hex: string) => void

    direction: BLSDirectionKey
    onDirectionChange: (key: BLSDirectionKey) => void

    position: BLSPositionKey
    onPositionChange: (key: BLSPositionKey) => void

    stimulus: BLSStimulusKey
    /** Persisted illustration id when stimulus === 'illustration'. */
    illustrationId?: string
    /** Called when the user picks an illustration from the modal. The handler
     *  should flip stimulus → 'illustration' AND set illustrationId. */
    onIllustrationSelect: (illustration: BLSIllustration) => void

    /** Bundled background image id (`{category}/{slug}`), if any. */
    backgroundImageId?: string | null
    /** Uploaded background data URL (for distinguishing the upload case from
     *  the bundled case in the picker). */
    backgroundImageDataUrl?: string | null
    /** Called when the user picks a bundled background. Should flip
     *  background → 'image' AND set backgroundImageId, clear data URL. */
    onBackgroundImageSelect: (background: BLSBackground) => void
    /** Called when the user picks an uploaded background. Should flip
     *  background → 'image' AND set backgroundImageDataUrl, clear image id. */
    onBackgroundUploadSelect: (upload: BLSUploadedBackground) => void

    visualEnabled: boolean
    onVisualEnabledChange: (enabled: boolean) => void
}

export default function BLSVisualControls(props: BLSVisualControlsProps) {
    const {
        color, onColorChange,
        customColorHex, onCustomColorChange,
        background, onBackgroundChange,
        customBackgroundHex, onCustomBackgroundChange,
        direction, onDirectionChange,
        position, onPositionChange,
        stimulus,
        illustrationId,
        onIllustrationSelect,
        backgroundImageId,
        backgroundImageDataUrl,
        onBackgroundImageSelect,
        onBackgroundUploadSelect,
        visualEnabled, onVisualEnabledChange,
    } = props

    // Which custom-color picker (if any) is currently open. Mutually
    // exclusive — opening one auto-closes the other.
    const [openPicker, setOpenPicker] = useState<'color' | 'background' | null>(null)
    const colorAnchorRef = useRef<HTMLButtonElement>(null)
    const bgAnchorRef = useRef<HTMLButtonElement>(null)

    // Illustration picker modal
    const [showIllustrationPicker, setShowIllustrationPicker] = useState(false)
    // Thumbnail shown on the illustration button — falls back to the default
    // lion so the button always looks meaningful even before the user has
    // ever picked anything.
    const currentIllustration = findBLSIllustration(illustrationId ?? DEFAULT_ILLUSTRATION_ID)
        ?? findBLSIllustration(DEFAULT_ILLUSTRATION_ID)
    const isIllustrationActive = stimulus === 'illustration'

    // Background-image picker modal
    const [showBackgroundPicker, setShowBackgroundPicker] = useState(false)
    const isBackgroundImageActive = background === 'image'
    // The button's thumb shows either the user's uploaded image, the bundled
    // image they picked, or a generic landscape icon when nothing's chosen.
    const backgroundButtonThumb = backgroundImageDataUrl
        ? backgroundImageDataUrl
        : (backgroundImageId ? findBLSBackground(backgroundImageId)?.path : null)

    return (
        <div style={containerStyle}>
            <div style={sectionHeaderRowStyle}>
                <div style={sectionHeaderStyle}>
                    <Eye size={18} weight="duotone" />
                    <span>Visual</span>
                </div>
                <ToggleSwitch
                    checked={visualEnabled}
                    onChange={onVisualEnabledChange}
                    label="Visual enabled"
                />
            </div>

            <div style={{ ...subSectionStyle, opacity: visualEnabled ? 1 : 0.4 }}>
                {/* Color */}
                <div style={labelStyle}>BLS Color</div>
                <div style={swatchRowStyle}>
                    {BLS_COLORS.map(c => (
                        <button
                            key={c.key}
                            type="button"
                            onClick={() => onColorChange(c.key)}
                            disabled={!visualEnabled}
                            title={c.label}
                            aria-label={`Color: ${c.label}`}
                            aria-pressed={color === c.key}
                            style={swatchStyle(color === c.key, c.hex)}
                        />
                    ))}
                    {/* Custom color swatch — opens HSL picker popover. The
                        anchor wrapper has position:relative so the popover
                        positions itself relative to the swatch button. */}
                    <div style={{ position: 'relative' }}>
                        <button
                            ref={colorAnchorRef}
                            type="button"
                            onClick={() => {
                                onColorChange('custom')
                                setOpenPicker(openPicker === 'color' ? null : 'color')
                            }}
                            disabled={!visualEnabled}
                            title="Custom color"
                            aria-label="Custom color"
                            aria-pressed={color === 'custom' && stimulus !== 'illustration'}
                            style={customSwatchStyle(color === 'custom' && stimulus !== 'illustration', customColorHex)}
                        >
                            <PaintBrush
                                size={14}
                                weight="fill"
                                color={isLightHex(customColorHex) ? '#1F2937' : '#FFFFFF'}
                            />
                        </button>
                        {openPicker === 'color' && (
                            <BLSColorPickerPopover
                                value={customColorHex}
                                onChange={onCustomColorChange}
                                onClose={() => setOpenPicker(null)}
                                anchorRef={colorAnchorRef}
                            />
                        )}
                    </div>

                    {/* Illustration swatch — opens the Choose Illustration modal.
                        When an illustration is the active stimulus, this swatch
                        gets the teal selection ring. The color swatches deselect
                        visually so the picker state is unambiguous. */}
                    <button
                        type="button"
                        onClick={() => setShowIllustrationPicker(true)}
                        disabled={!visualEnabled}
                        title="Choose illustration"
                        aria-label="Choose illustration"
                        aria-pressed={isIllustrationActive}
                        style={illustrationSwatchStyle(isIllustrationActive)}
                    >
                        {currentIllustration && (
                            <img
                                src={currentIllustration.path}
                                alt=""
                                width={26}
                                height={26}
                                style={{ display: 'block' }}
                            />
                        )}
                    </button>
                </div>

                {/* Background */}
                <div style={{ ...labelStyle, marginTop: 16 }}>Background</div>
                <div style={swatchRowStyle}>
                    {BLS_BACKGROUNDS.map(b => (
                        <button
                            key={b.key}
                            type="button"
                            onClick={() => onBackgroundChange(b.key)}
                            disabled={!visualEnabled}
                            title={b.label}
                            aria-label={`Background: ${b.label}`}
                            aria-pressed={background === b.key}
                            style={swatchStyle(background === b.key, b.hex, true)}
                        />
                    ))}
                    {/* Custom background swatch */}
                    <div style={{ position: 'relative' }}>
                        <button
                            ref={bgAnchorRef}
                            type="button"
                            onClick={() => {
                                onBackgroundChange('custom')
                                setOpenPicker(openPicker === 'background' ? null : 'background')
                            }}
                            disabled={!visualEnabled}
                            title="Custom background"
                            aria-label="Custom background"
                            aria-pressed={background === 'custom'}
                            style={customSwatchStyle(background === 'custom', customBackgroundHex)}
                        >
                            <PaintBrush
                                size={14}
                                weight="fill"
                                color={isLightHex(customBackgroundHex) ? '#1F2937' : '#FFFFFF'}
                            />
                        </button>
                        {openPicker === 'background' && (
                            <BLSColorPickerPopover
                                value={customBackgroundHex}
                                onChange={onCustomBackgroundChange}
                                onClose={() => setOpenPicker(null)}
                                anchorRef={bgAnchorRef}
                            />
                        )}
                    </div>

                    {/* Background-image swatch — opens "Choose a Background
                        Image" modal. Shows a thumbnail of the picked image, or
                        a generic landscape icon when nothing has been picked. */}
                    <button
                        type="button"
                        onClick={() => setShowBackgroundPicker(true)}
                        disabled={!visualEnabled}
                        title="Background image"
                        aria-label="Background image"
                        aria-pressed={isBackgroundImageActive}
                        style={backgroundImageSwatchStyle(isBackgroundImageActive)}
                    >
                        {backgroundButtonThumb
                            ? <img src={backgroundButtonThumb} alt="" style={bgThumbInsideButtonStyle} />
                            : <ImageIcon size={16} weight="duotone" color="#64748B" />
                        }
                    </button>
                </div>

                {/* Direction */}
                <div style={{ ...labelStyle, marginTop: 16 }}>Direction</div>
                <div style={iconRowStyle}>
                    {BLS_DIRECTIONS.map(d => {
                        const selected = direction === d.key
                        return (
                            <button
                                key={d.key}
                                type="button"
                                onClick={() => !d.locked && onDirectionChange(d.key)}
                                disabled={!visualEnabled || d.locked}
                                title={d.locked ? `${d.label} — available in a future update` : d.label}
                                aria-label={d.label}
                                aria-pressed={selected}
                                style={iconTileStyle(selected, d.locked)}
                            >
                                <span style={{ fontSize: 18, lineHeight: 1 }}>{d.symbol}</span>
                                {d.locked && (
                                    <Lock
                                        size={10}
                                        weight="fill"
                                        style={{ position: 'absolute', top: 3, right: 3, color: '#94A3B8' }}
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Position */}
                <div style={{ ...labelStyle, marginTop: 16 }}>Position</div>
                <div style={iconRowStyle}>
                    {BLS_POSITIONS.map(p => {
                        const selected = position === p.key
                        return (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => onPositionChange(p.key)}
                                disabled={!visualEnabled}
                                title={p.label}
                                aria-label={p.label}
                                aria-pressed={selected}
                                style={iconTileStyle(selected, false)}
                            >
                                <span style={{ fontSize: 16, lineHeight: 1 }}>{p.symbol}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Note: the previous Dot / Emoji / Animal "Kids mode" toggle
                    has been replaced by the Illustration swatch in the BLS
                    Color row above. Picking any color flips back to a colored
                    dot; picking an illustration flips to illustration mode. */}
            </div>

            {/* Choose Illustration modal — mounted at the root of this section
                so it overlays the whole page. The picker is uncontrolled with
                respect to which category opens first; it picks the right tab
                based on the current selection. */}
            <BLSIllustrationPicker
                isOpen={showIllustrationPicker}
                onClose={() => setShowIllustrationPicker(false)}
                selectedId={illustrationId ?? null}
                onSelect={(illustration) => {
                    onIllustrationSelect(illustration)
                    setShowIllustrationPicker(false)
                }}
            />

            {/* Choose Background Image modal — two tabs (Soothing + Uploads).
                Picking a bundled OR uploaded image flips background → 'image'
                and stamps the right field via the dedicated callbacks. */}
            <BLSBackgroundPicker
                isOpen={showBackgroundPicker}
                onClose={() => setShowBackgroundPicker(false)}
                selectedBundledId={isBackgroundImageActive && !backgroundImageDataUrl ? (backgroundImageId ?? null) : null}
                selectedUploadedId={isBackgroundImageActive && backgroundImageDataUrl ? backgroundImageDataUrl.slice(0, 32) : null}
                onSelectBundled={(bg) => {
                    onBackgroundImageSelect(bg)
                    setShowBackgroundPicker(false)
                }}
                onSelectUploaded={(upload) => {
                    onBackgroundUploadSelect(upload)
                    setShowBackgroundPicker(false)
                }}
            />
        </div>
    )
}

// Keep the helper exported in case other components need to compose ids
// without importing from the manifest module directly.
export const composeBLSIllustrationId = makeIllustrationId

// ─── Reusable toggle (duplicated locally to keep this file self-contained) ──

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

const swatchRowStyle: CSSProperties = {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
}

const swatchStyle = (selected: boolean, hex: string, withBorder = false): CSSProperties => ({
    width: 38,
    height: 38,
    borderRadius: 8,
    background: hex,
    border: selected ? '2.5px solid #0D9488' : withBorder ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: selected ? '0 0 0 3px rgba(13,148,136,0.18)' : 'none',
    padding: 0,
})

/** Custom-color swatch — shows the current custom hex and a paint-brush icon
 *  overlay. Selection ring matches the other swatches when active. */
const customSwatchStyle = (selected: boolean, hex: string): CSSProperties => ({
    width: 38,
    height: 38,
    borderRadius: 8,
    background: hex,
    border: selected ? '2.5px solid #0D9488' : '1px solid #CBD5E1',
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: selected ? '0 0 0 3px rgba(13,148,136,0.18)' : 'none',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
})

/** True if the given hex is closer to white than to black (so dark text /
 *  icons stay readable on top of it). Uses standard relative-luminance
 *  approximation. */
function isLightHex(hex: string): boolean {
    const m = hex.match(/^#?([0-9a-f]{6})$/i)
    if (!m) return true
    const r = parseInt(m[1].slice(0, 2), 16)
    const g = parseInt(m[1].slice(2, 4), 16)
    const b = parseInt(m[1].slice(4, 6), 16)
    // Rec. 601 luma — simple, fast, good enough for icon-on-color decisions
    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    return luma > 160
}

const iconRowStyle: CSSProperties = {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
}

const iconTileStyle = (selected: boolean, locked: boolean): CSSProperties => ({
    width: 38,
    height: 38,
    borderRadius: 8,
    border: selected ? '2px solid #0D9488' : '1px solid #E2E8F0',
    background: locked ? '#F8FAFC' : selected ? 'rgba(13,148,136,0.08)' : '#FFFFFF',
    color: locked ? '#94A3B8' : selected ? '#0F766E' : '#1F2937',
    cursor: locked ? 'not-allowed' : 'pointer',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    padding: 0,
})

/** Illustration swatch — shows the currently-selected illustration's
 *  thumbnail. Picks up the teal selection ring when stimulus is
 *  'illustration'. Same footprint as the other swatches so the row stays
 *  visually aligned. */
const illustrationSwatchStyle = (selected: boolean): CSSProperties => ({
    width: 38,
    height: 38,
    borderRadius: 8,
    background: '#FFFFFF',
    border: selected ? '2.5px solid #0D9488' : '1px solid #CBD5E1',
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: selected ? '0 0 0 3px rgba(13,148,136,0.18)' : 'none',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
})

/** Background-image swatch — same footprint, shows the picked image's
 *  thumbnail (or a generic landscape icon when nothing's picked). */
const backgroundImageSwatchStyle = (selected: boolean): CSSProperties => ({
    width: 38,
    height: 38,
    borderRadius: 8,
    background: '#F8FAFC',
    border: selected ? '2.5px solid #0D9488' : '1px solid #CBD5E1',
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: selected ? '0 0 0 3px rgba(13,148,136,0.18)' : 'none',
    padding: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
})

const bgThumbInsideButtonStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
}
