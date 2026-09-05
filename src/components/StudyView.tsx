'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CelebrateBurst, type BurstKind } from '@/components/CelebrateBurst'
import { FlashCard } from '@/components/FlashCard'
import { Keycap } from '@/components/Keycap'
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconInbox,
  IconLayers,
  IconRefresh,
  IconShuffle,
} from '@/components/icons'
import { getCategoryEmoji } from '@/data/categories'
import { getTopic, type TopicId } from '@/data/topics'
import { getCardsByTopic, shuffleCards } from '@/lib/cards'
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
import type { Card } from '@/data/types'

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

export function StudyView({ topicId }: { topicId: TopicId }) {
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
  const topic = getTopic(topicId)

  const topicCards = useMemo(() => getCardsByTopic(topicId), [topicId])

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

  if (session?.key !== sessionKey) {
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
  }

  const deck = session?.key === sessionKey ? session.deck : null
  const card = deck?.[index]
  const total = deck?.length ?? 0

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('[data-card-expanded]')) {
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
    const original = session?.original ?? []
    if (!original.length) {
      return
    }
    setSession((current) =>
      current
        ? { ...current, deck: shuffleCards(original) }
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

  const progressPct = total ? Math.round(((index + 1) / total) * 100) : 0
  const topicEmoji = getCategoryEmoji(category ?? card.category, topicId)
  const topicLabel = category ?? topic?.name ?? 'All topics'
  const modeLabel = sessionHint
    ? MODE_LABELS[sessionHint] ?? sessionHint
    : mode
      ? MODE_LABELS[mode] ?? mode
      : 'Shuffled'

  return (
    <div className='mx-auto flex h-full min-h-0 w-full max-w-[720px] flex-1 flex-col gap-4'>
      <div className='relative -mx-4 h-1 shrink-0 overflow-hidden bg-[#0a0e16] sm:-mx-0 sm:rounded-full'>
        <motion.div
          className='h-full bg-accent shadow-[0_0_12px_color-mix(in_oklab,var(--accent)_50%,transparent)]'
          animate={{ width: `${progressPct}%` }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 24 }}
        />
      </div>

      <div className='flex shrink-0 items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-wrap items-center gap-2'>
          <span className='inline-flex items-center gap-2 rounded bg-surface-3 px-2.5 py-1 text-[13px] font-semibold text-foreground'>
            <span className='size-2 rounded-full bg-accent shadow-[0_0_8px_color-mix(in_oklab,var(--accent)_80%,transparent)]' />
            {topic?.name ?? 'Memori'}
          </span>
          <span className='inline-flex items-center gap-1.5 rounded bg-[#181c24] px-2.5 py-1 font-mono text-[11px] text-muted'>
            <span aria-hidden='true'>{topicEmoji}</span>
            {topicLabel}
          </span>
          <span className='hidden items-center gap-1.5 rounded bg-[#0a0e16] px-2 py-1 font-mono text-[11px] text-muted sm:inline-flex'>
            <span className='size-1.5 rounded-full bg-secondary' />
            {modeLabel}
          </span>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <span className='rounded bg-[#181c24] px-2.5 py-1 font-mono text-[11px]'>
            <span className='font-medium text-accent'>Card {String(index + 1).padStart(2, '0')}</span>
            <span className='text-muted-2'> / {total}</span>
          </span>
          <Link
            href={topicHref(topicId)}
            className='btn-ghost hidden px-2.5 py-1 text-[13px] sm:inline-flex'
          >
            Exit
          </Link>
        </div>
      </div>

      <div className='relative min-h-0 flex-1'>
        <AnimatePresence initial={false} custom={swipe.dir}>
          <motion.div
            key={card.id}
            className='absolute inset-0'
            custom={swipe.dir}
            variants={cardSwipe}
            initial={reduce ? false : 'enter'}
            animate='center'
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

      <div className='grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center'>
        <motion.button
          type='button'
          className='btn-secondary order-3 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm sm:order-1'
          onClick={() => go(-1)}
          whileHover={reduce ? undefined : { scale: 1.02 }}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          transition={tapSpring}
        >
          <IconChevronLeft className='h-4 w-4' />
          Previous
          <Keycap className='hidden sm:inline-flex'>←</Keycap>
        </motion.button>
        <motion.button
          type='button'
          className='order-1 inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 hover:bg-rose-500/20'
          onClick={() => markCurrent('learning')}
          whileHover={reduce ? undefined : { scale: 1.02 }}
          whileTap={reduce ? undefined : { scale: 0.96, x: [0, -3, 3, -2, 0] }}
          transition={tapSpring}
        >
          <IconRefresh className='h-4 w-4' />
          Still learning
          <Keycap className='hidden sm:inline-flex'>1</Keycap>
        </motion.button>
        <motion.button
          type='button'
          className='order-2 inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-secondary px-4 py-2.5 text-sm font-semibold text-[#003731] hover:opacity-90'
          onClick={() => markCurrent('known')}
          whileHover={reduce ? undefined : { scale: 1.03 }}
          whileTap={reduce ? undefined : { scale: 0.95 }}
          transition={tapSpring}
        >
          <IconCheck className='h-4 w-4' />
          I know this
          <Keycap className='hidden sm:inline-flex'>2</Keycap>
        </motion.button>
        <motion.button
          type='button'
          className='btn-secondary order-4 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm'
          onClick={() => go(1)}
          whileHover={reduce ? undefined : { scale: 1.02 }}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          transition={tapSpring}
        >
          Next
          <IconChevronRight className='h-4 w-4' />
          <Keycap className='hidden sm:inline-flex'>→</Keycap>
        </motion.button>
      </div>
      <p className='hidden shrink-0 items-center justify-center gap-2 text-center text-xs text-muted-2 sm:flex'>
        <Keycap>Space</Keycap> flip
        <span>·</span>
        arrows navigate
        <span>·</span>
        <Keycap>1</Keycap> learning
        <span>·</span>
        <Keycap>2</Keycap> known
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
  const topic = category ?? getTopic(topicId)?.name ?? 'All topics'
  const modeLabel = mode ? MODE_LABELS[mode] ?? mode : 'Shuffled deck'
  const reduce = useReducedMotion()

  return (
    <div className='mx-auto flex h-full min-h-0 w-full max-w-lg flex-1 flex-col items-center justify-center px-2 text-center'>
      <div className='relative h-[9.5rem] w-[7.5rem]' aria-hidden='true'>
        <motion.span
          className='absolute inset-0 rounded-xl border border-border shadow-[0_18px_40px_rgba(0,0,0,0.35)]'
          style={{ background: 'linear-gradient(180deg, #161f30, #111827)' }}
          initial={{ rotate: -10, x: -12, y: 8 }}
          animate={reduce ? undefined : { y: [8, 0, 8] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className='absolute inset-0 rounded-xl border border-border shadow-[0_18px_40px_rgba(0,0,0,0.35)]'
          style={{ background: 'linear-gradient(180deg, #1c2028, #0b0f17)' }}
          initial={{ rotate: 8, x: 14, y: 6 }}
          animate={reduce ? undefined : { y: [6, -2, 6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
        />
        <motion.span
          className='absolute inset-0 flex items-center justify-center rounded-xl border border-border-strong shadow-[0_18px_40px_rgba(0,0,0,0.35)]'
          style={{
            background:
              'radial-gradient(circle at top right, color-mix(in oklab, var(--accent) 20%, transparent), transparent 40%), linear-gradient(180deg, #161f30, #111827)',
          }}
          animate={reduce ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        >
          <IconLayers className='h-8 w-8 text-accent' />
        </motion.span>
      </div>
      <span className='mt-8 inline-flex items-center gap-2 rounded bg-[#181c24] px-3 py-1 font-mono text-[11px] font-medium text-accent'>
        <IconShuffle className='h-3.5 w-3.5' />
        {modeLabel}
      </span>
      <h1 className='mt-4 text-2xl font-semibold text-foreground'>Shuffling deck</h1>
      <p className='mt-2 max-w-sm text-sm leading-6 text-muted'>
        Lining up {topic.toLowerCase()} cards so you can start flipping right away.
      </p>
      <div className='mt-6 flex items-center gap-2 text-xs text-muted-2'>
        <span className='inline-flex size-2 animate-pulse rounded-full bg-accent' />
        Preparing your session
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
  const topic = category ?? getTopic(topicId)?.name ?? 'All topics'
  const modeLabel = mode ? MODE_LABELS[mode] ?? mode : 'Shuffled'

  return (
    <motion.div
      className='mx-auto flex h-full w-full max-w-lg flex-1 flex-col items-center justify-center text-center'
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className='flex size-16 items-center justify-center rounded-xl border border-secondary/30 bg-secondary/10 text-secondary'
        initial={reduce ? false : { scale: 0.88 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      >
        <IconCheck className='h-8 w-8' />
      </motion.div>
      <span className='mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#0a0e16] px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-accent'>
        <span className='size-1.5 rounded-full bg-accent' />
        {topic}
        <span className='text-muted-2'>·</span>
        {modeLabel}
      </span>
      <h1 className='mt-4 text-[32px] font-semibold tracking-tight sm:text-[40px]'>Session complete</h1>
      <p className='mt-3 max-w-sm text-[17px] leading-7 text-muted'>
        You marked all {count} {count === 1 ? 'card' : 'cards'} as known. Review again, or head back to the topic.
      </p>
      <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
        <motion.button
          type='button'
          onClick={onStartOver}
          className='btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm'
          whileHover={reduce ? undefined : { scale: 1.03 }}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          transition={tapSpring}
        >
          <IconRefresh className='h-4 w-4' />
          Review again
        </motion.button>
        <Link
          href={topicHref(topicId)}
          className='btn-secondary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold'
        >
          Back to topic
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
      className='mx-auto flex h-full w-full max-w-lg flex-1 flex-col items-center justify-center text-center'
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className='flex size-16 items-center justify-center rounded-xl border border-border bg-surface text-accent'
        initial={reduce ? false : { scale: 0.88 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      >
        <IconInbox className='h-8 w-8' />
      </motion.div>
      <h1 className='mt-5 text-[32px] font-semibold tracking-tight'>No cards in this filter</h1>
      <p className='mt-3 max-w-sm text-[17px] leading-7 text-muted'>
        {category ? `${category} ` : 'This '}
        {mode ? `${MODE_LABELS[mode] ?? mode} ` : ''}
        pile is empty. Shuffle everything, or reset progress from the dashboard.
      </p>
      <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
        <Link
          href={topicHref(topicId, 'study')}
          className='btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm'
        >
          <IconShuffle className='h-4 w-4' />
          Shuffle all
        </Link>
        <Link
          href={topicHref(topicId)}
          className='btn-secondary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold'
        >
          Back to topic
        </Link>
      </div>
    </motion.div>
  )
}
