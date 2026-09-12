'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { DeckShuffling } from '@/components/DeckShuffling'
import { StudySessionsSkeleton } from '@/components/StudySessionsSkeleton'
import {
  getStudySessionStorage,
  loadStudySession,
  studySessionStorageKey,
} from '@/lib/study-session-store'

const MODE_LABELS: Record<string, string> = {
  due: 'Remaining',
  known: 'Known',
  learning: 'Still learning',
  shuffle: 'Shuffled',
}

/**
 * Route/Suspense fallback for /[topic]/study:
 * - bare /study → sessions hub skeleton
 * - ?category/mode with saved session → neutral resume
 * - ?category/mode without saved session → shuffling (new session)
 */
export function StudyBootFallback() {
  const params = useParams()
  const search = useSearchParams()
  const topicId = String(params.topic ?? '')
  const category = search.get('category')
  const mode = search.get('mode')

  if (!category && !mode) {
    return <StudySessionsSkeleton />
  }

  const persistKey = studySessionStorageKey(topicId, category, mode)
  const storage = getStudySessionStorage()
  const hasSaved = Boolean(storage && loadStudySession(storage, persistKey))
  const modeLabel = mode ? MODE_LABELS[mode] ?? mode : category ? 'Category' : 'Shuffled deck'
  const topicLabel = (category ?? 'your').toLowerCase()

  if (hasSaved) {
    return (
      <div
        className="mx-auto flex h-full w-full max-w-lg flex-1 flex-col items-center justify-center px-2 text-center"
        aria-busy="true"
        aria-label="Resuming session"
      >
        <div className="h-14 w-14 animate-pulse rounded-2xl border border-white/10 bg-slate-900/80" />
        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
          {modeLabel}
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-white">Resuming session</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
          Picking up {topicLabel} where you left off.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex size-2 animate-pulse rounded-full bg-accent" />
          Loading your cards
        </div>
      </div>
    )
  }

  return (
    <DeckShuffling
      badge={modeLabel}
      title="Shuffling deck"
      subtitle={`Lining up ${topicLabel} cards so you can start flipping right away.`}
      footer="Preparing your session"
    />
  )
}
