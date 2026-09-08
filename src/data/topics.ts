import type { TopicId, TopicMeta } from '@/data/types'

/** Seed / known topic ids used for JSON decks and generateStaticParams. */
export const TOPIC_IDS = ['aws', 'pve'] as const

export type SeedTopicId = (typeof TOPIC_IDS)[number]

export type { TopicId, TopicMeta }

export const DEFAULT_LIBRARY_ACCENT = '#fbbf24'
export const DEFAULT_LIBRARY_ACCENT_FG = '#020617'

/** Default accents matching historical globals.css [data-topic] rules. */
export const DEFAULT_TOPIC_ACCENTS: Record<string, { accent: string; accentFg: string }> = {
  library: { accent: DEFAULT_LIBRARY_ACCENT, accentFg: DEFAULT_LIBRARY_ACCENT_FG },
  aws: { accent: '#fbbf24', accentFg: '#020617' },
  pve: { accent: '#fb923c', accentFg: '#1c0a00' },
}

/** Static seed topics — Mongo is the runtime source of truth after seeding. */
export const SEED_TOPICS: TopicMeta[] = [
  {
    id: 'aws',
    name: 'AWS Solutions Architect',
    blurb: 'Exam-style cloud architecture facts from your notes.',
    emoji: '☁️',
    tagline: 'Cloud architecture',
    accent: DEFAULT_TOPIC_ACCENTS.aws.accent,
    accentFg: DEFAULT_TOPIC_ACCENTS.aws.accentFg,
  },
  {
    id: 'pve',
    name: 'Proxmox VE',
    blurb: 'Homelab virtualization: LXC, QEMU, storage, and networking.',
    emoji: '🖥️',
    tagline: 'Virtualization',
    accent: DEFAULT_TOPIC_ACCENTS.pve.accent,
    accentFg: DEFAULT_TOPIC_ACCENTS.pve.accentFg,
  },
]

/** @deprecated Prefer SEED_TOPICS or DB-backed listTopics(); kept for seed scripts. */
export const TOPICS = SEED_TOPICS

const RESERVED_PATH_SEGMENTS = new Set([
  'admin',
  'api',
  '_next',
  'favicon.ico',
  'icon.png',
  'apple-icon.png',
  'manifest.webmanifest',
])

export function isSeedTopicId(value: string): value is SeedTopicId {
  return (TOPIC_IDS as readonly string[]).includes(value)
}

/** Sync check against seed ids only — prefer `topicExists` from taxonomy-db at runtime. */
export function isTopicId(value: string): boolean {
  return Boolean(value) && !RESERVED_PATH_SEGMENTS.has(value)
}

export function getSeedTopic(id: string): TopicMeta | undefined {
  return SEED_TOPICS.find((item) => item.id === id)
}

/** @deprecated Prefer getTopic from taxonomy-db / useTaxonomy. */
export function getTopic(id: string): TopicMeta | undefined {
  return getSeedTopic(id)
}

export function topicFromPath(pathname: string): TopicId | null {
  const first = pathname.split('/').filter(Boolean)[0]
  if (!first || RESERVED_PATH_SEGMENTS.has(first)) {
    return null
  }
  return first
}

export function contrastAccentFg(hex: string): string {
  const raw = hex.replace('#', '').trim()
  if (raw.length !== 3 && raw.length !== 6) {
    return DEFAULT_LIBRARY_ACCENT_FG
  }
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : raw
  const r = Number.parseInt(full.slice(0, 2), 16)
  const g = Number.parseInt(full.slice(2, 4), 16)
  const b = Number.parseInt(full.slice(4, 6), 16)
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return DEFAULT_LIBRARY_ACCENT_FG
  }
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#020617' : '#f8fafc'
}

export function normalizeTopicSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}
