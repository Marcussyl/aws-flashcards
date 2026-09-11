import type { Card } from '@/data/types'
import draftsJson from '../../data/aws-answer-drafts.json'

type DraftEntry = {
  answer?: string
  rewritten?: boolean
  reason?: string
  question?: string
}

type DraftMap = Record<string, DraftEntry>

const drafts = draftsJson as DraftMap

/**
 * Preview-only answer overlay from data/aws-answer-drafts.json.
 * Active when VERCEL_ENV === 'preview' or USE_ANSWER_DRAFTS=1.
 * Never applies when VERCEL_ENV === 'production'.
 */
export function shouldUseAnswerDrafts(): boolean {
  if (process.env.VERCEL_ENV === 'production') {
    return false
  }
  return process.env.VERCEL_ENV === 'preview' || process.env.USE_ANSWER_DRAFTS === '1'
}

export function getDraftAnswer(id: string): string | undefined {
  const entry = drafts[id]
  return typeof entry?.answer === 'string' ? entry.answer : undefined
}

/** Overlay draft answers onto aws cards by id (preview / USE_ANSWER_DRAFTS only). */
export function overlayCardsAnswers(cards: Card[]): Card[] {
  if (!shouldUseAnswerDrafts()) {
    return cards
  }
  return cards.map((card) => {
    if (card.topic !== 'aws') return card
    const draft = getDraftAnswer(card.id)
    return draft === undefined ? card : { ...card, answer: draft }
  })
}

export function overlayCardAnswer(card: Card | null): Card | null {
  if (!card || !shouldUseAnswerDrafts() || card.topic !== 'aws') {
    return card
  }
  const draft = getDraftAnswer(card.id)
  return draft === undefined ? card : { ...card, answer: draft }
}
