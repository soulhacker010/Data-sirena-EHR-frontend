#!/usr/bin/env node
/**
 * Download curated calm background photos for BLS sessions.
 *
 * Run with: npm run download:bls-backgrounds
 *
 * Saves to: public/bls-backgrounds/soothing/{slug}.jpg
 *
 * Source: Lorem Picsum (picsum.photos) — a free public service that serves
 * curated Unsplash nature photos via stable IDs. Same Unsplash License (free
 * for commercial use, no attribution required), no API key needed.
 *
 * Why bundle locally instead of linking to picsum at runtime:
 *  - Zero external dependency from the client view (HIPAA-friendly: no
 *    third-party requests from patient devices during sessions)
 *  - Vercel CDN serves them as fast as picsum would
 *  - Stable references — if picsum changes their catalog, our images don't
 *    disappear mid-session
 *  - Deterministic deploys (every commit carries the exact image set)
 *
 * License: Unsplash License (Lorem Picsum redistributes Unsplash photos
 * under the same terms). Free for commercial use, no attribution required.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(PROJECT_ROOT, 'public', 'bls-backgrounds')

const PICSUM = 'https://picsum.photos/id'
const WIDTH = 1600
const HEIGHT = 900

/**
 * Each entry:
 *   picsumId — the stable Lorem Picsum image id
 *   slug     — our local kebab-case filename (no extension)
 *   label    — display label for the picker UI
 *
 * IDs hand-picked from picsum.photos for calming, EMDR-appropriate scenes:
 * forests, oceans, mountains, sky, abstract pastels. None contain humans,
 * objects with strong emotional valence, or anything that could compete
 * with the bilateral stimulation focus.
 */
const SOOTHING = [
    { picsumId: 15,   slug: 'misty-woods',         label: 'Misty woods' },
    { picsumId: 29,   slug: 'still-lake',          label: 'Still lake' },
    { picsumId: 110,  slug: 'mountain-mist',       label: 'Mountain mist' },
    { picsumId: 184,  slug: 'mountain-reflection', label: 'Mountain reflection' },
    { picsumId: 433,  slug: 'forest-fog',          label: 'Forest fog' },
    { picsumId: 600,  slug: 'snowy-peak',          label: 'Snowy peak' },
    { picsumId: 659,  slug: 'mountain-range',      label: 'Mountain range' },
    { picsumId: 717,  slug: 'foggy-lake',          label: 'Foggy lake' },
    { picsumId: 823,  slug: 'forest-in-fog',       label: 'Forest in fog' },
    { picsumId: 1015, slug: 'high-mountains',      label: 'High mountains' },
    { picsumId: 1018, slug: 'lake-and-mountains',  label: 'Lake & mountains' },
    { picsumId: 1058, slug: 'open-field',          label: 'Open field' },
]

async function downloadOne(category, item) {
    const url = `${PICSUM}/${item.picsumId}/${WIDTH}/${HEIGHT}`
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    // Sanity check — picsum should serve JPEG with the proper magic bytes.
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
        throw new Error('Response is not a JPEG (no JFIF magic bytes)')
    }
    const outPath = join(OUT_DIR, category, `${item.slug}.jpg`)
    await writeFile(outPath, buffer)
    return buffer.length
}

async function main() {
    console.log(`Downloading BLS backgrounds to ${OUT_DIR}\n`)

    const CATEGORIES = { soothing: SOOTHING }
    let total = 0
    let bytes = 0
    let failed = 0

    for (const [category, items] of Object.entries(CATEGORIES)) {
        await mkdir(join(OUT_DIR, category), { recursive: true })
        console.log(`── ${category.toUpperCase()} (${items.length}) ──`)
        for (const item of items) {
            try {
                const size = await downloadOne(category, item)
                bytes += size
                total += 1
                console.log(`  ✓ ${item.slug.padEnd(28)} ${formatBytes(size)}`)
            } catch (err) {
                failed += 1
                console.log(`  ✗ ${item.slug.padEnd(28)} ${err.message}`)
            }
        }
        console.log('')
    }

    await writeFile(
        join(OUT_DIR, 'CREDITS.md'),
        `# BLS Background Credits

Images sourced from **Lorem Picsum** (picsum.photos), which redistributes
**Unsplash** photos under the Unsplash License. Free for commercial use,
no attribution required.

The bundled images cover the "Soothing" category — calm nature scenes
suitable for EMDR sessions. The "Triggering" and "Moving" categories on
bilateralstimulation.io are NOT replicated — clinicians source those
themselves via the Uploads feature, since target imagery is a per-client
clinical decision.

Total: ${total} bundled images.
`,
        'utf8',
    )

    console.log(`Done: ${total} downloaded, ${failed} failed, ${formatBytes(bytes)} total.`)
    if (failed > 0) process.exitCode = 1
}

function formatBytes(n) {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / 1024 / 1024).toFixed(2)} MB`
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
