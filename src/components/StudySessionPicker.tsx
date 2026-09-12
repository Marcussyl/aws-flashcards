'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import {
  IconBook,
  IconChevronRight,
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
  shuffle: 'Shuffled',
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

function modeChip(summary: StudySessionSummary) {
  if (summary.mode) {
    return MODE_LABELS[summary.mode] ?? summary.mode
  }
  if (summary.category) {
    return 'Category'
  }
  return 'Shuffled'
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
          className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-center text-sm font-semibold text-accent hover:bg-accent/20"
        >
          Study remaining
        </Link>
        <Link
          href={topicHref(topicId, 'study', { mode: 'shuffle' })}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-white hover:border-white/30"
        >
          <IconShuffle className="h-4 w-4" />
          Shuffle all
        </Link>
        <Link
          href={topicHref(topicId)}
          className="rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 text-center text-sm font-semibold text-white hover:border-white/30"
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
              const chip = modeChip(session)
              const position = studyProgressPosition(
                session.historyIndex,
                session.originalCount,
              )
              const pct = session.originalCount
                ? Math.min(
                    100,
                    Math.round((position / session.originalCount) * 100),
                  )
                : 0
              const href = topicHref(topicId, 'study', {
                category: session.category,
                mode: session.mode ?? (session.category ? null : 'shuffle'),
              })
              const showCreated =
                session.createdAt != null &&
                Math.abs(session.createdAt - session.updatedAt) > 60_000

              return (
                <li key={session.sessionKey}>
                  <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-4 shadow-sm transition hover:border-accent/35 hover:shadow-[0_0_0_1px_rgba(251,191,36,0.12)]">
                    <button
                      type="button"
                      aria-label={`Discard session ${title.label}`}
                      onClick={() => discard(session.sessionKey)}
                      className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-slate-400 opacity-80 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-100 group-hover:opacity-100"
                    >
                      <IconX className="h-3.5 w-3.5" />
                    </button>

                    <Link href={href} className="block pr-10">
                      <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl">
                          <span aria-hidden="true">{title.emoji}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-white">
                              {title.label}
                            </h3>
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[11px] font-medium text-sky-200">
                              <IconSpark className="h-3 w-3" />
                              {chip}
                            </span>
                            {session.completed ? (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                                Completed
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Active {formatWhen(session.updatedAt)}
                            {showCreated
                              ? ` · Created ${formatWhen(session.createdAt!)}`
                              : null}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-1.5 flex items-baseline justify-between gap-3">
                          <p className="text-xs text-slate-400">
                            <span className="font-semibold text-white">
                              {position}
                            </span>
                            <span className="text-slate-500">
                              {' '}
                              / {session.originalCount}
                            </span>
                            <span className="ml-2 text-slate-500">
                              · {session.remainingCount} left
                            </span>
                          </p>
                          <span className="text-[11px] font-medium text-slate-500">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent to-sky-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                          {session.completed ? 'Review again' : 'Continue'}
                          <IconChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </Link>
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
