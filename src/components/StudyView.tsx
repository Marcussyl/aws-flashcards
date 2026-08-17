'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FlashCard } from '@/components/FlashCard'
import { cards, shuffleCards } from '@/lib/cards'
import { useProgress } from '@/lib/progress'
import type { Card } from '@/data/types'

export function StudyView() {
  const params = useSearchParams()
  const category = params.get('category')
  const mode = params.get('mode')
  const { map, ready, mark } = useProgress()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [deck, setDeck] = useState<Card[] | null>(null)

  const baseList = useMemo(() => {
    return category
      ? cards.filter((card) => card.category === category)
      : cards
  }, [category])

  useEffect(() => {
    if (mode && !ready) {
      return
    }
    let list = baseList
    if (mode === 'due') {
      list = list.filter((item) => map[item.id]?.status !== 'known')
    } else if (mode === 'known') {
      list = list.filter((item) => map[item.id]?.status === 'known')
    } else if (mode === 'learning') {
      list = list.filter((item) => map[item.id]?.status === 'learning')
    }
    setDeck(shuffleCards(list))
    setIndex(0)
    setFlipped(false)
    // Snapshot progress when the session starts, not on every mark.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseList, mode, ready])

  const card = deck?.[index]
  const total = deck?.length ?? 0

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
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
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-amber-300">
            {category ?? 'All topics'} {mode ? `· ${mode}` : ''}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Study session</h1>
        </div>
        <p className="text-sm text-slate-400">
          {index + 1} / {total}
        </p>
      </div>

      <FlashCard
        key={card.id}
        card={card}
        flipped={flipped}
        onFlip={() => setFlipped((value) => !value)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/40"
          onClick={() => go(-1)}
        >
          Previous
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/20"
            onClick={() => markCurrent('learning')}
          >
            Still learning (1)
          </button>
          <button
            type="button"
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
            onClick={() => markCurrent('known')}
          >
            I know this (2)
          </button>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/40"
          onClick={() => go(1)}
        >
          Next
        </button>
      </div>
      <p className="text-center text-xs text-slate-500">
        Space = flip · arrows = navigate · 1 = learning · 2 = known
      </p>
    </div>
  )
}
