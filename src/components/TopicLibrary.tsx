'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { TOPICS } from '@/data/topics'
import { getCardsByTopic } from '@/lib/cards'
import { fadeUp, stagger, tapSpring } from '@/lib/motion'
import { topicHref } from '@/lib/paths'
import { countByStatus, useProgress } from '@/lib/progress'

const MotionLink = motion.create(Link)

export function TopicLibrary() {
  const { map, ready } = useProgress()
  const reduce = useReducedMotion()
  const totalCards = TOPICS.reduce((sum, topic) => sum + getCardsByTopic(topic.id).length, 0)

  return (
    <motion.div
      className="space-y-10"
      variants={reduce ? undefined : stagger}
      initial={false}
      animate="show"
    >
      <motion.section variants={reduce ? undefined : fadeUp} className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent sm:text-sm sm:tracking-[0.25em]">
          Personal review
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Pick a topic to review.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
          Separate decks for each subject you are learning. Progress stays on the
          card, so AWS and Proxmox do not overwrite each other.
        </p>
        <p className="mt-3 text-xs text-slate-500">{totalCards} cards across {TOPICS.length} topics</p>
      </motion.section>

      <motion.section
        className="grid gap-4 lg:grid-cols-2"
        variants={reduce ? undefined : stagger}
      >
        {TOPICS.map((topic) => {
          const topicCards = getCardsByTopic(topic.id)
          const ids = topicCards.map((card) => card.id)
          const totals = countByStatus(map, ids)
          const pct = ready && ids.length ? Math.round((totals.known / ids.length) * 100) : 0
          return (
            <MotionLink
              key={topic.id}
              href={topicHref(topic.id)}
              data-topic={topic.id}
              variants={reduce ? undefined : fadeUp}
              whileHover={reduce ? undefined : { y: -4, scale: 1.01 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              transition={tapSpring}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 hover:border-accent/40 hover:bg-slate-900 sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-3xl" aria-hidden="true">
                    {topic.emoji}
                  </p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-accent">
                    {topic.tagline}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{topic.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{topic.blurb}</p>
                </div>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                  {topicCards.length}
                </span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                <MiniStat label="Known" value={totals.known} ready={ready} />
                <MiniStat label="Learning" value={totals.learning} ready={ready} />
                <MiniStat label="Unseen" value={totals.unseen} ready={ready} />
              </div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 24 }}
                />
              </div>
              <p className="mt-3 text-sm font-medium text-accent group-hover:underline">
                Continue review
              </p>
            </MotionLink>
          )
        })}
      </motion.section>
    </motion.div>
  )
}

function MiniStat({
  label,
  value,
  ready,
}: {
  label: string
  value: number
  ready: boolean
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        <AnimatedNumber value={value} ready={ready} />
      </p>
    </div>
  )
}
