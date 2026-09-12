'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { countByStatus, useProgress } from '@/lib/progress'
import {
  clearStudySession,
  getStudySessionStorage,
  listStudySessions,
  type StudySessionSummary,
} from '@/lib/study-session-store'
import { studyProgressPosition } from '@/lib/study-deck'
import type { Card, TopicId } from '@/data/types'
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

function formatRelative(ms: number, now = Date.now()) {
  const delta = Math.max(0, now - ms)
  const mins = Math.round(delta / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function formatExpiresIn(expiresAt: number, now = Date.now()) {
  const delta = Math.max(0, expiresAt - now)
  const totalMins = Math.floor(delta / 60_000)
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hours <= 0) return `${mins}m`
  return `${hours}h ${mins}m`
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
  if (summary.mode === 'due') {
    return { emoji: '⚡', label: 'Remaining due' }
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

export function StudySessionPicker({
  topicId,
  cards,
}: {
  topicId: TopicId
  cards: Card[]
}) {
  const reduce = useReducedMotion()
  const { getCategoryEmoji, getCategoriesForTopic } = useTaxonomy()
  const { map, ready } = useProgress()
  const [sessions, setSessions] = useState<StudySessionSummary[] | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const categories = getCategoriesForTopic(topicId)
  const totals = useMemo(
    () => countByStatus(
      map,
      cards.map((card) => card.id),
    ),
    [map, cards],
  )
  const remainingCount = totals.learning + totals.unseen

  function refresh() {
    const storage = getStudySessionStorage()
    setNow(Date.now())
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
  const inProgress = items.filter((item) => !item.completed).length

  function discard(sessionKey: string) {
    const storage = getStudySessionStorage()
    if (storage) {
      clearStudySession(storage, sessionKey)
    }
    refresh()
  }

  return (
    <motion.div
      className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-1 pb-8 sm:px-0"
      variants={reduce ? undefined : stagger}
      initial={false}
      animate="show"
    >
      <motion.header variants={reduce ? undefined : fadeUp} className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent/15 shadow-[0_0_16px_rgba(251,191,36,0.2)]">
            <IconBook className="h-5 w-5 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Study sessions
          </h1>
        </div>
        <p className="max-w-2xl pl-11 text-sm leading-6 text-slate-400 sm:text-base">
          Pick up a saved run, or start a new one. Sessions expire after 24h idle.
        </p>
      </motion.header>

      <motion.section
        variants={reduce ? undefined : fadeUp}
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <Link
          href={topicHref(topicId, 'study', { mode: 'due' })}
          className="group relative flex flex-col justify-between rounded-2xl bg-gradient-to-b from-accent/20 to-accent/5 p-5 shadow-[0_12px_32px_-12px_rgba(251,191,36,0.2)] transition hover:shadow-[0_16px_36px_-8px_rgba(251,191,36,0.28)]"
        >
          <div>
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent/20 text-accent transition group-hover:scale-105">
              <IconSpark className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-accent">Study remaining</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {ready
                ? `${remainingCount} due cards across ${categories.length} categories`
                : 'Loading due counts…'}
            </p>
          </div>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent transition group-hover:translate-x-0.5">
            Start run
            <IconChevronRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          href={topicHref(topicId, 'study', { mode: 'shuffle' })}
          className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:border-white/20 hover:bg-slate-900"
        >
          <div>
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition group-hover:text-white">
              <IconShuffle className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-white">Shuffle all</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Randomize full deck of {cards.length} cards
            </p>
          </div>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-white">
            Shuffle &amp; study
            <IconChevronRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          href={topicHref(topicId)}
          className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:border-white/20 hover:bg-slate-900"
        >
          <div>
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition group-hover:text-white">
              <IconInbox className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-white">Pick a category</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Drill a module (Databases, IAM, Security…)
            </p>
          </div>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-white">
            Choose pack
            <IconChevronRight className="h-4 w-4" />
          </span>
        </Link>
      </motion.section>

      <motion.section variants={reduce ? undefined : fadeUp} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-white">Saved sessions</h2>
            {sessions && items.length > 0 ? (
              <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {inProgress} in-progress
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-accent"
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
          <ul className="flex flex-col gap-4">
            {items.map((session) => {
              const title = sessionTitle(session, getCategoryEmoji)
              const chip = modeChip(session)
              const position = studyProgressPosition(
                session.historyIndex,
                session.originalCount,
              )
              const pct = session.originalCount
                ? Math.min(100, Math.round((position / session.originalCount) * 100))
                : 0
              const href = topicHref(topicId, 'study', {
                category: session.category,
                mode: session.mode ?? (session.category ? null : 'shuffle'),
              })
              const chipClass =
                session.mode === 'due'
                  ? 'border-accent/20 bg-accent/10 text-accent'
                  : 'border-sky-400/20 bg-sky-400/10 text-sky-200'
              const sessionStats = countByStatus(map, session.cardIds)
              const showCreated =
                session.createdAt != null &&
                Math.abs(session.createdAt - session.updatedAt) >= 60_000

              return (
                <li key={session.sessionKey} className="relative">
                  <Link
                    href={href}
                    className="group block rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_12px_28px_rgba(0,0,0,0.25)] transition hover:border-accent/25 hover:bg-slate-900 hover:shadow-[0_16px_36px_rgba(251,191,36,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4 pr-8">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-2xl shadow-inner">
                          <span aria-hidden="true">{title.emoji}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-white">
                              {title.label}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${chipClass}`}
                            >
                              <IconSpark className="h-3 w-3" />
                              {chip}
                            </span>
                            {session.completed ? (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-200">
                                Completed
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-[11px] text-slate-500">
                            Active {formatRelative(session.updatedAt, now)}
                            <span className="text-slate-600"> · {formatWhen(session.updatedAt)}</span>
                            {showCreated ? (
                              <span className="text-slate-600">
                                {' '}
                                · Created {formatWhen(session.createdAt!)}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-center">
                        <p className="text-lg font-semibold tabular-nums text-emerald-300">
                          {ready ? sessionStats.known : '—'}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                          Known
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-center">
                        <p className="text-lg font-semibold tabular-nums text-sky-300">
                          {ready ? sessionStats.learning : '—'}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                          Still learning
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-center">
                        <p className="text-lg font-semibold tabular-nums text-accent">
                          {session.remainingCount}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                          Left
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white">
                          {position} / {session.originalCount}
                        </span>
                        <span className="font-medium text-accent">{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-sky-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 pt-1">
                      <p className="text-[11px] text-slate-500">
                        Expires in {formatExpiresIn(session.expiresAt, now)}
                      </p>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition group-hover:translate-x-0.5">
                        {session.completed ? 'Review again' : 'Continue'}
                        <IconChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                  <button
                    type="button"
                    aria-label={`Discard session ${title.label}`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      discard(session.sessionKey)
                    }}
                    className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-200 sm:right-4 sm:top-4"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </motion.section>
    </motion.div>
  )
}
