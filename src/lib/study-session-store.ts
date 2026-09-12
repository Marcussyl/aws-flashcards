import type { Card } from '@/data/types'
import { createStudyDeck, type StudyDeckState } from '@/lib/study-deck'

/** Snapshot schema version. Bump when the persisted shape is incompatible. */
export const STUDY_SESSION_VERSION = 1

/** Default expiry: 24 hours from last save (activity bump). */
export const STUDY_SESSION_TTL_MS = 24 * 60 * 60 * 1000

const STORAGE_PREFIX = 'memori.study-session.'

export type StudySessionStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type PersistedStudySession = {
  version: number
  expiresAt: number
  sessionKey: string
  historyIds: string[]
  remainingIds: string[]
  historyIndex: number
  originalCount?: number
  flipped?: boolean
  completed?: boolean
}

export type RehydratedStudySession = {
  deck: StudyDeckState
  original: Card[]
  originalCount: number
  flipped: boolean
  completed: boolean
}

/** Logical session identity for a study URL (topic + category + mode). */
export function studySessionStorageKey(
  topicId: string,
  category: string | null | undefined,
  mode: string | null | undefined,
): string {
  return `${topicId}|${category ?? ''}|${mode ?? ''}`
}

/** localStorage key for a logical session identity. */
export function studySessionLocalStorageKey(sessionKey: string): string {
  return `${STORAGE_PREFIX}${sessionKey}`
}

export function isStudySessionExpired(
  snapshot: { expiresAt: number },
  now = Date.now(),
): boolean {
  return !Number.isFinite(snapshot.expiresAt) || snapshot.expiresAt <= now
}

export function getStudySessionStorage(): StudySessionStorage | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const storage = window.localStorage
    // Probe: Safari private mode can throw on set/remove.
    storage.getItem(STORAGE_PREFIX)
    return storage
  } catch {
    return null
  }
}

function isPersistedStudySession(value: unknown): value is PersistedStudySession {
  if (!value || typeof value !== 'object') {
    return false
  }
  const snapshot = value as Partial<PersistedStudySession>
  return (
    snapshot.version === STUDY_SESSION_VERSION &&
    typeof snapshot.expiresAt === 'number' &&
    typeof snapshot.sessionKey === 'string' &&
    snapshot.sessionKey.length > 0 &&
    Array.isArray(snapshot.historyIds) &&
    snapshot.historyIds.every((id) => typeof id === 'string') &&
    Array.isArray(snapshot.remainingIds) &&
    snapshot.remainingIds.every((id) => typeof id === 'string') &&
    typeof snapshot.historyIndex === 'number' &&
    Number.isFinite(snapshot.historyIndex)
  )
}

export type StudySessionSaveInput = {
  sessionKey: string
  historyIds: string[]
  remainingIds: string[]
  historyIndex: number
  originalCount?: number
  flipped?: boolean
  completed?: boolean
}

/**
 * Persist a session snapshot. `expiresAt` is always set to now + TTL so each
 * save bumps last-activity expiry (default 24h).
 */
export function saveStudySession(
  storage: StudySessionStorage,
  input: StudySessionSaveInput,
  now = Date.now(),
  ttlMs = STUDY_SESSION_TTL_MS,
): PersistedStudySession {
  const snapshot: PersistedStudySession = {
    version: STUDY_SESSION_VERSION,
    expiresAt: now + ttlMs,
    sessionKey: input.sessionKey,
    historyIds: input.historyIds,
    remainingIds: input.remainingIds,
    historyIndex: input.historyIndex,
    originalCount: input.originalCount,
    flipped: input.flipped,
    completed: input.completed,
  }
  try {
    storage.setItem(studySessionLocalStorageKey(input.sessionKey), JSON.stringify(snapshot))
  } catch {
    // Quota exceeded or storage blocked — study still works in-memory.
  }
  return snapshot
}

/**
 * Load a snapshot for `sessionKey`. Expired, corrupt, or mismatched entries
 * are removed and treated as a miss.
 */
export function loadStudySession(
  storage: StudySessionStorage,
  sessionKey: string,
  now = Date.now(),
): PersistedStudySession | null {
  const storageKey = studySessionLocalStorageKey(sessionKey)
  let raw: string | null
  try {
    raw = storage.getItem(storageKey)
  } catch {
    return null
  }
  if (!raw) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isPersistedStudySession(parsed) || parsed.sessionKey !== sessionKey) {
      storage.removeItem(storageKey)
      return null
    }
    if (isStudySessionExpired(parsed, now)) {
      storage.removeItem(storageKey)
      return null
    }
    return parsed
  } catch {
    try {
      storage.removeItem(storageKey)
    } catch {
      // ignore
    }
    return null
  }
}

export function clearStudySession(storage: StudySessionStorage, sessionKey: string): void {
  try {
    storage.removeItem(studySessionLocalStorageKey(sessionKey))
  } catch {
    // ignore
  }
}

function cardsById(cards: Card[]): Map<string, Card> {
  return new Map(cards.map((card) => [card.id, card]))
}

function resolveCards(ids: string[], byId: Map<string, Card>): Card[] {
  const resolved: Card[] = []
  for (const id of ids) {
    const card = byId.get(id)
    if (card) {
      resolved.push(card)
    }
  }
  return resolved
}

function uniqueCards(list: Card[]): Card[] {
  const seen = new Set<string>()
  const next: Card[] = []
  for (const card of list) {
    if (seen.has(card.id)) {
      continue
    }
    seen.add(card.id)
    next.push(card)
  }
  return next
}

/**
 * Rebuild a live deck from persisted ids. Cards that no longer exist in
 * `cards` are dropped. Cards present in `cards` but not in the snapshot stay
 * out of the session (added-while-away).
 */
export function rehydrateStudySession(
  snapshot: PersistedStudySession,
  cards: Card[],
): RehydratedStudySession | null {
  const byId = cardsById(cards)
  const history = resolveCards(snapshot.historyIds, byId)
  const remaining = resolveCards(snapshot.remainingIds, byId)

  let deck: StudyDeckState
  if (history.length === 0) {
    deck = createStudyDeck(remaining)
  } else {
    const last = history.length - 1
    const historyIndex = Math.min(Math.max(0, Math.trunc(snapshot.historyIndex)), last)
    deck = { history, historyIndex, remaining }
  }

  const original = uniqueCards([...deck.history, ...deck.remaining])
  return {
    deck,
    original,
    originalCount: snapshot.originalCount ?? original.length,
    flipped: Boolean(snapshot.flipped),
    completed: Boolean(snapshot.completed),
  }
}
