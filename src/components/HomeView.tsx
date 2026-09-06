'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { getCategoriesForTopic } from '@/data/categories'
import { getTopic, type TopicId } from '@/data/topics'
import type { Card } from '@/data/types'
import { getCategoryCounts } from '@/lib/cards'
import { fadeUp, stagger, tapSpring } from '@/lib/motion'
import { topicHref } from '@/lib/paths'
import { countByStatus, useProgress } from '@/lib/progress'

const MotionLink = motion.create(Link)

export function HomeView({ topicId, cards }: { topicId: TopicId; cards: Card[] }) {
  const topic = getTopic(topicId)
  const { map, ready, reset } = useProgress()
  const topicCards = cards
  const categories = getCategoriesForTopic(topicId)
  const counts = getCategoryCounts(cards)
  const totals = countByStatus(
    map,
    topicCards.map((card) => card.id),
  )
  const masteredPct = ready && topicCards.length
    ? Math.round((totals.known / topicCards.length) * 100)
    : 0
  const reduce = useReducedMotion()

  if (!topic) {
    return null
  }

  return (
    <motion.div
      className="space-y-10"
      variants={reduce ? undefined : stagger}
      initial={false}
      animate="show"
    >
      <motion.section
        variants={reduce ? undefined : fadeUp}
        className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 sm:p-10"
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent sm:text-sm sm:tracking-[0.25em]">
          {topic.emoji} {topic.tagline}
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Flip through the facts you flagged while studying.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
          {topicCards.length} cards in {topic.name}, grouped into {categories.length} categories.
          Mark what you know, drill the rest, and keep the wording close to how you will recall it.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
          <MotionLink
            href={topicHref(topicId, 'study', { mode: 'due' })}
            className="rounded-full bg-accent px-5 py-3 text-center text-sm font-semibold text-accent-fg hover:opacity-90"
            whileHover={reduce ? undefined : { scale: 1.03 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={tapSpring}
          >
            Study due cards
          </MotionLink>
          <MotionLink
            href={topicHref(topicId, 'study')}
            className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white hover:border-accent/60"
            whileHover={reduce ? undefined : { scale: 1.03 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={tapSpring}
          >
            Shuffle all
          </MotionLink>
          <MotionLink
            href={topicHref(topicId, 'browse')}
            className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white hover:border-accent/60"
            whileHover={reduce ? undefined : { scale: 1.03 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={tapSpring}
          >
            Browse notes
          </MotionLink>
        </div>
      </motion.section>

      <motion.section
        variants={reduce ? undefined : fadeUp}
        className="grid grid-cols-3 gap-2 sm:gap-4"
      >
        <Stat
          label="Known"
          value={totals.known}
          ready={ready}
          hint={`${masteredPct}% mastered`}
        />
        <Stat
          label="Learning"
          value={totals.learning}
          ready={ready}
          hint="Marked as still shaky"
        />
        <Stat
          label="Unseen"
          value={totals.unseen}
          ready={ready}
          hint={`${topicCards.length} total cards`}
        />
      </motion.section>

      <motion.section variants={reduce ? undefined : fadeUp}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold sm:text-xl">Categories</h2>
          <motion.button
            type="button"
            onClick={() => reset(topicCards.map((card) => card.id))}
            className="shrink-0 text-sm text-slate-400 hover:text-accent"
            whileTap={reduce ? undefined : { scale: 0.96 }}
          >
            Reset progress
          </motion.button>
        </div>
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
                whileHover={reduce ? undefined : { y: -4, scale: 1.01 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                transition={tapSpring}
                className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 hover:border-accent/40 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-2xl">{category.emoji}</p>
                    <h3 className="mt-2 font-semibold text-white">{category.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{category.blurb}</p>
                  </div>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-300">
                    {total}
                  </span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 24 }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">{pct}% known</p>
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
}: {
  label: string
  value: number
  ready: boolean
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 sm:p-5">
      <p className="text-xs text-slate-400 sm:text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white sm:mt-2 sm:text-3xl">
        <AnimatedNumber value={value} ready={ready} />
      </p>
      <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{hint}</p>
    </div>
  )
}
