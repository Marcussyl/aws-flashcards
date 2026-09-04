'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { CATEGORIES } from '@/data/categories'
import { cards, getCategoryCounts } from '@/lib/cards'
import { fadeUp, stagger, tapSpring } from '@/lib/motion'
import { countByStatus, useProgress } from '@/lib/progress'

const MotionLink = motion.create(Link)

export function HomeView() {
  const { map, ready, reset } = useProgress()
  const counts = getCategoryCounts()
  const totals = countByStatus(
    map,
    cards.map((card) => card.id),
  )
  const masteredPct = ready
    ? Math.round((totals.known / cards.length) * 100)
    : 0
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="space-y-10"
      variants={reduce ? undefined : stagger}
      initial={reduce ? false : 'hidden'}
      animate="show"
    >
      <motion.section
        variants={reduce ? undefined : fadeUp}
        className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 p-5 sm:p-10"
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-300 sm:text-sm sm:tracking-[0.25em]">
          Solutions Architect review
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Flip through the AWS facts you flagged while studying.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
          {cards.length} cards, grouped into {CATEGORIES.length} topics from your
          random notes. Mark what you know, drill the rest, and keep exam
          phrasing close to the real test.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
          <MotionLink
            href="/study?mode=due"
            className="rounded-full bg-amber-400 px-5 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-amber-300"
            whileHover={reduce ? undefined : { scale: 1.03 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={tapSpring}
          >
            Study due cards
          </MotionLink>
          <MotionLink
            href="/study"
            className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white hover:border-amber-300/60"
            whileHover={reduce ? undefined : { scale: 1.03 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={tapSpring}
          >
            Shuffle all
          </MotionLink>
          <MotionLink
            href="/browse"
            className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white hover:border-amber-300/60"
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
          hint={`${cards.length} total cards`}
        />
      </motion.section>

      <motion.section variants={reduce ? undefined : fadeUp}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold sm:text-xl">Categories</h2>
          <motion.button
            type="button"
            onClick={reset}
            className="shrink-0 text-sm text-slate-400 hover:text-amber-300"
            whileTap={reduce ? undefined : { scale: 0.96 }}
          >
            Reset progress
          </motion.button>
        </div>
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={reduce ? undefined : stagger}
        >
          {CATEGORIES.map((category) => {
            const total = counts[category.name] ?? 0
            if (!total) {
              return null
            }
            const ids = cards
              .filter((card) => card.category === category.name)
              .map((card) => card.id)
            const stats = countByStatus(map, ids)
            const pct = ready && total ? Math.round((stats.known / total) * 100) : 0
            return (
              <MotionLink
                key={category.name}
                href={`/study?category=${encodeURIComponent(category.name)}`}
                variants={reduce ? undefined : fadeUp}
                whileHover={reduce ? undefined : { y: -4, scale: 1.01 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                transition={tapSpring}
                className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 hover:border-amber-300/40 hover:bg-slate-900"
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
                    className="h-full rounded-full bg-amber-400"
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
