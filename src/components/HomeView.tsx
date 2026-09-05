'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { IconBook, IconRefresh, IconShuffle } from '@/components/icons'
import { getCategoriesForTopic } from '@/data/categories'
import { getTopic, type TopicId } from '@/data/topics'
import { getCardsByTopic, getCategoryCounts } from '@/lib/cards'
import { fadeUp, stagger, tapSpring } from '@/lib/motion'
import { topicHref } from '@/lib/paths'
import { countByStatus, useProgress } from '@/lib/progress'

const MotionLink = motion.create(Link)

export function HomeView({ topicId }: { topicId: TopicId }) {
  const topic = getTopic(topicId)
  const { map, ready, reset } = useProgress()
  const topicCards = getCardsByTopic(topicId)
  const categories = getCategoriesForTopic(topicId)
  const counts = getCategoryCounts(topicId)
  const totals = countByStatus(
    map,
    topicCards.map((card) => card.id),
  )
  const masteredPct = ready && topicCards.length
    ? Math.round((totals.known / topicCards.length) * 100)
    : 0
  const startedCategories = categories.filter((category) => {
    const ids = topicCards
      .filter((card) => card.category === category.name)
      .map((card) => card.id)
    const stats = countByStatus(map, ids)
    return stats.known + stats.learning > 0
  }).length
  const reduce = useReducedMotion()

  if (!topic) {
    return null
  }

  return (
    <motion.div
      className='space-y-10 lg:space-y-12'
      variants={reduce ? undefined : stagger}
      initial={false}
      animate='show'
    >
      <motion.section variants={reduce ? undefined : fadeUp} className='relative'>
        <p className='flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted'>
          <span>Topics</span>
          <span className='text-muted-2'>/</span>
          <span className='inline-flex items-center gap-1.5 font-semibold text-accent'>
            <span className='size-1.5 rounded-full bg-accent' />
            {topic.name}
          </span>
          <span className='text-muted-2'>•</span>
          <span>{topic.tagline}</span>
        </p>
        <div className='mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end'>
          <div className='max-w-2xl'>
            <h1 className='text-[32px] font-semibold leading-10 tracking-tight text-foreground sm:text-[40px] sm:leading-[48px]'>
              {topic.name}
            </h1>
            <p className='mt-2 text-[17px] leading-7 text-muted'>
              {topicCards.length} cards · {startedCategories} of {categories.length} categories started.
              {` ${topic.blurb}`}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <MotionLink
              href={topicHref(topicId, 'study', { mode: 'due' })}
              className='btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm'
              whileHover={reduce ? undefined : { scale: 1.02 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              transition={tapSpring}
            >
              <IconBook className='h-4 w-4' />
              Study due cards
            </MotionLink>
            <MotionLink
              href={topicHref(topicId, 'study')}
              className='btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium'
              whileHover={reduce ? undefined : { scale: 1.02 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              transition={tapSpring}
            >
              <IconShuffle className='h-4 w-4 text-muted' />
              Shuffle all
            </MotionLink>
            <MotionLink
              href={topicHref(topicId, 'browse')}
              className='btn-ghost inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium'
              whileHover={reduce ? undefined : { scale: 1.02 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              transition={tapSpring}
            >
              Browse deck
            </MotionLink>
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={reduce ? undefined : fadeUp}
        className='grid grid-cols-1 gap-4 md:grid-cols-3'
      >
        <Stat
          label='Known'
          value={totals.known}
          ready={ready}
          hint={`${masteredPct}% mastered`}
          tone='secondary'
        />
        <Stat
          label='Learning'
          value={totals.learning}
          ready={ready}
          hint='Marked as still shaky'
          tone='accent'
        />
        <Stat
          label='Unseen'
          value={totals.unseen}
          ready={ready}
          hint={`${topicCards.length} total cards`}
          tone='muted'
        />
      </motion.section>

      <motion.section variants={reduce ? undefined : fadeUp}>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <h2 className='text-xl font-semibold tracking-tight'>Progress by category</h2>
            <span className='rounded bg-[#262a33] px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted'>
              {categories.length} areas
            </span>
          </div>
          <motion.button
            type='button'
            onClick={() => reset(topicCards.map((card) => card.id))}
            className='btn-ghost inline-flex shrink-0 items-center gap-1 px-2 py-1 text-sm'
            whileTap={reduce ? undefined : { scale: 0.96 }}
          >
            <IconRefresh className='h-3.5 w-3.5' />
            Reset progress
          </motion.button>
        </div>
        <motion.div
          className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
          variants={reduce ? undefined : stagger}
        >
          {categories.map((category) => {
            const total = counts[category.name] ?? 0
            if (!total) {
              return null
            }
            const ids = topicCards
              .filter((card) => card.category === category.name)
              .map((card) => card.id)
            const stats = countByStatus(map, ids)
            const pct = ready && total ? Math.round((stats.known / total) * 100) : 0
            return (
              <MotionLink
                key={category.name}
                href={topicHref(topicId, 'study', { category: category.name })}
                variants={reduce ? undefined : fadeUp}
                whileHover={reduce ? undefined : { y: -3, scale: 1.01 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                transition={tapSpring}
                className='surface-card rounded-xl p-5 hover:border-border-strong'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-xl'>{category.emoji}</p>
                    <h3 className='mt-2 font-medium text-foreground'>{category.name}</h3>
                    <p className='mt-1 text-[13px] leading-5 text-muted'>{category.blurb}</p>
                  </div>
                  <span className='rounded-full bg-[#181c24] px-2 py-1 font-mono text-[11px] text-muted'>
                    {total}
                  </span>
                </div>
                <div className='mt-4 h-1.5 overflow-hidden rounded-full bg-[#1e293b]'>
                  <motion.div
                    className='h-full rounded-full bg-accent'
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 24 }}
                  />
                </div>
                <p className='mt-2 font-mono text-[11px] text-muted-2'>{pct}% known</p>
              </MotionLink>
            )
          })}
        </motion.div>
      </motion.section>
    </motion.div>
  )
}

function Stat({
  label,
  value,
  ready,
  hint,
  tone,
}: {
  label: string
  value: number
  ready: boolean
  hint: string
  tone: 'secondary' | 'accent' | 'muted'
}) {
  const dot =
    tone === 'secondary' ? 'bg-secondary' : tone === 'accent' ? 'bg-accent' : 'bg-[#353942]'
  return (
    <div className='surface-card rounded-xl p-5'>
      <div className='flex items-center gap-2'>
        <span className={`size-2 rounded-full ${dot}`} />
        <p className='font-mono text-[11px] uppercase tracking-wider text-muted'>{label}</p>
      </div>
      <p className='mt-2 text-[32px] font-semibold leading-10 tracking-tight text-foreground'>
        <AnimatedNumber value={value} ready={ready} />
      </p>
      <p className='mt-1 text-[13px] text-muted-2'>{hint}</p>
    </div>
  )
}
