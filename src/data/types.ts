import type { TopicId } from '@/data/topics'

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

export type ProgressDocument = {
  _id: 'default'
  cards: ProgressMap
  updatedAt: string
}
