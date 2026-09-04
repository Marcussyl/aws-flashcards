'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CelebrateBurst, type BurstKind } from '@/components/CelebrateBurst'
import { FlashCard } from '@/components/FlashCard'
import { cards, shuffleCards } from '@/lib/cards'
import { useProgress } from '@/lib/progress'
import { selectStudyCards, studySessionHint } from '@/lib/study-deck'
import type { Card } from '@/data/types'

export function StudyView() {
  const params = useSearchParams()
  const category = params.get('category')
  const mode = params.get('mode')
  const { map, ready, mark } = useProgress()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [burstId, setBurstId] = useState(0)
  const [burstKind, setBurstKind] = useState<BurstKind>('known')

  const baseList = useMemo(() => {
    return category
      ? cards.filter((card) => card.category === category)
      : cards
  }, [category])

  const usesProgress = Boolean(mode) || Boolean(category)
  const sessionKey = usesProgress
    ? `${category ?? ''}|${mode ?? ''}|${ready ? 'ready' : 'pending'}`
    : `all|${category ?? ''}|${mode ?? ''}`
  const sessionHint = ready
    ? studySessionHint(baseList, map, { category, mode })
    : null

  const [session, setSession] = useState<{ key: string; deck: Card[] | null } | null>(
    null,
  )

  if (session?.key !== sessionKey) {
    const nextDeck =
      usesProgress && !ready
        ? null
        : shuffleCards(selectStudyCards(baseList, map, { category, mode }))
    setSession({ key: sessionKey, deck: nextDeck })
    setIndex(0)
    setFlipped(false)
  }

  const deck = session?.key === sessionKey ? session.deck : null
  const card = deck?.[index]
  const total = deck?.length ?? 0

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('[data-card-expanded]')) {
        return
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        setFlipped((value) => !value)
      } else if (event.key === 'ArrowRight') {
        go(1)
      } else if (event.key === 'ArrowLeft') {
        go(-1)
      } else if (event.key === '1') {
        markCurrent('learning')
      } else if (event.key === '2') {
        markCurrent('known')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function go(step: number) {
    setIndex((current) => {
      const next = current + step
      if (next < 0) {
        return total ? total - 1 : 0
      }
      if (next >= total) {
        return 0
      }
      return next
    })
    setFlipped(false)
  }

  function markCurrent(status: 'learning' | 'known') {
    if (!card) {
      return
    }
    mark(card.id, status)
    setBurstKind(status)
    setBurstId((value) => value + 1)
    go(1)
  }

  if (deck === null) {
    return <p className="text-slate-400">Shuffling deck…</p>
  }

  if (!card) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-center">
        <h1 className="text-2xl font-semibold">No cards in this filter</h1>
        <p className="mt-3 text-slate-400">
          Try shuffling all cards, or reset progress from the home page.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-amber-300">
            {category ?? 'All topics'}
            {sessionHint ? ` · ${sessionHint}` : ''}
          </p>
          <h1 className="mt-1 text-xl font-semibold sm:text-2xl">Study session</h1>
        </div>
        <p className="shrink-0 text-sm text-slate-400">
          {index + 1} / {total}
        </p>
      </div>

      <FlashCard
        key={card.id}
        card={card}
        flipped={flipped}
        onFlip={() => setFlipped((value) => !value)}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center">
        <button
          type="button"
          className="order-3 rounded-full border border-white/15 px-4 py-3 text-sm hover:border-white/40 sm:order-1"
          onClick={() => go(-1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="order-1 rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 hover:bg-rose-500/20"
          onClick={() => markCurrent('learning')}
        >
          Still learning
        </button>
        <button
          type="button"
          className="order-2 rounded-full bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
          onClick={() => markCurrent('known')}
        >
          I know this
        </button>
        <button
          type="button"
          className="order-4 rounded-full border border-white/15 px-4 py-3 text-sm hover:border-white/40"
          onClick={() => go(1)}
        >
          Next
        </button>
      </div>
      <p className="hidden text-center text-xs text-slate-500 sm:block">
        Space = flip · arrows = navigate · 1 = learning · 2 = known
      </p>
      <CelebrateBurst burstId={burstId} kind={burstKind} />
    </div>
  )
}
