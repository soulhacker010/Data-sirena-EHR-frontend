/**
 * Manifest of BLS illustrations bundled with the frontend.
 *
 * Source: Microsoft Fluent Emoji (MIT licensed). The actual SVG files live
 * in public/bls-illustrations/{category}/{slug}.svg — they're served by
 * Vercel as static assets at runtime.
 *
 * This file is the only typed registry. The picker modal iterates it to
 * render the grid, and the canvas renderers look up paths from it by slug
 * + category. Keep it in sync with the download script
 * (scripts/download-bls-illustrations.mjs) — adding an illustration means
 * adding it to BOTH places, then running the download script.
 */

export type BLSIllustrationCategory = 'animals' | 'emojis' | 'sports' | 'emdr'

export interface BLSIllustration {
    category: BLSIllustrationCategory
    slug: string         // unique within the category — used as the persisted id
    label: string        // user-facing label shown on hover / a11y
    path: string         // resolved public path (e.g., /bls-illustrations/animals/lion.svg)
}

const make = (category: BLSIllustrationCategory, slug: string, label: string): BLSIllustration => ({
    category,
    slug,
    label,
    path: `/bls-illustrations/${category}/${slug}.svg`,
})

const ANIMALS: BLSIllustration[] = [
    make('animals', 'lion',           'Lion'),
    make('animals', 'bear',           'Bear'),
    make('animals', 'fox',            'Fox'),
    make('animals', 'cat-face',       'Cat'),
    make('animals', 'dog-face',       'Dog'),
    make('animals', 'monkey-face',    'Monkey'),
    make('animals', 'penguin',        'Penguin'),
    make('animals', 'pig-face',       'Pig'),
    make('animals', 'panda',          'Panda'),
    make('animals', 'tiger-face',     'Tiger'),
    make('animals', 'rabbit-face',    'Rabbit'),
    make('animals', 'hatching-chick', 'Chick'),
    make('animals', 'eagle',          'Eagle'),
    make('animals', 'cow-face',       'Cow'),
    make('animals', 'elephant',       'Elephant'),
    make('animals', 'unicorn',        'Unicorn'),
    make('animals', 'honeybee',       'Bee'),
    make('animals', 'snake',          'Snake'),
    make('animals', 'butterfly',      'Butterfly'),
    make('animals', 'owl',            'Owl'),
]

const EMOJIS: BLSIllustration[] = [
    make('emojis', 'smiling-face',                'Smiling'),
    make('emojis', 'grinning-face',               'Grinning'),
    make('emojis', 'beaming-face',                'Beaming'),
    make('emojis', 'smiling-with-hearts',         'Hearts'),
    make('emojis', 'smiling-with-sunglasses',     'Sunglasses'),
    make('emojis', 'star-struck',                 'Star-struck'),
    make('emojis', 'hugging-face',                'Hugging'),
    make('emojis', 'thinking-face',               'Thinking'),
    make('emojis', 'winking-face',                'Winking'),
    make('emojis', 'kissing-face',                'Kissing'),
    make('emojis', 'cowboy-hat-face',             'Cowboy'),
    make('emojis', 'nerd-face',                   'Nerd'),
    make('emojis', 'face-with-monocle',           'Monocle'),
    make('emojis', 'smirking-face',               'Smirking'),
    make('emojis', 'sleeping-face',               'Sleeping'),
    make('emojis', 'pensive-face',                'Pensive'),
    make('emojis', 'face-with-medical-mask',      'Medical mask'),
    make('emojis', 'sneezing-face',               'Sneezing'),
    make('emojis', 'crying-face',                 'Crying'),
    make('emojis', 'face-with-steam-from-nose',   'Frustrated'),
    make('emojis', 'angry-face',                  'Angry'),
    make('emojis', 'smiling-with-horns',          'Devil smile'),
    make('emojis', 'skull',                       'Skull'),
    make('emojis', 'beating-heart',               'Heart'),
    make('emojis', 'sun-with-face',               'Sun'),
]

const SPORTS: BLSIllustration[] = [
    make('sports', 'basketball',         'Basketball'),
    make('sports', 'soccer-ball',        'Soccer'),
    make('sports', 'american-football',  'Football'),
    make('sports', 'volleyball',         'Volleyball'),
    make('sports', 'tennis',             'Tennis'),
    make('sports', 'baseball',           'Baseball'),
    make('sports', 'cricket-game',       'Cricket'),
    make('sports', 'ice-hockey',         'Ice hockey'),
    make('sports', 'field-hockey',       'Field hockey'),
    make('sports', 'flying-disc',        'Frisbee'),
]

// EMDR-themed standard Unicode emojis from Fluent Emoji. NOT a substitute for
// the licensed "EMDR Workbook for Kids" character art on bilateralstimulation.io
// (we deliberately don't replicate that book's commissioned illustrations).
// These are the underlying universal emoji concepts that match the clinical
// metaphors EMDR clinicians use.
const EMDR: BLSIllustration[] = [
    make('emdr', 'brain',           'Brain'),
    make('emdr', 'eye',             'Eye'),
    make('emdr', 'eyes',            'Eyes'),
    make('emdr', 'waving-hand',     'Wave'),
    make('emdr', 'raised-hand',     'Stop'),
    make('emdr', 'open-hands',      'Open hands'),
    make('emdr', 'folded-hands',    'Grounding'),
    make('emdr', 'cloud',           'Cloud'),
    make('emdr', 'cloud-with-rain', 'Rain cloud'),
    make('emdr', 'rainbow',         'Rainbow'),
    make('emdr', 'pizza',           'Pizza'),
    make('emdr', 'mushroom',        'Mushroom'),
    make('emdr', 'sparkles',        'Sparkles'),
    make('emdr', 'glowing-star',    'Glowing star'),
    make('emdr', 'crystal-ball',    'Crystal ball'),
]

export const BLS_ILLUSTRATIONS_BY_CATEGORY: Record<BLSIllustrationCategory, BLSIllustration[]> = {
    animals: ANIMALS,
    emdr: EMDR,
    emojis: EMOJIS,
    sports: SPORTS,
}

export const BLS_ALL_ILLUSTRATIONS: BLSIllustration[] = [...ANIMALS, ...EMDR, ...EMOJIS, ...SPORTS]

const BY_SLUG = new Map<string, BLSIllustration>(
    BLS_ALL_ILLUSTRATIONS.map(i => [`${i.category}/${i.slug}`, i])
)

/**
 * Look up an illustration by its persisted id (`{category}/{slug}` form).
 * Returns null if the id is unknown — defensively used by the canvas so a
 * stale config doesn't crash the renderer if an illustration is later
 * removed from the manifest.
 */
export function findBLSIllustration(id: string | null | undefined): BLSIllustration | null {
    if (!id) return null
    return BY_SLUG.get(id) ?? null
}

/**
 * Compose the persisted id from category + slug. Centralized here so the
 * `${cat}/${slug}` format is the single source of truth.
 */
export function illustrationId(illustration: BLSIllustration): string {
    return `${illustration.category}/${illustration.slug}`
}

export const BLS_CATEGORY_LABEL: Record<BLSIllustrationCategory, string> = {
    animals: 'Animals',
    emdr: 'EMDR',
    emojis: 'Emojis',
    sports: 'Sports',
}

/** Default chosen on the picker when nothing has been selected before. */
export const DEFAULT_ILLUSTRATION_ID = 'animals/lion'
