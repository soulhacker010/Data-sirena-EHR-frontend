#!/usr/bin/env node
/**
 * Download curated BLS illustrations from Microsoft Fluent Emoji
 * (github.com/microsoft/fluentui-emoji, MIT licensed).
 *
 * Run with: npm run download:bls-illustrations
 *
 * Saves to: public/bls-illustrations/{animals,emojis,sports}/{slug}.svg
 *
 * Why we download rather than CDN-link:
 *  - Vercel hosts the SVGs on its global CDN automatically (zero infra work)
 *  - No external dependency on jsDelivr / GitHub at runtime
 *  - Deterministic asset versioning (commits = lockstep with code)
 *  - HIPAA-friendly: client view makes zero external requests for assets
 *
 * Why we curate (not download all 1500+):
 *  - Bundle size discipline (~600KB raw is enough for v1)
 *  - Avoid overwhelming clinicians with a "find your animal in 200 options" UX
 *  - Easier to swap individual illustrations if Dr. Joe doesn't like one
 *
 * License attribution: Microsoft Fluent Emoji is MIT licensed. Attribution
 * is not required but we keep a note in public/bls-illustrations/CREDITS.md.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(PROJECT_ROOT, 'public', 'bls-illustrations')

const REPO_RAW = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets'

/**
 * Each entry:
 *   folder  — the directory name in the upstream repo (case-sensitive, may contain spaces)
 *   file    — the file basename (lowercased, underscored)
 *   slug    — our local kebab-case filename (no extension)
 *   label   — display label for the picker UI
 *
 * The Color/{file}_color.svg variant is the kid-friendly playful style.
 */
const ILLUSTRATIONS = {
    animals: [
        { folder: 'Lion',              file: 'lion',              slug: 'lion',              label: 'Lion' },
        { folder: 'Bear',              file: 'bear',              slug: 'bear',              label: 'Bear' },
        { folder: 'Fox',               file: 'fox',               slug: 'fox',               label: 'Fox' },
        { folder: 'Cat face',          file: 'cat_face',          slug: 'cat-face',          label: 'Cat' },
        { folder: 'Dog face',          file: 'dog_face',          slug: 'dog-face',          label: 'Dog' },
        { folder: 'Monkey face',       file: 'monkey_face',       slug: 'monkey-face',       label: 'Monkey' },
        { folder: 'Penguin',           file: 'penguin',           slug: 'penguin',           label: 'Penguin' },
        { folder: 'Pig face',          file: 'pig_face',          slug: 'pig-face',          label: 'Pig' },
        { folder: 'Panda',             file: 'panda',             slug: 'panda',             label: 'Panda' },
        { folder: 'Tiger face',        file: 'tiger_face',        slug: 'tiger-face',        label: 'Tiger' },
        { folder: 'Rabbit face',       file: 'rabbit_face',       slug: 'rabbit-face',       label: 'Rabbit' },
        { folder: 'Hatching chick',    file: 'hatching_chick',    slug: 'hatching-chick',    label: 'Chick' },
        { folder: 'Eagle',             file: 'eagle',             slug: 'eagle',             label: 'Eagle' },
        { folder: 'Cow face',          file: 'cow_face',          slug: 'cow-face',          label: 'Cow' },
        { folder: 'Elephant',          file: 'elephant',          slug: 'elephant',          label: 'Elephant' },
        { folder: 'Unicorn',           file: 'unicorn',           slug: 'unicorn',           label: 'Unicorn' },
        { folder: 'Honeybee',          file: 'honeybee',          slug: 'honeybee',          label: 'Bee' },
        { folder: 'Snake',             file: 'snake',             slug: 'snake',             label: 'Snake' },
        { folder: 'Butterfly',         file: 'butterfly',         slug: 'butterfly',         label: 'Butterfly' },
        { folder: 'Owl',               file: 'owl',               slug: 'owl',               label: 'Owl' },
    ],
    emojis: [
        { folder: 'Smiling face with smiling eyes',   file: 'smiling_face_with_smiling_eyes',   slug: 'smiling-face',                 label: 'Smiling' },
        { folder: 'Grinning face',                    file: 'grinning_face',                    slug: 'grinning-face',                label: 'Grinning' },
        { folder: 'Beaming face with smiling eyes',   file: 'beaming_face_with_smiling_eyes',   slug: 'beaming-face',                 label: 'Beaming' },
        { folder: 'Smiling face with hearts',         file: 'smiling_face_with_hearts',         slug: 'smiling-with-hearts',          label: 'Hearts' },
        { folder: 'Smiling face with sunglasses',     file: 'smiling_face_with_sunglasses',     slug: 'smiling-with-sunglasses',      label: 'Sunglasses' },
        { folder: 'Star-struck',                      file: 'star-struck',                      slug: 'star-struck',                  label: 'Star-struck' },
        { folder: 'Hugging face',                     file: 'hugging_face',                     slug: 'hugging-face',                 label: 'Hugging' },
        { folder: 'Thinking face',                    file: 'thinking_face',                    slug: 'thinking-face',                label: 'Thinking' },
        { folder: 'Winking face',                     file: 'winking_face',                     slug: 'winking-face',                 label: 'Winking' },
        { folder: 'Kissing face',                     file: 'kissing_face',                     slug: 'kissing-face',                 label: 'Kissing' },
        { folder: 'Cowboy hat face',                  file: 'cowboy_hat_face',                  slug: 'cowboy-hat-face',              label: 'Cowboy' },
        { folder: 'Nerd face',                        file: 'nerd_face',                        slug: 'nerd-face',                    label: 'Nerd' },
        { folder: 'Face with monocle',                file: 'face_with_monocle',                slug: 'face-with-monocle',            label: 'Monocle' },
        { folder: 'Smirking face',                    file: 'smirking_face',                    slug: 'smirking-face',                label: 'Smirking' },
        { folder: 'Sleeping face',                    file: 'sleeping_face',                    slug: 'sleeping-face',                label: 'Sleeping' },
        { folder: 'Pensive face',                     file: 'pensive_face',                     slug: 'pensive-face',                 label: 'Pensive' },
        { folder: 'Face with medical mask',           file: 'face_with_medical_mask',           slug: 'face-with-medical-mask',       label: 'Medical mask' },
        { folder: 'Sneezing face',                    file: 'sneezing_face',                    slug: 'sneezing-face',                label: 'Sneezing' },
        { folder: 'Crying face',                      file: 'crying_face',                      slug: 'crying-face',                  label: 'Crying' },
        { folder: 'Face with steam from nose',        file: 'face_with_steam_from_nose',        slug: 'face-with-steam-from-nose',    label: 'Frustrated' },
        { folder: 'Angry face',                       file: 'angry_face',                       slug: 'angry-face',                   label: 'Angry' },
        { folder: 'Smiling face with horns',          file: 'smiling_face_with_horns',          slug: 'smiling-with-horns',           label: 'Devil smile' },
        { folder: 'Skull',                            file: 'skull',                            slug: 'skull',                        label: 'Skull' },
        { folder: 'Beating heart',                    file: 'beating_heart',                    slug: 'beating-heart',                label: 'Heart' },
        { folder: 'Sun with face',                    file: 'sun_with_face',                    slug: 'sun-with-face',                label: 'Sun' },
    ],
    sports: [
        { folder: 'Basketball',          file: 'basketball',          slug: 'basketball',         label: 'Basketball' },
        { folder: 'Soccer ball',         file: 'soccer_ball',         slug: 'soccer-ball',        label: 'Soccer' },
        { folder: 'American football',   file: 'american_football',   slug: 'american-football',  label: 'Football' },
        { folder: 'Volleyball',          file: 'volleyball',          slug: 'volleyball',         label: 'Volleyball' },
        { folder: 'Tennis',              file: 'tennis',              slug: 'tennis',             label: 'Tennis' },
        { folder: 'Baseball',            file: 'baseball',            slug: 'baseball',           label: 'Baseball' },
        { folder: 'Cricket game',        file: 'cricket_game',        slug: 'cricket-game',       label: 'Cricket' },
        { folder: 'Ice hockey',          file: 'ice_hockey',          slug: 'ice-hockey',         label: 'Ice hockey' },
        { folder: 'Field hockey',        file: 'field_hockey',        slug: 'field-hockey',       label: 'Field hockey' },
        { folder: 'Flying disc',         file: 'flying_disc',         slug: 'flying-disc',        label: 'Frisbee' },
    ],
    // EMDR — standard Unicode emojis (NOT the licensed "EMDR Workbook for Kids"
    // character art). All MIT-licensed Fluent Emoji, mapped to the clinical
    // metaphors EMDR clinicians actually use.
    emdr: [
        { folder: 'Brain',                  file: 'brain',                  slug: 'brain',                 label: 'Brain' },
        { folder: 'Eye',                    file: 'eye',                    slug: 'eye',                   label: 'Eye' },
        { folder: 'Eyes',                   file: 'eyes',                   slug: 'eyes',                  label: 'Eyes' },
        // Skin-toned emojis live under Default/Color/ with a swapped suffix.
        { folder: 'Waving hand',            file: 'waving_hand',            slug: 'waving-hand',           label: 'Wave',         skinTone: true },
        { folder: 'Raised hand',            file: 'raised_hand',            slug: 'raised-hand',           label: 'Stop',         skinTone: true },
        { folder: 'Open hands',             file: 'open_hands',             slug: 'open-hands',            label: 'Open hands',   skinTone: true },
        { folder: 'Folded hands',           file: 'folded_hands',           slug: 'folded-hands',          label: 'Grounding',    skinTone: true },
        { folder: 'Cloud',                  file: 'cloud',                  slug: 'cloud',                 label: 'Cloud' },
        { folder: 'Cloud with rain',        file: 'cloud_with_rain',        slug: 'cloud-with-rain',       label: 'Rain cloud' },
        { folder: 'Rainbow',                file: 'rainbow',                slug: 'rainbow',               label: 'Rainbow' },
        { folder: 'Pizza',                  file: 'pizza',                  slug: 'pizza',                 label: 'Pizza' },
        { folder: 'Mushroom',               file: 'mushroom',               slug: 'mushroom',              label: 'Mushroom' },
        { folder: 'Sparkles',               file: 'sparkles',               slug: 'sparkles',              label: 'Sparkles' },
        { folder: 'Glowing star',           file: 'glowing_star',           slug: 'glowing-star',          label: 'Glowing star' },
        { folder: 'Crystal ball',           file: 'crystal_ball',           slug: 'crystal-ball',          label: 'Crystal ball' },
    ],
}

async function downloadOne(category, item) {
    // Two path patterns in the Fluent Emoji repo:
    //  - Non-skin-toned: assets/{Folder}/Color/{file}_color.svg
    //  - Skin-toned:     assets/{Folder}/Default/Color/{file}_color_default.svg
    // The skinTone flag on each item selects which one to use.
    const url = item.skinTone
        ? `${REPO_RAW}/${encodeURIComponent(item.folder)}/Default/Color/${item.file}_color_default.svg`
        : `${REPO_RAW}/${encodeURIComponent(item.folder)}/Color/${item.file}_color.svg`
    const res = await fetch(url)
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
    }
    const text = await res.text()
    if (!text.startsWith('<svg') && !text.startsWith('<?xml')) {
        throw new Error('Response is not an SVG')
    }
    const outPath = join(OUT_DIR, category, `${item.slug}.svg`)
    await writeFile(outPath, text, 'utf8')
    return text.length
}

async function main() {
    console.log(`Downloading BLS illustrations to ${OUT_DIR}\n`)

    let total = 0
    let bytes = 0
    let failed = 0

    for (const [category, items] of Object.entries(ILLUSTRATIONS)) {
        await mkdir(join(OUT_DIR, category), { recursive: true })
        console.log(`── ${category.toUpperCase()} (${items.length}) ──`)
        for (const item of items) {
            try {
                const size = await downloadOne(category, item)
                bytes += size
                total += 1
                console.log(`  ✓ ${item.slug.padEnd(30)} ${formatBytes(size)}`)
            } catch (err) {
                failed += 1
                console.log(`  ✗ ${item.slug.padEnd(30)} ${err.message}`)
            }
        }
        console.log('')
    }

    // Write a CREDITS file alongside the SVGs.
    await writeFile(
        join(OUT_DIR, 'CREDITS.md'),
        `# BLS Illustration Credits

These illustrations are from **Microsoft Fluent Emoji**
(github.com/microsoft/fluentui-emoji), licensed under the MIT License.

Attribution is not required by the license but we provide it here for
transparency. The illustrations are bundled in this repo so the BLS module
can serve them from Vercel's CDN without external runtime dependencies.

## Categories

${Object.entries(ILLUSTRATIONS).map(([cat, items]) =>
    `- **${cat}** (${items.length}): ${items.map(i => i.label).join(', ')}`
).join('\n')}

Total: ${total} illustrations.
`,
        'utf8',
    )

    console.log(`Done: ${total} downloaded, ${failed} failed, ${formatBytes(bytes)} total.`)
    if (failed > 0) {
        process.exitCode = 1
    }
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
