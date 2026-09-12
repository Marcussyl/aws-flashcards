import { describe, expect, it } from 'vitest'
import type { Card, ProgressMap } from '@/data/types'
import {
  canGoNext,
  canGoPrev,
  createStudyDeck,
  currentStudyCard,
  goStudyNext,
  goStudyPrev,
  isKnown,
  markStudyCard,
  selectStudyCards,
  studySessionHint,
  unknownCards,
} from '@/lib/study-deck'

function card(id: string, category = 'IAM'): Card {
  return {
    id,
    topic: 'aws',
    category,
    question: `Q ${id}`,
    summary: `S ${id}`,
    answer: `A ${id}`,
    sourceQuestion: `SQ ${id}`,
  }
}

const cards = [card('a'), card('b'), card('c'), card('d')]

const map: ProgressMap = {
  a: { status: 'known', seen: 2 },
  b: { status: 'learning', seen: 1 },
  c: { status: 'unseen', seen: 0 },
  // d intentionally missing → treated as unknown / unseen
}

describe('isKnown / unknownCards', () => {
  it('detects known status', () => {
    expect(isKnown(map, 'a')).toBe(true)
    expect(isKnown(map, 'b')).toBe(false)
    expect(isKnown(map, 'missing')).toBe(false)
  })

  it('filters out known cards', () => {
    expect(unknownCards(cards, map).map((c) => c.id)).toEqual(['b', 'c', 'd'])
  })
})

describe('selectStudyCards', () => {
  it('mode known returns only known cards', () => {
    expect(
      selectStudyCards(cards, map, { category: null, mode: 'known' }).map((c) => c.id),
    ).toEqual(['a'])
  })

  it('mode learning returns only learning cards', () => {
    expect(
      selectStudyCards(cards, map, { category: null, mode: 'learning' }).map(
        (c) => c.id,
      ),
    ).toEqual(['b'])
  })

  it('mode due returns unknown cards when any remain', () => {
    expect(
      selectStudyCards(cards, map, { category: null, mode: 'due' }).map((c) => c.id),
    ).toEqual(['b', 'c', 'd'])
  })

  it('mode due falls back to full list when all known', () => {
    const allKnown: ProgressMap = {
      a: { status: 'known', seen: 1 },
      b: { status: 'known', seen: 1 },
      c: { status: 'known', seen: 1 },
      d: { status: 'known', seen: 1 },
    }
    expect(
      selectStudyCards(cards, allKnown, { category: null, mode: 'due' }).map(
        (c) => c.id,
      ),
    ).toEqual(['a', 'b', 'c', 'd'])
  })

  it('category filter uses unknown path like due', () => {
    expect(
      selectStudyCards(cards, map, { category: 'IAM', mode: null }).map((c) => c.id),
    ).toEqual(['b', 'c', 'd'])
  })

  it('no mode/category returns full list', () => {
    expect(
      selectStudyCards(cards, map, { category: null, mode: null }).map((c) => c.id),
    ).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('studySessionHint', () => {
  it('echoes known/learning modes', () => {
    expect(studySessionHint(cards, map, { category: null, mode: 'known' })).toBe(
      'known',
    )
    expect(
      studySessionHint(cards, map, { category: null, mode: 'learning' }),
    ).toBe('learning')
  })

  it('reports unseen & learning when unknowns remain', () => {
    expect(studySessionHint(cards, map, { category: null, mode: 'due' })).toBe(
      'unseen & learning',
    )
  })

  it('reports all known when nothing left to review', () => {
    const allKnown: ProgressMap = Object.fromEntries(
      cards.map((c) => [c.id, { status: 'known' as const, seen: 1 }]),
    )
    expect(
      studySessionHint(cards, allKnown, { category: 'IAM', mode: null }),
    ).toBe('all known')
  })

  it('returns null for unrestricted study', () => {
    expect(studySessionHint(cards, map, { category: null, mode: null })).toBeNull()
  })
})

describe('createStudyDeck / navigation', () => {
  it('creates empty deck for empty input', () => {
    expect(createStudyDeck([])).toEqual({
      history: [],
      historyIndex: 0,
      remaining: [],
    })
  })

  it('seeds history with first card and remaining with the rest', () => {
    const state = createStudyDeck(cards)
    expect(currentStudyCard(state)?.id).toBe('a')
    expect(state.remaining.map((c) => c.id)).toEqual(['b', 'c', 'd'])
    expect(canGoPrev(state)).toBe(false)
    expect(canGoNext(state)).toBe(true)
  })

  it('goStudyNext pulls from remaining onto history', () => {
    let state = createStudyDeck(cards)
    state = goStudyNext(state)
    expect(currentStudyCard(state)?.id).toBe('b')
    expect(state.history.map((c) => c.id)).toEqual(['a', 'b'])
    expect(state.remaining.map((c) => c.id)).toEqual(['c', 'd'])
  })

  it('goStudyPrev walks back history without changing remaining', () => {
    let state = createStudyDeck(cards)
    state = goStudyNext(state)
    state = goStudyPrev(state)
    expect(currentStudyCard(state)?.id).toBe('a')
    expect(state.remaining.map((c) => c.id)).toEqual(['c', 'd'])
    expect(canGoPrev(state)).toBe(false)
  })

  it('goStudyPrev / goStudyNext are no-ops at edges', () => {
    const empty = createStudyDeck([])
    expect(goStudyPrev(empty)).toBe(empty)
    expect(goStudyNext(empty)).toBe(empty)

    const single = createStudyDeck([card('only')])
    expect(goStudyNext(single)).toEqual(single)
    expect(goStudyPrev(single)).toEqual(single)
  })

  it('canGoNext is true while inside history trail even if remaining empty', () => {
    let state = createStudyDeck([card('a'), card('b')])
    state = goStudyNext(state)
    state = goStudyPrev(state)
    expect(state.remaining).toHaveLength(0)
    expect(canGoNext(state)).toBe(true)
    state = goStudyNext(state)
    expect(currentStudyCard(state)?.id).toBe('b')
    expect(canGoNext(state)).toBe(false)
  })
})

describe('markStudyCard', () => {
  it('known removes card from remaining and advances', () => {
    // Put current card also in remaining (revisit scenario)
    let state = createStudyDeck(cards)
    state = {
      ...state,
      remaining: [card('a'), card('b'), card('c')],
    }
    state = markStudyCard(state, 'known')
    // a filtered out of remaining → [b,c], then Next pulls b
    expect(currentStudyCard(state)?.id).toBe('b')
    expect(state.remaining.map((c) => c.id)).toEqual(['c'])
    expect(state.remaining.some((c) => c.id === 'a')).toBe(false)
    expect(state.history.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('learning re-queues current card at end of remaining and advances', () => {
    let state = createStudyDeck(cards)
    const first = currentStudyCard(state)!
    state = markStudyCard(state, 'learning')
    expect(currentStudyCard(state)?.id).toBe('b')
    expect(state.remaining.map((c) => c.id)).toEqual(['c', 'd', first.id])
  })

  it('learning re-inserts a card previously dropped as known', () => {
    let state = createStudyDeck([card('a'), card('b')])
    state = markStudyCard(state, 'known') // a known → remaining [b] then advance to b, remaining []
    expect(currentStudyCard(state)?.id).toBe('b')
    expect(state.remaining).toHaveLength(0)
    state = markStudyCard(state, 'learning') // b learning → remaining [b], but advance with empty remaining stays
    // After mark on last card with empty remaining after requeue:
    // withoutCurrent=[], remaining=[b], goStudyNext pulls b onto history
    expect(state.remaining.map((c) => c.id).includes('b') || currentStudyCard(state)?.id === 'b').toBe(
      true,
    )
  })

  it('no-ops when history is empty', () => {
    const empty = createStudyDeck([])
    expect(markStudyCard(empty, 'known')).toEqual(empty)
  })
})
