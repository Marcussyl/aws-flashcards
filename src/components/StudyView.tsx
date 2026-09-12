'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
  IconX,
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
import { countByStatus, useProgress } from '@/lib/progress'
import {
  canGoNext,
  canGoPrev,
  createStudyDeck,
  currentStudyCard,
  goStudyNext,
  goStudyPrev,
  markStudyCard,
  selectStudyCards,
  studyProgressPosition,
  studySessionHint,
  type StudyDeckState,
} from '@/lib/study-deck'
import { StudySessionPicker } from '@/components/StudySessionPicker'
import {
  clearStudySession,
  getStudySessionStorage,
  loadStudySession,
  rehydrateStudySession,
  saveStudySession,
  studySessionStorageKey,
} from '@/lib/study-session-store'
import type { Card, TopicId } from '@/data/types'
import { useTaxonomy } from '@/lib/taxonomy'

type StudySession = {
  key: string
  /** null while progress-backed session is waiting for map readiness */
  deck: StudyDeckState | null
  original: Card[]
  /** Set when the last remaining card is marked known at the live edge. */
  completed: boolean
  /** Progress denominator; kept from the persisted snapshot when restoring. */
  originalCount?: number
}

const MODE_LABELS: Record<string, string> = {
  due: 'Remaining',
  known: 'Known',
  learning: 'Still learning',
  shuffle: 'Shuffled',
}

type Swipe = {
  dir: 1 | -1
  exit: 'next' | 'prev' | 'known' | 'learning'
}

export function StudyView({ topicId, cards }: { topicId: TopicId; cards: Card[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const category = params.get('category')
  const mode = params.get('mode')
  // Bare /study with no target → session picker (resume or start new).
  if (!category && !mode) {
    return <StudySessionPicker topicId={topicId} cards={cards} />
  }
  return (
    <StudySessionRunner topicId={topicId} cards={cards} category={category} mode={mode} />
  )
}

function StudySessionRunner({
  topicId,
  cards,
  category,
  mode,
}: {
  topicId: TopicId
  cards: Card[]
  category: string | null
  mode: string | null
}) {
  const router = useRouter()
  const { map, ready, mark } = useProgress()
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
  const persistKey = studySessionStorageKey(topicId, category, mode)
  const sessionHint = ready
    ? studySessionHint(baseList, map, { category, mode })
    : null

  const initialRestoreRef = useRef<ReturnType<typeof rehydrateStudySession> | null | undefined>(
    undefined,
  )
  if (initialRestoreRef.current === undefined) {
    if (typeof window === 'undefined') {
      initialRestoreRef.current = null
    } else {
      const storage = getStudySessionStorage()
      const stored = storage ? loadStudySession(storage, persistKey) : null
      initialRestoreRef.current = stored
        ? rehydrateStudySession(stored, topicCards)
        : null
    }
  }
  const initialRestore = initialRestoreRef.current

  const [flipped, setFlipped] = useState(() => Boolean(initialRestore?.flipped))
  const [session, setSession] = useState<StudySession | null>(() => {
    if (!initialRestore) {
      return null
    }
    return {
      key: persistKey,
      deck: initialRestore.deck,
      original: initialRestore.original,
      completed: initialRestore.completed,
      originalCount: initialRestore.originalCount,
    }
  })
  /** Only `create` shows the shuffling UI; resume / wait stay neutral. */
  const [bootKind, setBootKind] = useState<'resume' | 'create' | 'wait' | null>(() =>
    initialRestore ? 'resume' : 'wait',
  )
  const hydratedKeyRef = useRef<string | null>(initialRestore ? persistKey : null)
  const createTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore a matching unexpired localStorage session, or shuffle a new deck.
  // Wait for progress only when there is nothing to restore.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- keyed hydrate from localStorage / shuffle; same pattern as the previous sessionKey rebuild */
    if (createTimerRef.current) {
      clearTimeout(createTimerRef.current)
      createTimerRef.current = null
    }

    if (hydratedKeyRef.current === persistKey) {
      return
    }

    const storage = getStudySessionStorage()
    const stored = storage ? loadStudySession(storage, persistKey) : null
    const restored = stored ? rehydrateStudySession(stored, topicCards) : null

    if (restored) {
      hydratedKeyRef.current = persistKey
      setBootKind('resume')
      setSession({
        key: persistKey,
        deck: restored.deck,
        original: restored.original,
        completed: restored.completed,
        originalCount: restored.originalCount,
      })
      setFlipped(restored.flipped)
      setSwipe({ dir: 1, exit: 'next' })
      return
    }

    if (usesProgress && !ready) {
      setBootKind('wait')
      setSession({
        key: persistKey,
        deck: null,
        original: [],
        completed: false,
      })
      return
    }

    const shuffled = shuffleCards(selectStudyCards(baseList, map, { category, mode }))
    const nextSession: StudySession = {
      key: persistKey,
      deck: createStudyDeck(shuffled),
      original: [...shuffled],
      completed: false,
    }
    setBootKind('create')
    setSession({
      key: persistKey,
      deck: null,
      original: [],
      completed: false,
    })
    setFlipped(false)
    setSwipe({ dir: 1, exit: 'next' })
    createTimerRef.current = setTimeout(() => {
      hydratedKeyRef.current = persistKey
      setSession(nextSession)
      createTimerRef.current = null
    }, 650)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map/baseList captured at persistKey / ready only
  }, [persistKey, ready, usesProgress])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      if (createTimerRef.current) {
        clearTimeout(createTimerRef.current)
      }
    }
  }, [])

  // Persist after session mutations and bump TTL (last activity).
  useEffect(() => {
    if (!session || session.key !== persistKey || !session.deck) {
      return
    }
    const storage = getStudySessionStorage()
    if (!storage) {
      return
    }
    saveStudySession(storage, {
      sessionKey: persistKey,
      historyIds: session.deck.history.map((item) => item.id),
      remainingIds: session.deck.remaining.map((item) => item.id),
      historyIndex: session.deck.historyIndex,
      originalCount: session.originalCount ?? session.original.length,
      flipped,
      completed: session.completed,
    })
  }, [session, flipped, persistKey])

  const deck = session?.key === persistKey ? session.deck : null
  const card = deck ? currentStudyCard(deck) : undefined
  const originalCount =
    session?.key === persistKey
      ? (session.originalCount ?? session.original.length)
      : 0
  // Visit position in session history (1-based), capped so Still learning re-queues
  // cannot push the counter past the original session size (e.g. 5/1).
  const position =
    deck && deck.history.length > 0
      ? studyProgressPosition(deck.historyIndex, originalCount)
      : 0
  const prevEnabled = deck ? canGoPrev(deck) : false
  const nextEnabled = deck ? canGoNext(deck) : false

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('[data-card-expanded], [data-card-edit]')) {
        return
      }
      if (!deck || deck.history.length === 0) {
        return
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        setFlipped((value) => !value)
      } else if (event.key === 'ArrowUp') {
        go(-1)
      } else if (event.key === 'ArrowDown') {
        go(1)
      } else if (event.key === 'ArrowLeft') {
        markCurrent('learning')
      } else if (event.key === 'ArrowRight') {
        markCurrent('known')
      } else if (event.key === '1') {
        markCurrent('learning')
      } else if (event.key === '2') {
        markCurrent('known')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function updateDeck(next: StudyDeckState, completed?: boolean) {
    setSession((current) =>
      current
        ? {
            ...current,
            deck: next,
            ...(completed === undefined ? {} : { completed }),
          }
        : current,
    )
  }

  function go(step: number) {
    if (!deck) {
      return
    }
    if (step < 0) {
      if (!canGoPrev(deck)) {
        return
      }
      setSwipe({ dir: -1, exit: 'prev' })
      updateDeck(goStudyPrev(deck))
      setFlipped(false)
      return
    }
    if (!canGoNext(deck)) {
      return
    }
    setSwipe({ dir: 1, exit: 'next' })
    updateDeck(goStudyNext(deck))
    setFlipped(false)
  }

  function markCurrent(status: 'learning' | 'known') {
    if (!card || !deck) {
      return
    }
    mark(card.id, status)
    setBurstKind(status)
    setBurstId((value) => value + 1)
    setSwipe({ dir: 1, exit: status })
    const next = markStudyCard(deck, status)
    // Complete only after known empties the live queue at the edge — browsing
    // history with an empty remaining list still shows cards.
    const finished =
      status === 'known' &&
      next.remaining.length === 0 &&
      next.historyIndex >= next.history.length - 1
    updateDeck(next, finished)
    setFlipped(false)
  }

  function startOver() {
    // Full category (or topic) deck — not the last session's filtered subset.
    const full = baseList
    if (!full.length) {
      return
    }
    const nextDeck = shuffleCards(full)
    const state = createStudyDeck(nextDeck)
    hydratedKeyRef.current = persistKey
    setSession((current) =>
      current
        ? {
            ...current,
            key: persistKey,
            deck: state,
            original: [...nextDeck],
            completed: false,
            originalCount: nextDeck.length,
          }
        : {
            key: persistKey,
            deck: state,
            original: [...nextDeck],
            completed: false,
            originalCount: nextDeck.length,
          },
    )
    setFlipped(false)
    setSwipe({ dir: 1, exit: 'next' })
  }

  function endSession() {
    const storage = getStudySessionStorage()
    if (storage) {
      clearStudySession(storage, persistKey)
    }
    // Leave study — do not reshuffle in place (that felt like a progress reset).
    router.push(topicHref(topicId))
  }

  if (deck === null) {
    return (
      <StudyLoading
        topicId={topicId}
        category={category}
        mode={mode}
        kind={
          session?.key === persistKey && bootKind === 'create' ? 'shuffle' : 'resume'
        }
      />
    )
  }

  if (session?.completed && originalCount > 0) {
    return (
      <SessionComplete
        topicId={topicId}
        count={originalCount}
        category={category}
        mode={mode}
        burstId={burstId}
        burstKind={burstKind}
        onStartOver={startOver}
        onEndSession={endSession}
      />
    )
  }

  if (!card) {
    return (
      <EmptyDeck
        topicId={topicId}
        category={category}
        mode={mode}
        onEndSession={endSession}
      />
    )
  }

  const progressPct = originalCount
    ? Math.min(100, Math.round((position / originalCount) * 100))
    : 0
  const topicEmoji = getCategoryEmoji(category ?? card.category, topicId)
  const topicLabel = category ?? topic?.name ?? 'All topics'
  const modeLabel = sessionHint
    ? MODE_LABELS[sessionHint] ?? sessionHint
    : mode
      ? MODE_LABELS[mode] ?? mode
      : 'Shuffled'
  const statusCounts = countByStatus(
    map,
    (session?.original ?? []).map((item) => item.id),
  )

  return (
    <div className="mx-auto flex h-full min-h-0 min-w-0 w-full max-w-3xl flex-1 flex-col gap-3 overflow-x-hidden sm:gap-4">
      <div className="shrink-0 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                <span aria-hidden="true">{topicEmoji}</span>
                <span className="truncate">{topicLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                <IconSpark className="h-3.5 w-3.5 text-sky-300" />
                {modeLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-200">
                <span className="tabular-nums">{ready ? statusCounts.learning : '—'}</span>
                learning
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-1 text-xs font-medium text-slate-300">
                <span className="tabular-nums">{ready ? statusCounts.unseen : '—'}</span>
                unseen
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
                <span className="tabular-nums">{ready ? statusCounts.known : '—'}</span>
                known
              </span>
            </div>
            <motion.button
              type="button"
              onClick={endSession}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-100"
              whileHover={reduce ? undefined : { scale: 1.03 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={tapSpring}
              aria-label="End session"
            >
              <IconX className="h-3.5 w-3.5" />
              End session
            </motion.button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="flex min-w-0 items-center gap-2 text-xl font-semibold sm:text-2xl">
              <IconBook className="h-5 w-5 shrink-0 text-accent" />
              Study session
            </h1>
            <div className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-white">
              {position}
              <span className="text-slate-500"> / {originalCount}</span>
            </div>
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
            key={`${card.id}-${deck.historyIndex}`}
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
                  if (!current?.deck) {
                    return current
                  }
                  const patch = (list: Card[]) =>
                    list.map((item) => (item.id === next.id ? next : item))
                  return {
                    ...current,
                    deck: {
                      ...current.deck,
                      history: patch(current.deck.history),
                      remaining: patch(current.deck.remaining),
                    },
                    original: patch(current.original),
                  }
                })
              }}
              onDeleted={(id) => {
                setFlipped(false)
                setSession((current) => {
                  if (!current?.deck) {
                    return current
                  }
                  const remove = (list: Card[]) => list.filter((item) => item.id !== id)
                  const history = remove(current.deck.history)
                  const historyIndex = Math.min(
                    current.deck.historyIndex,
                    Math.max(0, history.length - 1),
                  )
                  return {
                    ...current,
                    deck: {
                      history,
                      historyIndex,
                      remaining: remove(current.deck.remaining),
                    },
                    original: remove(current.original),
                  }
                })
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
          disabled={!prevEnabled}
          whileHover={reduce || !prevEnabled ? undefined : { scale: 1.02 }}
          whileTap={reduce || !prevEnabled ? undefined : { scale: 0.96 }}
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
          disabled={!nextEnabled}
          whileHover={reduce || !nextEnabled ? undefined : { scale: 1.02 }}
          whileTap={reduce || !nextEnabled ? undefined : { scale: 0.96 }}
          transition={tapSpring}
        >
          Next
          <IconChevronRight className="h-4 w-4" />
        </motion.button>
      </div>
      <p className="hidden shrink-0 text-center text-xs text-slate-500 sm:block">
        Space = flip · ↑↓ = navigate · ← = learning · → = known
      </p>
      <CelebrateBurst burstId={burstId} kind={burstKind} />
    </div>
  )
}

function StudyLoading({
  topicId,
  category,
  mode,
  kind,
}: {
  topicId: TopicId
  category: string | null
  mode: string | null
  kind: 'shuffle' | 'resume'
}) {
  const { getTopic } = useTaxonomy()
  const topic = category ?? getTopic(topicId)?.name ?? 'All topics'
  const modeLabel = mode ? MODE_LABELS[mode] ?? mode : 'Shuffled deck'

  if (kind === 'shuffle') {
    return (
      <DeckShuffling
        badge={modeLabel}
        title="Shuffling deck"
        subtitle={`Lining up ${topic.toLowerCase()} cards so you can start flipping right away.`}
        footer="Preparing your session"
      />
    )
  }

  return (
    <div
      className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col items-center justify-center px-2 text-center"
      aria-busy="true"
      aria-label="Resuming session"
    >
      <div className="h-14 w-14 animate-pulse rounded-2xl border border-white/10 bg-slate-900/80" />
      <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
        {modeLabel}
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-white">Resuming session</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
        Picking up {topic.toLowerCase()} where you left off.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex size-2 animate-pulse rounded-full bg-accent" />
        Loading your cards
      </div>
    </div>
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
  onEndSession,
}: {
  topicId: TopicId
  count: number
  category: string | null
  mode: string | null
  burstId: number
  burstKind: BurstKind
  onStartOver: () => void
  onEndSession: () => void
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
        shuffles every card in {category ? 'this category' : 'this topic'} again.
        End session clears this saved run (not Mongo progress) and returns to the
        dashboard.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
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
        <motion.button
          type="button"
          onClick={onEndSession}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-100"
          whileHover={reduce ? undefined : { scale: 1.03 }}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          transition={tapSpring}
        >
          <IconX className="h-4 w-4" />
          End session
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
  onEndSession,
}: {
  topicId: TopicId
  category: string | null
  mode: string | null
  onEndSession: () => void
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
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Link
          href={topicHref(topicId, 'study')}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-fg hover:opacity-90"
        >
          <IconShuffle className="h-4 w-4" />
          Shuffle all
        </Link>
        <button
          type="button"
          onClick={onEndSession}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-100"
        >
          <IconX className="h-4 w-4" />
          End session
        </button>
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
