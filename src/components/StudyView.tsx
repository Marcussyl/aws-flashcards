'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CelebrateBurst, type BurstKind } from '@/components/CelebrateBurst'
import { FlashCard } from '@/components/FlashCard'
import {
  IconBook,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconInbox,
  IconLayers,
  IconRefresh,
  IconShuffle,
  IconSpark,
} from '@/components/icons'
import { getCategoryEmoji } from '@/data/categories'
import { cards, shuffleCards } from '@/lib/cards'
import {
  cardExitKnown,
  cardExitLearning,
  cardSwipe,
  easeOutExpo,
  tapSpring,
} from '@/lib/motion'
import { useProgress } from '@/lib/progress'
import { selectStudyCards, studySessionHint } from '@/lib/study-deck'
import type { Card } from '@/data/types'

const MODE_LABELS: Record<string, string> = {
  due: 'Due cards',
  known: 'Known',
  learning: 'Still learning',
}

type Swipe = {
  dir: 1 | -1
  exit: 'next' | 'prev' | 'known' | 'learning'
}

export function StudyView() {
  const params = useSearchParams()
  const category = params.get('category')
  const mode = params.get('mode')
  const { map, ready, mark } = useProgress()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [burstId, setBurstId] = useState(0)
  const [burstKind, setBurstKind] = useState<BurstKind>('known')
  const [swipe, setSwipe] = useState<Swipe>({ dir: 1, exit: 'next' })
  const reduce = useReducedMotion()

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
    setSwipe({ dir: 1, exit: 'next' })
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

  function advance(nextSwipe: Swipe) {
    setSwipe(nextSwipe)
    setIndex((current) => {
      const next = current + nextSwipe.dir
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

  function go(step: number) {
    advance({
      dir: step > 0 ? 1 : -1,
      exit: step > 0 ? 'next' : 'prev',
    })
  }

  function markCurrent(status: 'learning' | 'known') {
    if (!card) {
      return
    }
    mark(card.id, status)
    setBurstKind(status)
    setBurstId((value) => value + 1)
    advance({ dir: 1, exit: status })
  }

  if (deck === null) {
    return <StudyLoading category={category} mode={mode} />
  }

  if (!card) {
    return <EmptyDeck category={category} mode={mode} />
  }

  const progressPct = total ? Math.round(((index + 1) / total) * 100) : 0
  const topicEmoji = getCategoryEmoji(category ?? card.category)
  const topicLabel = category ?? 'All topics'
  const modeLabel = sessionHint
    ? MODE_LABELS[sessionHint] ?? sessionHint
    : mode
      ? MODE_LABELS[mode] ?? mode
      : 'Shuffled'

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 sm:gap-4">
      <div className="shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200">
                <span aria-hidden="true">{topicEmoji}</span>
                <span className="truncate">{topicLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                <IconSpark className="h-3.5 w-3.5 text-sky-300" />
                {modeLabel}
              </span>
            </div>
            <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold sm:text-2xl">
              <IconBook className="h-5 w-5 text-amber-300" />
              Study session
            </h1>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Card</p>
            <p className="text-sm font-semibold text-white">
              {index + 1}
              <span className="text-slate-500"> / {total}</span>
            </p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-sky-400"
            animate={{ width: `${progressPct}%` }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 24 }}
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence initial={false} custom={swipe.dir}>
          <motion.div
            key={card.id}
            className="absolute inset-0"
            custom={swipe.dir}
            variants={cardSwipe}
            initial={reduce ? false : 'enter'}
            animate="center"
            exit={
              reduce
                ? undefined
                : swipe.exit === 'known'
                  ? cardExitKnown
                  : swipe.exit === 'learning'
                    ? cardExitLearning
                    : 'exit'
            }
            transition={reduce ? { duration: 0 } : { duration: 0.28, ease: easeOutExpo }}
          >
            <FlashCard
              card={card}
              flipped={flipped}
              onFlip={() => setFlipped((value) => !value)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center">
        <motion.button
          type="button"
          className="order-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-3 text-sm hover:border-white/40 sm:order-1"
          onClick={() => go(-1)}
          whileHover={reduce ? undefined : { scale: 1.02 }}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          transition={tapSpring}
        >
          <IconChevronLeft className="h-4 w-4" />
          Previous
        </motion.button>
        <motion.button
          type="button"
          className="order-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 hover:bg-rose-500/20"
          onClick={() => markCurrent('learning')}
          whileHover={reduce ? undefined : { scale: 1.02 }}
          whileTap={reduce ? undefined : { scale: 0.96, x: [0, -3, 3, -2, 0] }}
          transition={tapSpring}
        >
          <IconRefresh className="h-4 w-4" />
          Still learning
        </motion.button>
        <motion.button
          type="button"
          className="order-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
          onClick={() => markCurrent('known')}
          whileHover={reduce ? undefined : { scale: 1.03 }}
          whileTap={reduce ? undefined : { scale: 0.95 }}
          transition={tapSpring}
        >
          <IconCheck className="h-4 w-4" />
          I know this
        </motion.button>
        <motion.button
          type="button"
          className="order-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-3 text-sm hover:border-white/40"
          onClick={() => go(1)}
          whileHover={reduce ? undefined : { scale: 1.02 }}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          transition={tapSpring}
        >
          Next
          <IconChevronRight className="h-4 w-4" />
        </motion.button>
      </div>
      <p className="hidden shrink-0 text-center text-xs text-slate-500 sm:block">
        Space = flip · arrows = navigate · 1 = learning · 2 = known
      </p>
      <CelebrateBurst burstId={burstId} kind={burstKind} />
    </div>
  )
}

function StudyLoading({
  category,
  mode,
}: {
  category: string | null
  mode: string | null
}) {
  const topic = category ?? 'All topics'
  const modeLabel = mode ? MODE_LABELS[mode] ?? mode : 'Shuffled deck'
  const reduce = useReducedMotion()

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-lg flex-1 flex-col items-center justify-center px-2 text-center">
      <div className="relative h-[9.5rem] w-[7.5rem]" aria-hidden="true">
        <motion.span
          className="absolute inset-0 rounded-[1.15rem] border border-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
          style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)' }}
          initial={{ rotate: -10, x: -12, y: 8 }}
          animate={reduce ? undefined : { y: [8, 0, 8] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className="absolute inset-0 rounded-[1.15rem] border border-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
          style={{ background: 'linear-gradient(180deg, #1d4ed8, #0f172a)' }}
          initial={{ rotate: 8, x: 14, y: 6 }}
          animate={reduce ? undefined : { y: [6, -2, 6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
        />
        <motion.span
          className="absolute inset-0 flex items-center justify-center rounded-[1.15rem] border border-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
          style={{
            background:
              'radial-gradient(circle at top right, rgba(251, 191, 36, 0.28), transparent 40%), linear-gradient(180deg, #0f172a, #111827)',
          }}
          animate={reduce ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        >
          <IconLayers className="h-8 w-8 text-amber-200" />
        </motion.span>
      </div>
      <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
        <IconShuffle className="h-3.5 w-3.5" />
        {modeLabel}
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-white">Shuffling deck</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
        Lining up {topic.toLowerCase()} cards so you can start flipping right away.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex size-2 animate-pulse rounded-full bg-amber-300" />
        Preparing your session
      </div>
    </div>
  )
}

function EmptyDeck({
  category,
  mode,
}: {
  category: string | null
  mode: string | null
}) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col items-center justify-center text-center"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 text-amber-300"
        initial={reduce ? false : { scale: 0.88 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      >
        <IconInbox className="h-8 w-8" />
      </motion.div>
      <h1 className="mt-5 text-2xl font-semibold">No cards in this filter</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
        {category ? `${category} ` : 'This '}
        {mode ? `${MODE_LABELS[mode] ?? mode} ` : ''}
        pile is empty. Shuffle everything, or reset progress from home.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/study"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300"
        >
          <IconShuffle className="h-4 w-4" />
          Shuffle all
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-amber-300/60"
        >
          Back home
        </Link>
      </div>
    </motion.div>
  )
}
