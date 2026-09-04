import type { Card, ProgressMap } from '@/data/types'

export function isKnown(map: ProgressMap, id: string) {
  return map[id]?.status === 'known'
}

export function unknownCards(list: Card[], map: ProgressMap) {
  return list.filter((item) => !isKnown(map, item.id))
}

export function selectStudyCards(
  list: Card[],
  map: ProgressMap,
  options: { category: string | null; mode: string | null },
) {
  const { category, mode } = options

  if (mode === 'known') {
    return list.filter((item) => map[item.id]?.status === 'known')
  }

  if (mode === 'learning') {
    return list.filter((item) => map[item.id]?.status === 'learning')
  }

  if (mode === 'due' || category) {
    const review = unknownCards(list, map)
    return review.length > 0 ? review : list
  }

  return list
}

export function studySessionHint(
  list: Card[],
  map: ProgressMap,
  options: { category: string | null; mode: string | null },
) {
  const { category, mode } = options

  if (mode === 'known' || mode === 'learning') {
    return mode
  }

  if (mode === 'due' || category) {
    return unknownCards(list, map).length > 0 ? 'unseen & learning' : 'all known'
  }

  return null
}

export function advanceStudyDeck(
  deck: Card[],
  index: number,
  status: 'learning' | 'known',
): { deck: Card[]; index: number } {
  const current = deck[index]
  if (!current) {
    return { deck, index }
  }

  if (status === 'known') {
    const nextDeck = deck.filter((_, itemIndex) => itemIndex !== index)
    return {
      deck: nextDeck,
      index: nextIndexAfterRemoval(nextDeck.length, index),
    }
  }

  const nextDeck = [...deck.slice(0, index), ...deck.slice(index + 1), current]
  const wasLast = index >= deck.length - 1
  return {
    deck: nextDeck,
    index: wasLast ? 0 : index,
  }
}

function nextIndexAfterRemoval(length: number, index: number) {
  if (length <= 0) {
    return 0
  }
  return index >= length ? 0 : index
}
