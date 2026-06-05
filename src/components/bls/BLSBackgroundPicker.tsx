import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import toast from 'react-hot-toast'
import { Trash, Upload } from '@phosphor-icons/react'
import { Modal } from '../ui'
import {
    BLS_BACKGROUNDS_BY_CATEGORY,
    BLS_BG_CATEGORY_LABEL,
    backgroundId,
    getUploadedBackgrounds,
    recordUploadedBackground,
    deleteUploadedBackground,
} from '../../lib/blsBackgrounds'
import type {
    BLSBackground,
    BLSUploadedBackground,
} from '../../lib/blsBackgrounds'

type PickerTab = 'soothing' | 'uploads'

interface BLSBackgroundPickerProps {
    isOpen: boolean
    onClose: () => void
    /** Currently-selected bundled background id (`{category}/{slug}`), if any. */
    selectedBundledId: string | null
    /** Currently-selected uploaded id, if any. Mutually exclusive with the above. */
    selectedUploadedId: string | null
    onSelectBundled: (background: BLSBackground) => void
    onSelectUploaded: (upload: BLSUploadedBackground) => void
}

/**
 * Choose-a-Background-Image modal. Two tabs:
 *  - Soothing: bundled CC0 nature backgrounds (12 included for v1)
 *  - Uploads: user-supplied images, persisted in localStorage as data URLs
 *
 * Why this UX (vs theirs):
 *  - We deliberately skip "Triggering" — clinically loaded, choice of image
 *    is per-client. Clinicians upload their own targets via the Uploads tab.
 *  - We skip "Moving" — videos are heavy + complex, and bilateralstimulation.io
 *    locks them behind Pro anyway.
 *
 * Storage:
 *  - Uploaded files are downscaled to ~1200x800 before saving so they don't
 *    blow the localStorage 5MB-ish quota.
 *  - Each upload is stored as a JPEG data URL.
 *  - Max 12 stored uploads (oldest dropped) — see MAX_UPLOADS in
 *    lib/blsBackgrounds.ts.
 */
export default function BLSBackgroundPicker({
    isOpen,
    onClose,
    selectedBundledId,
    selectedUploadedId,
    onSelectBundled,
    onSelectUploaded,
}: BLSBackgroundPickerProps) {
    const initialTab: PickerTab = selectedUploadedId ? 'uploads' : 'soothing'
    const [activeTab, setActiveTab] = useState<PickerTab>(initialTab)
    const [uploads, setUploads] = useState<BLSUploadedBackground[]>(() => getUploadedBackgrounds())
    const [isProcessing, setIsProcessing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Reload uploads list when modal opens (other tabs might have added some
    // while this one was closed — defensive but cheap).
    useEffect(() => {
        if (isOpen) setUploads(getUploadedBackgrounds())
    }, [isOpen])

    const handlePickBundled = (bg: BLSBackground) => {
        onSelectBundled(bg)
        onClose()
    }

    const handlePickUpload = (upload: BLSUploadedBackground) => {
        onSelectUploaded(upload)
        onClose()
    }

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Please pick an image file')
            return
        }
        if (file.size > 12 * 1024 * 1024) {
            toast.error('Image is too large (max 12 MB before resizing)')
            return
        }

        setIsProcessing(true)
        try {
            const dataUrl = await resizeImageToJpegDataUrl(file, 1200, 800, 0.85)
            const record = recordUploadedBackground({
                label: cleanFileName(file.name),
                dataUrl,
            })
            if (!record) {
                toast.error('Could not save — your browser storage may be full')
                return
            }
            setUploads(getUploadedBackgrounds())
            toast.success('Background uploaded')
        } catch (err) {
            console.error('[BLS upload] failed', err)
            toast.error('Could not process this image')
        } finally {
            setIsProcessing(false)
            // Clear so the same file can be re-picked if the user wants
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDeleteUpload = (id: string) => {
        deleteUploadedBackground(id)
        setUploads(getUploadedBackgrounds())
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Choose a Background Image"
            size="lg"
        >
            <div style={tabRowStyle}>
                <TabButton active={activeTab === 'soothing'} onClick={() => setActiveTab('soothing')}>
                    Soothing
                </TabButton>
                <TabButton active={activeTab === 'uploads'} onClick={() => setActiveTab('uploads')}>
                    Uploads {uploads.length > 0 && <span style={countBadgeStyle}>{uploads.length}</span>}
                </TabButton>
            </div>

            {activeTab === 'soothing' && (
                <div style={gridStyle}>
                    {BLS_BACKGROUNDS_BY_CATEGORY.soothing.map(bg => {
                        const id = backgroundId(bg)
                        const isSelected = id === selectedBundledId
                        return (
                            <button
                                key={bg.slug}
                                type="button"
                                onClick={() => handlePickBundled(bg)}
                                style={thumbStyle(isSelected)}
                                aria-label={bg.label}
                                aria-pressed={isSelected}
                                title={bg.label}
                            >
                                <img
                                    src={bg.path}
                                    alt={bg.label}
                                    loading="lazy"
                                    style={thumbImgStyle}
                                />
                            </button>
                        )
                    })}
                </div>
            )}

            {activeTab === 'uploads' && (
                <div>
                    <div style={uploadHeaderRowStyle}>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                            {uploads.length}/12 images saved locally on this device.
                            <br />
                            Images are resized to 1200×800 before saving.
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing || uploads.length >= 12}
                            style={uploadBtnStyle}
                            title={uploads.length >= 12
                                ? 'Delete an upload before adding a new one'
                                : 'Pick an image from your device'}
                        >
                            <Upload size={14} weight="bold" />
                            {isProcessing ? 'Processing…' : 'Upload image'}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {uploads.length === 0
                        ? <EmptyUploads />
                        : (
                            <div style={gridStyle}>
                                {uploads.map(upload => {
                                    const isSelected = upload.id === selectedUploadedId
                                    return (
                                        <div key={upload.id} style={{ position: 'relative' }}>
                                            <button
                                                type="button"
                                                onClick={() => handlePickUpload(upload)}
                                                style={thumbStyle(isSelected)}
                                                aria-label={upload.label}
                                                aria-pressed={isSelected}
                                                title={upload.label}
                                            >
                                                <img
                                                    src={upload.dataUrl}
                                                    alt={upload.label}
                                                    style={thumbImgStyle}
                                                />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteUpload(upload.id)}
                                                style={deleteOverlayStyle}
                                                aria-label="Delete upload"
                                                title="Delete upload"
                                            >
                                                <Trash size={12} weight="bold" />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    }
                </div>
            )}
        </Modal>
    )
}

// Silence unused warning for the category-label export — kept for parity with
// the illustration picker and for future multi-category uploads (e.g.,
// 'triggering' if Dr. Joe ever asks for it).
void BLS_BG_CATEGORY_LABEL

// ─── Subcomponents ──────────────────────────────────────────────────────────

function TabButton({
    active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" onClick={onClick} style={tabButtonStyle(active)}>
            {children}
        </button>
    )
}

function EmptyUploads() {
    return (
        <div style={emptyStyle}>
            <Upload size={36} weight="duotone" style={{ color: '#0D9488' }} />
            <div style={emptyTitleStyle}>No uploads yet</div>
            <div style={emptyTextStyle}>
                Upload your own clinical background images for EMDR work.
                They&rsquo;re saved on this device and synced to the client view
                during a session.
            </div>
        </div>
    )
}

// ─── Image processing helper ────────────────────────────────────────────────

/**
 * Resize an arbitrary image file to fit within maxW × maxH (preserving aspect
 * ratio), encode as JPEG at the given quality, and return a data URL. Used so
 * a 12MP iPhone photo doesn't end up blowing the localStorage quota.
 */
async function resizeImageToJpegDataUrl(
    file: File,
    maxW: number,
    maxH: number,
    quality: number,
): Promise<string> {
    const fileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Could not read file'))
        reader.readAsDataURL(file)
    })

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image()
        im.onload = () => resolve(im)
        im.onerror = () => reject(new Error('Could not decode image'))
        im.src = fileDataUrl
    })

    const scale = Math.min(1, maxW / img.width, maxH / img.height)
    const targetW = Math.round(img.width * scale)
    const targetH = Math.round(img.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(img, 0, 0, targetW, targetH)

    return canvas.toDataURL('image/jpeg', quality)
}

function cleanFileName(name: string): string {
    return name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 40) || 'Untitled'
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const tabRowStyle: CSSProperties = {
    display: 'flex',
    gap: 6,
    marginBottom: 16,
    borderBottom: '1px solid #E2E8F0',
}

const tabButtonStyle = (active: boolean): CSSProperties => ({
    padding: '10px 16px',
    border: 'none',
    background: 'transparent',
    color: active ? '#0F766E' : '#64748B',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    borderBottom: active ? '2px solid #0D9488' : '2px solid transparent',
    marginBottom: -1,
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
})

const countBadgeStyle: CSSProperties = {
    background: '#0D9488',
    color: '#FFFFFF',
    padding: '1px 6px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
}

const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12,
}

const thumbStyle = (selected: boolean): CSSProperties => ({
    width: '100%',
    aspectRatio: '16 / 9',
    border: selected ? '2.5px solid #0D9488' : '1px solid #E2E8F0',
    background: '#F8FAFC',
    borderRadius: 10,
    cursor: 'pointer',
    overflow: 'hidden',
    padding: 0,
    boxShadow: selected ? '0 0 0 3px rgba(13,148,136,0.18)' : 'none',
    transition: 'all 0.15s',
})

const thumbImgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
}

const deleteOverlayStyle: CSSProperties = {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'rgba(15,23,42,0.7)',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}

const uploadHeaderRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 0 18px',
    flexWrap: 'wrap',
}

const uploadBtnStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    background: '#0D9488',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
}

const emptyStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '40px 20px',
    textAlign: 'center',
}

const emptyTitleStyle: CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    color: '#0F172A',
}

const emptyTextStyle: CSSProperties = {
    fontSize: 13,
    color: '#64748B',
    maxWidth: 360,
    lineHeight: 1.5,
}
