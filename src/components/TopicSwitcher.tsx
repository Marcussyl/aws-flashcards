'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconChevronDown } from '@/components/icons'
import { TOPICS, type TopicId } from '@/data/topics'
import { getCardsByTopic } from '@/lib/cards'
import { countByStatus, useProgress } from '@/lib/progress'
import { topicHref } from '@/lib/paths'

function destForTopic(pathname: string, topic: TopicId) {
  if (pathname.includes('/study')) {
    return topicHref(topic, 'study')
  }
  if (pathname.includes('/browse')) {
    return topicHref(topic, 'browse')
  }
  return topicHref(topic)
}

export function TopicSwitcher({ topicId }: { topicId: TopicId }) {
  const pathname = usePathname()
  const { map, ready } = useProgress()
  const [openForPath, setOpenForPath] = useState<string | null>(null)
  const open = openForPath === pathname
  const menuId = useId()
  const reduce = useReducedMotion()
  const current = TOPICS.find((item) => item.id === topicId)

  useEffect(() => {
    if (!open) {
      return
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenForPath(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!current) {
    return null
  }

  return (
    <div className='relative'>
      <button
        type='button'
        className='inline-flex max-w-[11rem] items-center gap-1.5 rounded-lg bg-[#181c24] px-2.5 py-1 text-[13px] font-medium text-foreground hover:bg-surface-3 sm:max-w-none sm:px-3'
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpenForPath((currentPath) => (currentPath === pathname ? null : pathname))}
      >
        <span className='size-2 shrink-0 rounded-full bg-accent' aria-hidden='true' />
        <span className='truncate'>{current.name}</span>
        <IconChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            className='absolute left-0 top-full z-50 mt-2 w-72 origin-top-left rounded-xl border border-border-strong bg-surface-2/95 p-1 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.75)] backdrop-blur-xl'
            initial={reduce ? false : { opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
          >
            {TOPICS.map((topic) => {
              const ids = getCardsByTopic(topic.id).map((card) => card.id)
              const totals = countByStatus(map, ids)
              const pct = ready && ids.length ? Math.round((totals.known / ids.length) * 100) : 0
              const active = topic.id === topicId
              return (
                <Link
                  key={topic.id}
                  href={destForTopic(pathname, topic.id)}
                  className={`flex items-start gap-3 rounded-[10px] px-3 py-2.5 hover:bg-surface-3 ${
                    active ? 'bg-surface-3' : ''
                  }`}
                  onClick={() => setOpenForPath(null)}
                >
                  <span className='text-lg' aria-hidden='true'>
                    {topic.emoji}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block text-sm font-medium text-foreground'>{topic.name}</span>
                    <span className='mt-0.5 block text-xs text-muted'>{topic.tagline}</span>
                  </span>
                  <span className='shrink-0 font-mono text-[11px] text-muted-2'>{pct}%</span>
                </Link>
              )
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
