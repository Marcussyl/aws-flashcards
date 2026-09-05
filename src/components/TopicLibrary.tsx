'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { IconChevronRight } from '@/components/icons'
import { TOPICS } from '@/data/topics'
import { getCardsByTopic } from '@/lib/cards'
import { topicHref } from '@/lib/paths'
import { countByStatus, useProgress } from '@/lib/progress'

export function TopicLibrary() {
  const { map, ready } = useProgress()
  const reduce = useReducedMotion()
  const topicStats = TOPICS.map((topic) => {
    const topicCards = getCardsByTopic(topic.id)
    const ids = topicCards.map((card) => card.id)
    const totals = countByStatus(map, ids)
    return { topic, topicCards, totals }
  })
  const totalCards = topicStats.reduce((sum, item) => sum + item.topicCards.length, 0)
  const mastered = topicStats.reduce((sum, item) => sum + item.totals.known, 0)

  return (
    <div className='space-y-8 lg:space-y-12'>
      <section className='max-w-3xl'>
        <div className='flex items-center gap-2'>
          <span className='size-1.5 rounded-full bg-accent' />
          <p className='font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-accent'>
            Personal review
          </p>
          <span className='font-mono text-[11px] text-muted-2'>• Isolated study worlds</span>
        </div>
        <h1 className='mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-[30px] sm:leading-[38px] lg:text-[40px] lg:leading-[48px] lg:tracking-[-0.025em]'>
          Choose what to review today.
        </h1>
        <p className='mt-2 max-w-2xl text-[17px] leading-7 text-muted'>
          Separate decks for each subject you are learning. Progress stays on the
          card, so AWS and Proxmox do not overwrite each other.
        </p>
        <div className='mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-[#181c24] px-4 py-3 font-mono text-[11px]'>
          <span className='flex items-center gap-2'>
            <span className='size-2 rounded-full bg-secondary' />
            <span className='font-semibold text-foreground'>{TOPICS.length}</span>
            <span className='text-muted'>Active topics</span>
          </span>
          <span className='flex items-center gap-2'>
            <span className='font-semibold text-foreground'>{totalCards}</span>
            <span className='text-muted'>Total cards</span>
          </span>
          <span className='flex items-center gap-2'>
            <span className='font-semibold text-secondary'>
              <AnimatedNumber value={mastered} ready={ready} />
            </span>
            <span className='text-muted'>Mastered</span>
          </span>
        </div>
      </section>

      <section className='grid items-stretch gap-4 lg:grid-cols-2 lg:gap-6'>
        {topicStats.map(({ topic, topicCards, totals }) => {
          const ids = topicCards.map((card) => card.id)
          const pct = ready && ids.length ? Math.round((totals.known / ids.length) * 100) : 0
          const learningPct = ready && ids.length ? Math.round((totals.learning / ids.length) * 100) : 0
          return (
            <Link
              key={topic.id}
              href={topicHref(topic.id)}
              data-topic={topic.id}
              className='surface-card surface-card-interactive group relative flex flex-col overflow-hidden rounded-xl p-6'
            >
              <div className='pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent' />
              <div className='relative flex flex-1 flex-col'>
                <div className='mb-4 flex items-center justify-between gap-2'>
                  <span className='inline-flex items-center gap-1.5 rounded bg-[#262a33] px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent'>
                    <span aria-hidden='true'>{topic.emoji}</span>
                    {topic.tagline}
                  </span>
                  <span className='font-mono text-[11px] text-muted-2'>{topicCards.length} cards</span>
                </div>
                <h2 className='text-xl font-semibold tracking-tight text-foreground group-hover:text-accent'>
                  {topic.name}
                </h2>
                <p className='mt-2 line-clamp-2 text-[13px] leading-5 text-muted'>{topic.blurb}</p>
                <div className='mt-6 rounded-lg bg-[#181c24] p-3'>
                  <div className='flex items-center justify-between font-mono text-[11px]'>
                    <span className='font-semibold text-accent'>{pct}% mastered</span>
                    <span className='text-muted'>{topicCards.length} cards total</span>
                  </div>
                  <div className='mt-2 flex h-1.5 overflow-hidden rounded-full bg-[#31353e]'>
                    <motion.div
                      className='h-full bg-accent'
                      initial={false}
                      animate={{ width: `${pct}%` }}
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 24 }}
                    />
                    <motion.div
                      className='h-full bg-accent/40'
                      initial={false}
                      animate={{ width: `${learningPct}%` }}
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 24 }}
                    />
                  </div>
                  <div className='mt-2 grid grid-cols-3 text-center font-mono text-[10px] text-muted'>
                    <MiniStat label='known' value={totals.known} ready={ready} tone='foreground' />
                    <MiniStat label='learning' value={totals.learning} ready={ready} tone='accent' />
                    <MiniStat label='unseen' value={totals.unseen} ready={ready} tone='muted' />
                  </div>
                </div>
                <span className='btn-primary mt-6 inline-flex w-full items-center justify-center gap-1.5 py-2.5 text-[13px]'>
                  Continue review
                  <IconChevronRight className='h-4 w-4' />
                </span>
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}

function MiniStat({
  label,
  value,
  ready,
  tone,
}: {
  label: string
  value: number
  ready: boolean
  tone: 'foreground' | 'accent' | 'muted'
}) {
  const toneClass =
    tone === 'accent' ? 'text-accent' : tone === 'foreground' ? 'text-foreground' : 'text-muted'
  return (
    <div>
      <p className={`text-[13px] font-semibold ${toneClass}`}>
        <AnimatedNumber value={value} ready={ready} />
      </p>
      <p>{label}</p>
    </div>
  )
}
