/**
 * Manifest of BLS background images bundled with the frontend.
 *
 * Source: Lorem Picsum (picsum.photos), redistributing Unsplash photos under
 * the Unsplash License. Free for commercial use, no attribution required.
 *
 * The actual JPEG files live in public/bls-backgrounds/{category}/{slug}.jpg
 * and are served by Vercel as static assets.
 *
 * Keep this file in sync with scripts/download-bls-backgrounds.mjs — adding a
 * background means adding it to BOTH places, then re-running the download.
 *
 * On the Uploads side: user-uploaded backgrounds are NOT in this manifest.
 * They live in localStorage (or backend storage in a future phase) and are
 * resolved via config.backgroundImageDataUrl.
 */

export type BLSBackgroundCategory = 'soothing'

export interface BLSBackground {
    category: BLSBackgroundCategory
    slug: string         // unique within the category
    label: string        // user-facing label
    path: string         // resolved public path
}

const make = (category: BLSBackgroundCategory, slug: string, label: string): BLSBackground => ({
    category,
    slug,
    label,
    path: `/bls-backgrounds/${category}/${slug}.jpg`,
})

const SOOTHING: BLSBackground[] = [
    make('soothing', 'misty-woods',         'Misty woods'),
    make('soothing', 'still-lake',          'Still lake'),
    make('soothing', 'mountain-mist',       'Mountain mist'),
    make('soothing', 'mountain-reflection', 'Mountain reflection'),
    make('soothing', 'forest-fog',          'Forest fog'),
    make('soothing', 'snowy-peak',          'Snowy peak'),
    make('soothing', 'mountain-range',      'Mountain range'),
    make('soothing', 'foggy-lake',          'Foggy lake'),
    make('soothing', 'forest-in-fog',       'Forest in fog'),
    make('soothing', 'high-mountains',      'High mountains'),
    make('soothing', 'lake-and-mountains',  'Lake & mountains'),
    make('soothing', 'open-field',          'Open field'),
]

export const BLS_BACKGROUNDS_BY_CATEGORY: Record<BLSBackgroundCategory, BLSBackground[]> = {
    soothing: SOOTHING,
}

export const BLS_ALL_BACKGROUNDS: BLSBackground[] = [...SOOTHING]

const BY_ID = new Map<string, BLSBackground>(
    BLS_ALL_BACKGROUNDS.map(b => [`${b.category}/${b.slug}`, b])
)

/**
 * Look up a bundled background by its persisted id (`{category}/{slug}`).
 * Returns null if the id is unknown — uploads use a different lookup
 * (backgroundImageDataUrl on the config), so this only handles bundled.
 */
export function findBLSBackground(id: string | null | undefined): BLSBackground | null {
    if (!id) return null
    return BY_ID.get(id) ?? null
}

export function backgroundId(bg: BLSBackground): string {
    return `${bg.category}/${bg.slug}`
}

export const BLS_BG_CATEGORY_LABEL: Record<BLSBackgroundCategory, string> = {
    soothing: 'Soothing',
}

// ─── User-uploaded backgrounds (localStorage) ───────────────────────────────
//
// For v1 the upload path stores resized data-URLs in localStorage. Same shape
// as bundled but with a data: URL instead of a static path. When the backend
// lands (Vercel Blob or S3), these become public URLs and survive across
// devices.

const UPLOAD_STORAGE_KEY = 'bls_uploaded_backgrounds'
const MAX_UPLOADS = 12  // bounded so we don't blow the localStorage quota

export interface BLSUploadedBackground {
    id: string            // synthesized at upload time
    label: string         // file name (cleaned)
    dataUrl: string       // data:image/jpeg;base64,...
    createdAt: number     // ms epoch
}

export function getUploadedBackgrounds(): BLSUploadedBackground[] {
    try {
        const raw = localStorage.getItem(UPLOAD_STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter(isValidUpload).sort((a, b) => b.createdAt - a.createdAt)
    } catch {
        return []
    }
}

export function recordUploadedBackground(upload: Omit<BLSUploadedBackground, 'id' | 'createdAt'>): BLSUploadedBackground | null {
    const record: BLSUploadedBackground = {
        ...upload,
        id: `upload-${Math.random().toString(36).slice(2, 10)}`,
        createdAt: Date.now(),
    }
    try {
        const existing = getUploadedBackgrounds()
        const next = [record, ...existing].slice(0, MAX_UPLOADS)
        localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(next))
        return record
    } catch {
        // Storage quota — most likely the data URL is too large, or LS has
        // been disabled. Silently degrade; the upload simply doesn't persist.
        return null
    }
}

export function deleteUploadedBackground(id: string): void {
    try {
        const filtered = getUploadedBackgrounds().filter(u => u.id !== id)
        localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(filtered))
    } catch { /* ignore */ }
}

function isValidUpload(r: unknown): r is BLSUploadedBackground {
    if (!r || typeof r !== 'object') return false
    const o = r as Record<string, unknown>
    return typeof o.id === 'string'
        && typeof o.label === 'string'
        && typeof o.dataUrl === 'string'
        && o.dataUrl.startsWith('data:image/')
        && typeof o.createdAt === 'number'
}
