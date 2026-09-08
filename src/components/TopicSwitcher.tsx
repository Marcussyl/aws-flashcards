'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconChevronDown } from '@/components/icons'
import type { TopicId } from '@/data/types'
import { countByStatus, useProgress } from '@/lib/progress'
import { topicHref } from '@/lib/paths'
import { useTaxonomy } from '@/lib/taxonomy'

function destForTopic(pathname: string, topic: TopicId) {
  if (pathname.includes('/study')) {
    return topicHref(topic, 'study')
  }
  if (pathname.includes('/browse')) {
    return topicHref(topic, 'browse')
  }
  return topicHref(topic)
}

type IdsByTopic = Record<string, string[]>

const IDS_TTL_MS = 60_000
let idsModuleCache: { at: number; data: IdsByTopic } | null = null
let idsInflight: Promise<IdsByTopic> | null = null

async function loadIdsByTopic(): Promise<IdsByTopic> {
  if (idsModuleCache && Date.now() - idsModuleCache.at < IDS_TTL_MS) {
    return idsModuleCache.data
  }
  if (!idsInflight) {
    idsInflight = fetch('/api/cards?idsOnly=1')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load card ids')
        }
        return response.json() as Promise<Array<{ id: string; topic: TopicId }>>
      })
      .then((rows) => {
        const next: IdsByTopic = {}
        if (Array.isArray(rows)) {
          for (const row of rows) {
            const list = next[row.topic] ?? []
            list.push(row.id)
            next[row.topic] = list
          }
        }
        idsModuleCache = { at: Date.now(), data: next }
        return next
      })
      .catch(() => {
        idsModuleCache = { at: Date.now(), data: {} }
        return {} as IdsByTopic
      })
      .finally(() => {
        idsInflight = null
      })
  }
  return idsInflight
}

export function TopicSwitcher({ topicId }: { topicId: TopicId }) {
  const pathname = usePathname()
  const { map, ready } = useProgress()
  const { topics, getTopic } = useTaxonomy()
  const [openForPath, setOpenForPath] = useState<string | null>(null)
  const [idsByTopic, setIdsByTopic] = useState<IdsByTopic>(
    () => idsModuleCache?.data ?? {},
  )
  const open = openForPath === pathname
  const menuId = useId()
  const reduce = useReducedMotion()
  const current = getTopic(topicId)

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

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    void loadIdsByTopic().then((next) => {
      if (!cancelled) {
        setIdsByTopic(next)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open])

  if (!current) {
    return null
  }

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-accent/40 hover:text-white sm:max-w-none sm:px-3 sm:text-sm"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpenForPath((currentPath) => (currentPath === pathname ? null : pathname))}
      >
        <span aria-hidden="true">{current.emoji}</span>
        <span className="truncate">{current.name}</span>
        <IconChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            className="absolute left-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] origin-top-left rounded-2xl border border-white/10 bg-slate-900/95 p-1 shadow-2xl backdrop-blur"
            initial={reduce ? false : { opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
          >
            {topics.map((topic) => {
              const ids = idsByTopic[topic.id] ?? []
              const totals = countByStatus(map, ids)
              const pct = ready && ids.length ? Math.round((totals.known / ids.length) * 100) : 0
              const active = topic.id === topicId
              return (
                <Link
                  key={topic.id}
                  href={destForTopic(pathname, topic.id)}
                  className={`flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-white/10 ${
                    active ? 'bg-white/10' : ''
                  }`}
                  onClick={() => setOpenForPath(null)}
                >
                  <span className="text-lg" aria-hidden="true">
                    {topic.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">{topic.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">{topic.tagline}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">{pct}%</span>
                </Link>
              )
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
