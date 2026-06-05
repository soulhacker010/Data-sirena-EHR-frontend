#!/usr/bin/env node
/**
 * Download Fluent Emoji SVGs for the BLS sound library — small colorful icons
 * shown next to each sound row in the picker modal and the currently-selected
 * card. Source: github.com/microsoft/fluentui-emoji (MIT licensed).
 *
 * Run with: npm run download:bls-sound-icons
 *
 * Saves to: public/bls-sound-icons/{slug}.svg
 *
 * Same Color-variant flow as the illustration script. Skin-toned emojis
 * (Pinched fingers) use the Default/Color/<file>_color_default.svg path.
 *
 * Multiple sounds may share an icon when Fluent Emoji doesn't offer enough
 * variety (e.g. all 5 Tibetan bowls map to "Bowl with spoon"). The manifest
 * in src/lib/blsSoundIcons.ts handles that mapping.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(PROJECT_ROOT, 'public', 'bls-sound-icons')

const REPO_RAW = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets'

/**
 * The unique set of Fluent Emoji icons we need. Several BLS sounds reference
 * the same icon (drums, bowls) — that's expected and handled by the manifest.
 */
const ICONS = [
    // Classics
    { folder: 'Pinched fingers',       file: 'pinched_fingers',  slug: 'pinched-fingers',  skinTone: true },
    { folder: 'Beating heart',         file: 'beating_heart',    slug: 'beating-heart' },
    { folder: 'Robot',                 file: 'robot',            slug: 'robot' },
    { folder: 'Guitar',                file: 'guitar',           slug: 'guitar' },
    { folder: 'Bell',                  file: 'bell',             slug: 'bell' },
    { folder: 'Fire',                  file: 'fire',             slug: 'fire' },
    { folder: 'Kiss mark',             file: 'kiss_mark',        slug: 'kiss-mark' },
    { folder: 'Badminton',             file: 'badminton',        slug: 'badminton' },
    // Drums / percussion
    { folder: 'Hammer',                file: 'hammer',           slug: 'hammer' },
    { folder: 'Drum',                  file: 'drum',             slug: 'drum' },
    { folder: 'Long drum',             file: 'long_drum',        slug: 'long-drum' },
    // Bowls
    { folder: 'Bowl with spoon',       file: 'bowl_with_spoon',  slug: 'bowl-with-spoon' },
    { folder: 'Bellhop bell',          file: 'bellhop_bell',     slug: 'bellhop-bell' },
    // New Classics — beeps, clicks, etc.
    { folder: 'Loudspeaker',           file: 'loudspeaker',      slug: 'loudspeaker' },
    { folder: 'Megaphone',             file: 'megaphone',        slug: 'megaphone' },
    { folder: 'Musical notes',         file: 'musical_notes',    slug: 'musical-notes' },
    { folder: 'Computer mouse',        file: 'computer_mouse',   slug: 'computer-mouse' },
    { folder: 'Alarm clock',           file: 'alarm_clock',      slug: 'alarm-clock' },
    { folder: 'Tongue',                file: 'tongue',           slug: 'tongue' },
    { folder: 'Sparkles',              file: 'sparkles',         slug: 'sparkles' },
]

async function downloadOne(item) {
    const url = item.skinTone
        ? `${REPO_RAW}/${encodeURIComponent(item.folder)}/Default/Color/${item.file}_color_default.svg`
        : `${REPO_RAW}/${encodeURIComponent(item.folder)}/Color/${item.file}_color.svg`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    const text = await res.text()
    if (!text.startsWith('<svg') && !text.startsWith('<?xml')) {
        throw new Error('Response is not an SVG')
    }
    const outPath = join(OUT_DIR, `${item.slug}.svg`)
    await writeFile(outPath, text, 'utf8')
    return text.length
}

async function main() {
    console.log(`Downloading BLS sound icons to ${OUT_DIR}\n`)
    await mkdir(OUT_DIR, { recursive: true })

    let total = 0
    let bytes = 0
    let failed = 0

    for (const item of ICONS) {
        try {
            const size = await downloadOne(item)
            bytes += size
            total += 1
            console.log(`  ✓ ${item.slug.padEnd(24)} ${formatBytes(size)}`)
        } catch (err) {
            failed += 1
            console.log(`  ✗ ${item.slug.padEnd(24)} ${err.message}`)
        }
    }

    await writeFile(
        join(OUT_DIR, 'CREDITS.md'),
        `# BLS Sound Icons Credits

Icons are from **Microsoft Fluent Emoji** (github.com/microsoft/fluentui-emoji),
licensed under the MIT License. Free for commercial use, no attribution
required — we credit here for transparency.

Several BLS sounds share an icon where Fluent Emoji doesn't offer enough
variety (e.g. the 5 Tibetan bowls all use the "Bowl with spoon" icon, drums
share between "Drum" and "Long drum"). The sound name + category context
distinguishes them.

Total: ${total} icons bundled.
`,
        'utf8',
    )

    console.log(`\nDone: ${total} downloaded, ${failed} failed, ${formatBytes(bytes)} total.`)
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
