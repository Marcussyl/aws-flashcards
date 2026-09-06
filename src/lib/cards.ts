import { getCategoriesForTopic } from '@/data/categories'
import type { TopicId } from '@/data/topics'
import type { Card } from '@/data/types'

export function getCardsByTopic(cards: Card[], topic: TopicId): Card[] {
  return cards.filter((card) => card.topic === topic)
}

export function getCardsByCategory(cards: Card[], category: string, topic?: TopicId): Card[] {
  return cards.filter((card) => {
    const topicOk = !topic || card.topic === topic
    return topicOk && card.category === category
  })
}

export function getCategoryCounts(cards: Card[], topic?: TopicId): Record<string, number> {
  const list = topic ? getCardsByTopic(cards, topic) : cards
  return list.reduce<Record<string, number>>((acc, card) => {
    acc[card.category] = (acc[card.category] ?? 0) + 1
    return acc
  }, {})
}

export function findCategory(name: string, topic?: TopicId) {
  const pool = topic ? getCategoriesForTopic(topic) : getCategoriesForTopic('aws')
  return pool.find((item) => item.name === name)
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
