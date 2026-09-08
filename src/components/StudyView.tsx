'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CelebrateBurst, type BurstKind } from '@/components/CelebrateBurst'
import { DeckShuffling } from '@/components/DeckShuffling'
import { FlashCard } from '@/components/FlashCard'
import {
  IconBook,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconInbox,
  IconRefresh,
  IconShuffle,
  IconSpark,
} from '@/components/icons'
import { shuffleCards } from '@/lib/cards'
import {
  cardExitKnown,
  cardExitLearning,
  cardSwipe,
  easeOutExpo,
  tapSpring,
} from '@/lib/motion'
import { topicHref } from '@/lib/paths'
import { useProgress } from '@/lib/progress'
import { advanceStudyDeck, selectStudyCards, studySessionHint } from '@/lib/study-deck'
import type { Card, TopicId } from '@/data/types'
import { useTaxonomy } from '@/lib/taxonomy'

type StudySession = {
  key: string
  deck: Card[] | null
  original: Card[]
}

const MODE_LABELS: Record<string, string> = {
  due: 'Due cards',
  known: 'Known',
  learning: 'Still learning',
}

type Swipe = {
  dir: 1 | -1
  exit: 'next' | 'prev' | 'known' | 'learning'
}

export function StudyView({ topicId, cards }: { topicId: TopicId; cards: Card[] }) {
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
  const { getTopic, getCategoryEmoji } = useTaxonomy()
  const topic = getTopic(topicId)

  const topicCards = cards

  const baseList = useMemo(() => {
    return category
      ? topicCards.filter((card) => card.category === category)
      : topicCards
  }, [category, topicCards])

  const usesProgress = Boolean(mode) || Boolean(category)
  const sessionKey = usesProgress
    ? `${topicId}|${category ?? ''}|${mode ?? ''}|${ready ? 'ready' : 'pending'}`
    : `all|${topicId}|${category ?? ''}|${mode ?? ''}`
  const sessionHint = ready
    ? studySessionHint(baseList, map, { category, mode })
    : null

  const [session, setSession] = useState<StudySession | null>(null)

  // Rebuild only when sessionKey changes — never reshuffle mid-session on progress map updates.
  useEffect(() => {
    const nextDeck =
      usesProgress && !ready
        ? null
        : shuffleCards(selectStudyCards(baseList, map, { category, mode }))
    setSession({
      key: sessionKey,
      deck: nextDeck,
      original: nextDeck ? [...nextDeck] : [],
    })
    setIndex(0)
    setFlipped(false)
    setSwipe({ dir: 1, exit: 'next' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map/baseList intentionally captured at key change only
  }, [sessionKey])

  const deck = session?.key === sessionKey ? session.deck : null
  const card = deck?.[index]
  const remaining = deck?.length ?? 0
  const originalCount = session?.key === sessionKey ? session.original.length : 0
  const position =
    originalCount <= 0
      ? 0
      : remaining <= 0
        ? originalCount
        : Math.min(originalCount, originalCount - remaining + index + 1)
  const total = remaining

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('[data-card-expanded], [data-card-edit]')) {
        return
      }
      if (!deck?.length) {
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
    if (!total) {
      return
    }
    const next = index + step
    // Stay within the remaining deck — no wrap (avoids 2/9 Previous → 9/9).
    if (next < 0 || next >= total) {
      return
    }
    setSwipe({
      dir: step > 0 ? 1 : -1,
      exit: step > 0 ? 'next' : 'prev',
    })
    setIndex(next)
    setFlipped(false)
  }

  function markCurrent(status: 'learning' | 'known') {
    if (!card || !deck) {
      return
    }
    mark(card.id, status)
    setBurstKind(status)
    setBurstId((value) => value + 1)
    const next = advanceStudyDeck(deck, index, status)
    setSwipe({ dir: 1, exit: status })
    setSession((current) =>
      current ? { ...current, deck: next.deck } : current,
    )
    setIndex(next.index)
    setFlipped(false)
  }

  function startOver() {
    // Full category (or topic) deck — not the last session's filtered subset.
    const full = baseList
    if (!full.length) {
      return
    }
    const nextDeck = shuffleCards(full)
    setSession((current) =>
      current
        ? { ...current, deck: nextDeck, original: [...nextDeck] }
        : current,
    )
    setIndex(0)
    setFlipped(false)
    setSwipe({ dir: 1, exit: 'next' })
  }

  if (deck === null) {
    return <StudyLoading topicId={topicId} category={category} mode={mode} />
  }

  if (deck.length === 0 && (session?.original.length ?? 0) > 0) {
    return (
      <SessionComplete
        topicId={topicId}
        count={session?.original.length ?? 0}
        category={category}
        mode={mode}
        burstId={burstId}
        burstKind={burstKind}
        onStartOver={startOver}
      />
    )
  }

  if (!card) {
    return <EmptyDeck topicId={topicId} category={category} mode={mode} />
  }

  const progressPct = originalCount
    ? Math.round((position / originalCount) * 100)
    : 0
  const topicEmoji = getCategoryEmoji(category ?? card.category, topicId)
  const topicLabel = category ?? topic?.name ?? 'All topics'
  const modeLabel = sessionHint
    ? MODE_LABELS[sessionHint] ?? sessionHint
    : mode
      ? MODE_LABELS[mode] ?? mode
      : 'Shuffled'

  return (
    <div className="mx-auto flex h-full min-h-0 min-w-0 w-full max-w-3xl flex-1 flex-col gap-3 overflow-x-hidden sm:gap-4">
      <div className="shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                <span aria-hidden="true">{topicEmoji}</span>
                <span className="truncate">{topicLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                <IconSpark className="h-3.5 w-3.5 text-sky-300" />
                {modeLabel}
              </span>
            </div>
            <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold sm:text-2xl">
              <IconBook className="h-5 w-5 text-accent" />
              Study session
            </h1>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Card</p>
            <p className="text-sm font-semibold text-white">
              {position}
              <span className="text-slate-500"> / {originalCount}</span>
            </p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-sky-400"
            animate={{ width: `${progressPct}%` }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 24 }}
          />
        </div>
      </div>

      <div className="relative min-h-0 min-w-0 w-full flex-1 overflow-x-hidden">
        <AnimatePresence initial={false} custom={swipe.dir}>
          <motion.div
            key={card.id}
            className="absolute inset-0 min-w-0 max-w-full"
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
              onSaved={(next) => {
                setSession((current) => {
                  if (!current) {
                    return current
                  }
                  const patch = (list: Card[]) =>
                    list.map((item) => (item.id === next.id ? next : item))
                  return {
                    ...current,
                    deck: current.deck ? patch(current.deck) : current.deck,
                    original: patch(current.original),
                  }
                })
              }}
              onDeleted={(id) => {
                setFlipped(false)
                setSession((current) => {
                  if (!current) {
                    return current
                  }
                  const remove = (list: Card[]) => list.filter((item) => item.id !== id)
                  const deck = current.deck ? remove(current.deck) : current.deck
                  return {
                    ...current,
                    deck,
                    original: remove(current.original),
                  }
                })
                setIndex((value) => Math.max(0, value))
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid min-w-0 shrink-0 grid-cols-2 gap-2 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center">
        <motion.button
          type="button"
          className="order-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-3 text-sm hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40 sm:order-1"
          onClick={() => go(-1)}
          disabled={index <= 0}
          whileHover={reduce || index <= 0 ? undefined : { scale: 1.02 }}
          whileTap={reduce || index <= 0 ? undefined : { scale: 0.96 }}
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
          className="order-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-3 text-sm hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => go(1)}
          disabled={index >= total - 1}
          whileHover={reduce || index >= total - 1 ? undefined : { scale: 1.02 }}
          whileTap={reduce || index >= total - 1 ? undefined : { scale: 0.96 }}
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
  topicId,
  category,
  mode,
}: {
  topicId: TopicId
  category: string | null
  mode: string | null
}) {
  const { getTopic } = useTaxonomy()
  const topic = category ?? getTopic(topicId)?.name ?? 'All topics'
  const modeLabel = mode ? MODE_LABELS[mode] ?? mode : 'Shuffled deck'

  return (
    <DeckShuffling
      badge={modeLabel}
      title="Shuffling deck"
      subtitle={`Lining up ${topic.toLowerCase()} cards so you can start flipping right away.`}
      footer="Preparing your session"
    />
  )
}

function SessionComplete({
  topicId,
  count,
  category,
  mode,
  burstId,
  burstKind,
  onStartOver,
}: {
  topicId: TopicId
  count: number
  category: string | null
  mode: string | null
  burstId: number
  burstKind: BurstKind
  onStartOver: () => void
}) {
  const reduce = useReducedMotion()
  const { getTopic, getCategoryEmoji } = useTaxonomy()
  const topic = category ?? getTopic(topicId)?.name ?? 'All topics'
  const modeLabel = mode ? MODE_LABELS[mode] ?? mode : 'Shuffled'

  return (
    <motion.div
      className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col items-center justify-center text-center"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="flex size-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
        initial={reduce ? false : { scale: 0.88 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      >
        <IconCheck className="h-8 w-8" />
      </motion.div>
      <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
        <span aria-hidden="true">{getCategoryEmoji(category ?? '', topicId)}</span>
        {topic}
        <span className="text-slate-500">·</span>
        {modeLabel}
      </span>
      <h1 className="mt-4 text-2xl font-semibold">You have finished the session</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
        You marked all {count} {count === 1 ? 'card' : 'cards'} as known. Start over
        shuffles every card in {category ? 'this category' : 'this topic'} again, not
        only this session's pile. Or head back to the dashboard.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <motion.button
          type="button"
          onClick={onStartOver}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-fg hover:opacity-90"
          whileHover={reduce ? undefined : { scale: 1.03 }}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          transition={tapSpring}
        >
          <IconRefresh className="h-4 w-4" />
          Start over
        </motion.button>
        <Link
          href={topicHref(topicId)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-accent/60"
        >
          Back to dashboard
        </Link>
      </div>
      <CelebrateBurst burstId={burstId} kind={burstKind} />
    </motion.div>
  )
}

function EmptyDeck({
  topicId,
  category,
  mode,
}: {
  topicId: TopicId
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
        className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 text-accent"
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
        pile is empty. Shuffle everything, or reset progress from the dashboard.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={topicHref(topicId, 'study')}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-fg hover:opacity-90"
        >
          <IconShuffle className="h-4 w-4" />
          Shuffle all
        </Link>
        <Link
          href={topicHref(topicId)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-accent/60"
        >
          Back to dashboard
        </Link>
      </div>
    </motion.div>
  )
}