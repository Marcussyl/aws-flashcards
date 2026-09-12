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
const PROGRESS_CACHE_KEY = 'memori-progress-cache-v1'

const PROGRESS_TIMEOUT_MS = 12_000
const FETCH_ATTEMPTS = 3
const FETCH_BACKOFF_MS = [0, 600, 1500] as const

type FetchProgressResult =
  | { ok: true; map: ProgressMap }
  | { ok: false; map: null }

function isProgressEntry(value: unknown): value is ProgressEntry {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as ProgressEntry
  const validStatus =
    item.status === 'learning' || item.status === 'known' || item.status === 'unseen'
  return validStatus && typeof item.seen === 'number'
}

function isProgressMap(value: unknown): value is ProgressMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  return Object.values(value).every(isProgressEntry)
}

function readCachedProgress(): ProgressMap | null {
  try {
    const raw = window.localStorage.getItem(PROGRESS_CACHE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as unknown
    return isProgressMap(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeCachedProgress(map: ProgressMap) {
  try {
    window.localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(map))
  } catch {
    // Quota / private mode — ignore; network remains source of truth.
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function fetchProgressOnce(): Promise<FetchProgressResult> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), PROGRESS_TIMEOUT_MS)
  try {
    const response = await fetch('/api/progress', {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      return { ok: false, map: null }
    }
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      return { ok: false, map: null }
    }
    const parsed = (await response.json()) as unknown
    if (!isProgressMap(parsed)) {
      return { ok: false, map: null }
    }
    return { ok: true, map: parsed }
  } catch {
    return { ok: false, map: null }
  } finally {
    window.clearTimeout(timer)
  }
}

/** Retries with backoff. Never returns `{}` on failure — callers keep cache. */
async function fetchProgress(): Promise<FetchProgressResult> {
  let last: FetchProgressResult = { ok: false, map: null }
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt += 1) {
    const delay = FETCH_BACKOFF_MS[attempt] ?? FETCH_BACKOFF_MS[FETCH_BACKOFF_MS.length - 1]
    if (delay > 0) {
      await sleep(delay)
    }
    last = await fetchProgressOnce()
    if (last.ok) {
      return last
    }
  }
  return last
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
    const parsed = JSON.parse(raw) as unknown
    return isProgressMap(parsed) ? parsed : null
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
  const mapRef = useRef<ProgressMap>({})
  const loadingRef = useRef(false)

  useEffect(() => {
    mapRef.current = map
  }, [map])

  const persistMap = useCallback((next: ProgressMap) => {
    writeCachedProgress(next)
    writes.current = writes.current
      .then(() => saveProgress(next))
      .catch((error) => {
        console.error('Failed to save progress', error)
      })
  }, [])

  const persistEntry = useCallback((cardId: string, entry: ProgressEntry) => {
    // Keep cache aligned with optimistic mark() so resume hydration stays correct.
    writeCachedProgress({ ...mapRef.current, [cardId]: entry })
    writes.current = writes.current
      .then(() => saveProgressEntry(cardId, entry))
      .catch((error) => {
        console.error('Failed to save progress entry', error)
      })
  }, [])

  const applySuccessfulMap = useCallback((next: ProgressMap) => {
    writeCachedProgress(next)
    setMap(next)
    mapRef.current = next
  }, [])

  const loadFromNetwork = useCallback(
    async (opts: { allowLegacyMigrate: boolean }) => {
      if (loadingRef.current) {
        return
      }
      loadingRef.current = true
      try {
        const result = await fetchProgress()
        if (!result.ok) {
          // Keep existing map / cache. Never PUT on failed fetch.
          return
        }

        let next = result.map
        const networkEmpty = Object.keys(next).length === 0

        if (opts.allowLegacyMigrate && networkEmpty) {
          const legacy = readLegacyLocalProgress()
          if (legacy && Object.keys(legacy).length > 0) {
            next = legacy
            try {
              await saveProgress(legacy)
              window.localStorage.removeItem(LEGACY_STORAGE_KEY)
            } catch (error) {
              console.error('Failed to migrate legacy progress', error)
            }
          }
        }

        applySuccessfulMap(next)
      } finally {
        loadingRef.current = false
      }
    },
    [applySuccessfulMap],
  )

  useEffect(() => {
    let cancelled = false

    async function initialLoad() {
      const cached = readCachedProgress()
      if (cached && Object.keys(cached).length > 0) {
        if (!cancelled) {
          setMap(cached)
          mapRef.current = cached
          setReady(true)
        }
      }

      try {
        await loadFromNetwork({ allowLegacyMigrate: true })
      } catch (error) {
        console.error('Failed to load progress', error)
      } finally {
        if (!cancelled) {
          // If fetch failed and there was no cache, map stays {}.
          setReady(true)
        }
      }
    }

    initialLoad()

    return () => {
      cancelled = true
    }
  }, [loadFromNetwork])

  useEffect(() => {
    const refetchOnResume = () => {
      if (document.visibilityState !== 'visible') {
        return
      }
      void loadFromNetwork({ allowLegacyMigrate: false }).catch((error) => {
        console.error('Failed to refresh progress on resume', error)
      })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetchOnResume()
      }
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted || document.visibilityState === 'visible') {
        void loadFromNetwork({ allowLegacyMigrate: false }).catch((error) => {
          console.error('Failed to refresh progress on pageshow', error)
        })
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [loadFromNetwork])

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
        mapRef.current = next
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
          mapRef.current = {}
          persistMap({})
          return {}
        }
        const next = { ...prev }
        ids.forEach((id) => {
          delete next[id]
        })
        mapRef.current = next
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
