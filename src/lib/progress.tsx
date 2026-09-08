'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CardStatus, ProgressEntry, ProgressMap } from '@/data/types'

const LEGACY_STORAGE_KEY = 'aws-flashcards-progress-v1'

const PROGRESS_TIMEOUT_MS = 4000

async function fetchProgress(): Promise<ProgressMap> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), PROGRESS_TIMEOUT_MS)
  try {
    const response = await fetch('/api/progress', {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      return {}
    }
    return (await response.json()) as ProgressMap
  } catch {
    return {}
  } finally {
    window.clearTimeout(timer)
  }
}

async function saveProgress(map: ProgressMap) {
  await fetch('/api/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(map),
  })
}

async function saveProgressEntry(cardId: string, entry: ProgressEntry) {
  await fetch('/api/progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, entry }),
  })
}

function readLegacyLocalProgress(): ProgressMap | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as ProgressMap
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

type ProgressContextValue = {
  map: ProgressMap
  ready: boolean
  mark: (id: string, status: CardStatus) => void
  reset: (ids?: string[]) => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<ProgressMap>({})
  const [ready, setReady] = useState(false)
  const writes = useRef(Promise.resolve())

  const persistMap = useCallback((next: ProgressMap) => {
    writes.current = writes.current
      .then(() => saveProgress(next))
      .catch((error) => {
        console.error('Failed to save progress', error)
      })
  }, [])

  const persistEntry = useCallback((cardId: string, entry: ProgressEntry) => {
    writes.current = writes.current
      .then(() => saveProgressEntry(cardId, entry))
      .catch((error) => {
        console.error('Failed to save progress entry', error)
      })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      let next = await fetchProgress()
      const hasFileProgress = Object.keys(next).length > 0
      if (!hasFileProgress) {
        const legacy = readLegacyLocalProgress()
        if (legacy && Object.keys(legacy).length > 0) {
          next = legacy
          await saveProgress(legacy)
          window.localStorage.removeItem(LEGACY_STORAGE_KEY)
        }
      }
      if (!cancelled) {
        setMap(next)
        setReady(true)
      }
    }

    load().catch(() => {
      if (!cancelled) {
        setReady(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const mark = useCallback(
    (id: string, status: CardStatus) => {
      setMap((prev) => {
        const current = prev[id]
        const entry: ProgressEntry = {
          status,
          seen: (current?.seen ?? 0) + 1,
        }
        const next: ProgressMap = {
          ...prev,
          [id]: entry,
        }
        persistEntry(id, entry)
        return next
      })
    },
    [persistEntry],
  )

  const reset = useCallback(
    (ids?: string[]) => {
      setMap((prev) => {
        if (!ids) {
          persistMap({})
          return {}
        }
        const next = { ...prev }
        ids.forEach((id) => {
          delete next[id]
        })
        persistMap(next)
        return next
      })
    },
    [persistMap],
  )

  const value = useMemo(
    () => ({ map, ready, mark, reset }),
    [map, ready, mark, reset],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) {
    throw new Error('useProgress must be used within a ProgressProvider')
  }
  return ctx
}

export function countByStatus(map: ProgressMap, ids: string[]) {
  let known = 0
  let learning = 0
  let unseen = 0
  ids.forEach((id) => {
    const status = map[id]?.status ?? 'unseen'
    if (status === 'known') {
      known += 1
    } else if (status === 'learning') {
      learning += 1
    } else {
      unseen += 1
    }
  })
  return { known, learning, unseen }
}
