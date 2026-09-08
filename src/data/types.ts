/** Topic id is a stable slug string (e.g. aws, pve). Stored on cards and in routes. */
export type TopicId = string

export type CardStatus = 'unseen' | 'learning' | 'known'

export type Card = {
  id: string
  topic: TopicId
  category: string
  question: string
  summary: string
  answer: string
  sourceQuestion: string
  images?: string[]
}

export type CardDocument = {
  _id: string
  topic: TopicId
  category: string
  question: string
  summary: string
  answer: string
  sourceQuestion: string
  images?: string[]
  createdAt: string
  updatedAt: string
}

export type CardUpdate = {
  question?: string
  summary?: string
  answer?: string
  category?: string
}

export type CardCreate = {
  topic: TopicId
  category: string
  question: string
  summary: string
  answer: string
}

export type ProgressEntry = {
  status: CardStatus
  seen: number
}

export type ProgressMap = Record<string, ProgressEntry>

/** One Mongo document per card in the `progress` collection. */
export type ProgressDocument = {
  userId: string
  cardId: string
  status: CardStatus
  seen: number
  updatedAt: string
}

/** Pre-refactor mega-document (`_id: "default"`) kept for one-shot migration. */
export type LegacyProgressDocument = {
  _id: 'default'
  cards: ProgressMap
  updatedAt: string
}

export const LOCAL_PROGRESS_USER_ID = 'local'

/** Topic metadata stored in Mongo `topics` collection (_id = slug). */
export type TopicMeta = {
  id: TopicId
  name: string
  emoji: string
  tagline: string
  blurb: string
  /** Accent hex, e.g. #fbbf24 */
  accent: string
  /** Contrasting foreground for text on accent */
  accentFg: string
}

export type TopicDocument = {
  _id: TopicId
  name: string
  emoji: string
  tagline: string
  blurb: string
  accent: string
  accentFg: string
  createdAt: string
  updatedAt: string
}

export type TopicCreate = {
  id: TopicId
  name: string
  emoji: string
  tagline: string
  blurb: string
  accent: string
  accentFg?: string
}

export type TopicUpdate = {
  name?: string
  emoji?: string
  tagline?: string
  blurb?: string
  accent?: string
  accentFg?: string
}

/** Category metadata stored in Mongo `categories` collection. */
export type CategoryMeta = {
  id: string
  topic: TopicId
  name: string
  emoji: string
  blurb: string
}

export type CategoryDocument = {
  _id: string
  topic: TopicId
  name: string
  emoji: string
  blurb: string
  createdAt: string
  updatedAt: string
}

export type CategoryCreate = {
  topic: TopicId
  name: string
  emoji: string
  blurb: string
}

export type CategoryUpdate = {
  name?: string
  emoji?: string
  blurb?: string
}
