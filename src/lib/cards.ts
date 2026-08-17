import rawCards from '@/data/cards.json'
import { CATEGORIES } from '@/data/categories'
import type { Card } from '@/data/types'

export const cards = rawCards as Card[]

export function getCardsByCategory(category: string): Card[] {
  return cards.filter((card) => card.category === category)
}

export function getCategoryCounts(): Record<string, number> {
  return cards.reduce<Record<string, number>>((acc, card) => {
    acc[card.category] = (acc[card.category] ?? 0) + 1
    return acc
  }, {})
}

export function findCategory(name: string) {
  return CATEGORIES.find((item) => item.name === name)
}

export function shuffleCards(list: Card[]): Card[] {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = next[i]
    next[i] = next[j]
    next[j] = current
  }
  return next
}
