'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import {
  IconBook,
  IconInbox,
  IconRefresh,
  IconShuffle,
  IconSpark,
  IconX,
} from '@/components/icons'
import { fadeUp, stagger } from '@/lib/motion'
import { topicHref } from '@/lib/paths'
import {
  clearStudySession,
  getStudySessionStorage,
  listStudySessions,
  type StudySessionSummary,
} from '@/lib/study-session-store'
import { studyProgressPosition } from '@/lib/study-deck'
import type { TopicId } from '@/data/types'
import { useTaxonomy } from '@/lib/taxonomy'

const MODE_LABELS: Record<string, string> = {
  due: 'Remaining',
  known: 'Known',
  learning: 'Still learning',
}

function formatWhen(ms: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toLocaleString()
  }
}

function sessionTitle(
  summary: StudySessionSummary,
  getCategoryEmoji: (name: string, topic?: TopicId) => string,
) {
  if (summary.category) {
    return {
      emoji: getCategoryEmoji(summary.category, summary.topicId as TopicId),
      label: summary.category,
    }
  }
  if (summary.mode) {
    return {
      emoji: '✨',
      label: MODE_LABELS[summary.mode] ?? summary.mode,
    }
  }
  return { emoji: '📚', label: 'All topics (shuffled)' }
}

export function StudySessionPicker({ topicId }: { topicId: TopicId }) {
  const reduce = useReducedMotion()
  const { getCategoryEmoji } = useTaxonomy()
  const [sessions, setSessions] = useState<StudySessionSummary[] | null>(null)

  function refresh() {
    const storage = getStudySessionStorage()
    if (!storage) {
      setSessions([])
      return
    }
    setSessions(listStudySessions(storage, { topicId }))
  }

  useEffect(() => {
    refresh()
  }, [topicId])

  const items = sessions ?? []

  function discard(sessionKey: string) {
    const storage = getStudySessionStorage()
    if (storage) {
      clearStudySession(storage, sessionKey)
    }
    refresh()
  }

  return (
    <motion.div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6"
      variants={reduce ? undefined : stagger}
      initial={false}
      animate="show"
    >
      <motion.section variants={reduce ? undefined : fadeUp} className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
          <IconBook className="h-6 w-6 text-accent" />
          Study sessions
        </h1>
        <p className="text-sm text-slate-400 sm:text-base">
          Pick up a saved run, or start a new one. Sessions stick around for 24 hours of
          inactivity.
        </p>
      </motion.section>

      <motion.section
        variants={reduce ? undefined : fadeUp}
        className="grid gap-2 sm:grid-cols-3"
      >
        <Link
          href={topicHref(topicId, 'study', { mode: 'due' })}
          className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent hover:bg-accent/20"
        >
          Study remaining
        </Link>
        <Link
          href={topicHref(topicId, 'study', { mode: 'shuffle' })}
          className="rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-white hover:border-white/30"
        >
          <span className="inline-flex items-center gap-1.5">
            <IconShuffle className="h-4 w-4" />
            Shuffle all
          </span>
        </Link>
        <Link
          href={topicHref(topicId)}
          className="rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-white hover:border-white/30"
        >
          Pick a category
        </Link>
      </motion.section>

      <motion.section variants={reduce ? undefined : fadeUp} className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Saved sessions</h2>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-accent"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {sessions === null ? (
          <p className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-400">
            Loading sessions…
          </p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 px-4 py-10 text-center">
            <IconInbox className="mx-auto h-6 w-6 text-slate-500" />
            <p className="mt-3 text-sm text-slate-400">No saved sessions for this topic yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Start one above, or open a category from the dashboard.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((session) => {
              const title = sessionTitle(session, getCategoryEmoji)
              const modeLabel = session.mode
                ? MODE_LABELS[session.mode] ?? session.mode
                : session.category
                  ? 'Category run'
                  : 'Shuffled'
              const position = studyProgressPosition(
                session.historyIndex,
                session.originalCount,
              )
              const href = topicHref(topicId, 'study', {
                category: session.category,
                mode: session.mode ?? (session.category ? null : 'shuffle'),
              })
              return (
                <li key={session.sessionKey}>
                  <div className="flex items-stretch gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-2">
                    <Link
                      href={href}
                      className="min-w-0 flex-1 rounded-xl px-3 py-3 hover:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            <span className="mr-1.5" aria-hidden="true">
                              {title.emoji}
                            </span>
                            {title.label}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <IconSpark className="h-3 w-3 text-sky-300" />
                              {modeLabel}
                            </span>
                            {session.completed ? (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-200">
                                Completed
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/60 px-2.5 py-1 text-xs font-semibold text-white">
                          {position}
                          <span className="text-slate-500"> / {session.originalCount}</span>
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 sm:grid-cols-3">
                        <div>
                          <dt className="uppercase tracking-wide">Progress</dt>
                          <dd className="mt-0.5 text-slate-300">
                            {session.remainingCount} left in queue
                          </dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide">Last active</dt>
                          <dd className="mt-0.5 text-slate-300">{formatWhen(session.updatedAt)}</dd>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <dt className="uppercase tracking-wide">Created</dt>
                          <dd className="mt-0.5 text-slate-300">
                            {session.createdAt ? formatWhen(session.createdAt) : '—'}
                          </dd>
                        </div>
                      </dl>
                    </Link>
                    <button
                      type="button"
                      aria-label={`Discard session ${title.label}`}
                      onClick={() => discard(session.sessionKey)}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 px-3 text-slate-400 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-100"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </motion.section>
    </motion.div>
  )
}
