'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CardStatus, ProgressMap } from '@/data/types'

const LEGACY_STORAGE_KEY = 'aws-flashcards-progress-v1'

async function fetchProgress(): Promise<ProgressMap> {
  const response = await fetch('/api/progress', { cache: 'no-store' })
  if (!response.ok) {
    return {}
  }
  return (await response.json()) as ProgressMap
}

async function saveProgress(map: ProgressMap) {
  await fetch('/api/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(map),
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

export function useProgress() {
  const [map, setMap] = useState<ProgressMap>({})
  const [ready, setReady] = useState(false)
  const writes = useRef(Promise.resolve())

  const persist = useCallback((next: ProgressMap) => {
    writes.current = writes.current
      .then(() => saveProgress(next))
      .catch((error) => {
        console.error('Failed to save progress.json', error)
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
        const next: ProgressMap = {
          ...prev,
          [id]: {
            status,
            seen: (current?.seen ?? 0) + 1,
          },
        }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const reset = useCallback(() => {
    persist({})
    setMap({})
  }, [persist])

  return { map, ready, mark, reset }
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
