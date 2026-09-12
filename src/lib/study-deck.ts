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

/**
 * Session navigation state:
 * - `history` — cards visited this session (including the current card), in visit order
 * - `historyIndex` — pointer into `history` (Previous / Next within the trail)
 * - `remaining` — cards not yet pulled onto the live edge of history
 *
 * Marking **known** drops the card from `remaining`. Marking **learning** ensures the
 * card is queued at the **end** of `remaining` so it can appear again after the current
 * forward path (re-insert if it was removed as known; move-to-end if already queued).
 */
export type StudyDeckState = {
  history: Card[]
  historyIndex: number
  remaining: Card[]
}

export function createStudyDeck(deck: Card[]): StudyDeckState {
  if (deck.length === 0) {
    return { history: [], historyIndex: 0, remaining: [] }
  }
  return {
    history: [deck[0]],
    historyIndex: 0,
    remaining: deck.slice(1),
  }
}

export function currentStudyCard(state: StudyDeckState): Card | undefined {
  return state.history[state.historyIndex]
}


export function canGoPrev(state: StudyDeckState): boolean {
  return state.historyIndex > 0
}

export function canGoNext(state: StudyDeckState): boolean {
  return state.historyIndex < state.history.length - 1 || state.remaining.length > 0
}

export function goStudyPrev(state: StudyDeckState): StudyDeckState {
  if (!canGoPrev(state)) {
    return state
  }
  return { ...state, historyIndex: state.historyIndex - 1 }
}

export function goStudyNext(state: StudyDeckState): StudyDeckState {
  if (state.historyIndex < state.history.length - 1) {
    return { ...state, historyIndex: state.historyIndex + 1 }
  }
  if (state.remaining.length === 0) {
    return state
  }
  const [next, ...rest] = state.remaining
  return {
    history: [...state.history, next],
    historyIndex: state.historyIndex + 1,
    remaining: rest,
  }
}

/**
 * Apply a judgment to the current history card, then advance like Next.
 *
 * - known: remove from remaining (if present)
 * - learning: remove any existing copy from remaining, then append at end
 *   (re-queues a card that was dropped when marked known)
 */
export function markStudyCard(
  state: StudyDeckState,
  status: 'learning' | 'known',
): StudyDeckState {
  const current = currentStudyCard(state)
  if (!current) {
    return state
  }

  const withoutCurrent = state.remaining.filter((item) => item.id !== current.id)
  const remaining =
    status === 'learning' ? [...withoutCurrent, current] : withoutCurrent

  return goStudyNext({ ...state, remaining })
}

/**
 * Display position for the session progress pill.
 * History grows when Still learning re-queues a card, so cap at the original
 * session size to avoid counters like 5/1.
 */
export function studyProgressPosition(historyIndex: number, originalCount: number) {
  if (originalCount <= 0 || historyIndex < 0) {
    return 0
  }
  return Math.min(historyIndex + 1, originalCount)
}

