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
