import { describe, expect, it } from 'vitest'
import type { Card } from '@/data/types'
import {
  STUDY_SESSION_TTL_MS,
  STUDY_SESSION_VERSION,
  clearStudySession,
  isStudySessionExpired,
  listStudySessions,
  loadStudySession,
  mergeStudySessionSnapshots,
  parseStudySessionStorageKey,
  pickNewerStudySession,
  rehydrateStudySession,
  saveStudySession,
  sessionUpdatedAt,
  studySessionLocalStorageKey,
  studySessionStorageKey,
  type PersistedStudySession,
  type StudySessionStorage,
} from '@/lib/study-session-store'

function memoryStorage(): StudySessionStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem(key) {
      return data.has(key) ? data.get(key)! : null
    },
    setItem(key, value) {
      data.set(key, value)
    },
    removeItem(key) {
      data.delete(key)
    },
    get length() {
      return data.size
    },
    key(index) {
      return [...data.keys()][index] ?? null
    },
  }
}

function card(id: string): Card {
  return {
    id,
    topic: 'aws',
    category: 'IAM',
    question: `Q ${id}`,
    summary: `S ${id}`,
    answer: `A ${id}`,
    sourceQuestion: `SQ ${id}`,
  }
}

function snapshot(
  overrides: Partial<PersistedStudySession> = {},
): PersistedStudySession {
  return {
    version: STUDY_SESSION_VERSION,
    expiresAt: 1_000 + STUDY_SESSION_TTL_MS,
    sessionKey: 'aws|IAM|due',
    historyIds: ['a'],
    remainingIds: ['b', 'c'],
    historyIndex: 0,
    originalCount: 3,
    flipped: false,
    completed: false,
    ...overrides,
  }
}

describe('studySessionStorageKey', () => {
  it('joins topic, category, and mode', () => {
    expect(studySessionStorageKey('aws', 'IAM', 'due')).toBe('aws|IAM|due')
  })

  it('treats missing category and mode as empty segments', () => {
    expect(studySessionStorageKey('aws', null, null)).toBe('aws||')
    expect(studySessionStorageKey('pve', undefined, 'known')).toBe('pve||known')
    expect(studySessionStorageKey('aws', 'S3', undefined)).toBe('aws|S3|')
  })

  it('builds a prefixed localStorage key from the session identity', () => {
    expect(studySessionLocalStorageKey('aws|IAM|due')).toBe(
      'memori.study-session.aws|IAM|due',
    )
  })
})

describe('isStudySessionExpired', () => {
  it('is expired when expiresAt is now or in the past', () => {
    expect(isStudySessionExpired({ expiresAt: 100 }, 100)).toBe(true)
    expect(isStudySessionExpired({ expiresAt: 99 }, 100)).toBe(true)
  })

  it('is not expired when expiresAt is in the future', () => {
    expect(isStudySessionExpired({ expiresAt: 101 }, 100)).toBe(false)
  })

  it('treats non-finite expiresAt as expired', () => {
    expect(isStudySessionExpired({ expiresAt: Number.NaN }, 100)).toBe(true)
  })
})

describe('saveStudySession / loadStudySession / clearStudySession', () => {
  const key = 'aws|IAM|due'

  it('round-trips a snapshot and stamps version + TTL from now', () => {
    const storage = memoryStorage()
    const saved = saveStudySession(
      storage,
      {
        sessionKey: key,
        historyIds: ['a'],
        remainingIds: ['b'],
        historyIndex: 0,
        originalCount: 2,
        flipped: true,
        completed: false,
      },
      1_000,
    )

    expect(saved.version).toBe(STUDY_SESSION_VERSION)
    expect(saved.expiresAt).toBe(1_000 + STUDY_SESSION_TTL_MS)
    expect(loadStudySession(storage, key, 1_000)).toEqual(saved)
  })

  it('bumps expiresAt on each save (last-activity TTL)', () => {
    const storage = memoryStorage()
    saveStudySession(
      storage,
      { sessionKey: key, historyIds: ['a'], remainingIds: [], historyIndex: 0 },
      1_000,
    )
    const second = saveStudySession(
      storage,
      { sessionKey: key, historyIds: ['a', 'b'], remainingIds: [], historyIndex: 1 },
      5_000,
    )
    expect(second.expiresAt).toBe(5_000 + STUDY_SESSION_TTL_MS)
    expect(loadStudySession(storage, key, 5_000)?.historyIds).toEqual(['a', 'b'])
  })

  it('returns null and removes the entry when TTL has elapsed', () => {
    const storage = memoryStorage()
    saveStudySession(
      storage,
      { sessionKey: key, historyIds: ['a'], remainingIds: ['b'], historyIndex: 0 },
      1_000,
    )
    const atExpiry = 1_000 + STUDY_SESSION_TTL_MS
    expect(loadStudySession(storage, key, atExpiry)).toBeNull()
    expect(storage.getItem(studySessionLocalStorageKey(key))).toBeNull()
  })

  it('clearStudySession removes only that key', () => {
    const storage = memoryStorage()
    saveStudySession(
      storage,
      { sessionKey: key, historyIds: ['a'], remainingIds: [], historyIndex: 0 },
      1_000,
    )
    saveStudySession(
      storage,
      {
        sessionKey: 'aws||',
        historyIds: ['z'],
        remainingIds: [],
        historyIndex: 0,
      },
      1_000,
    )
    clearStudySession(storage, key)
    expect(loadStudySession(storage, key, 1_000)).toBeNull()
    expect(loadStudySession(storage, 'aws||', 1_000)?.historyIds).toEqual(['z'])
  })

  it('rejects corrupt JSON, wrong version, and mismatched sessionKey', () => {
    const storage = memoryStorage()
    const storageKey = studySessionLocalStorageKey(key)

    storage.setItem(storageKey, '{not json')
    expect(loadStudySession(storage, key, 1_000)).toBeNull()
    expect(storage.getItem(storageKey)).toBeNull()

    storage.setItem(storageKey, JSON.stringify(snapshot({ version: 2 })))
    expect(loadStudySession(storage, key, 1_000)).toBeNull()

    storage.setItem(
      storageKey,
      JSON.stringify(snapshot({ sessionKey: 'other|key|' })),
    )
    expect(loadStudySession(storage, key, 1_000)).toBeNull()
    expect(storage.getItem(storageKey)).toBeNull()
  })
})

describe('rehydrateStudySession', () => {
  const cards = [card('a'), card('b'), card('c'), card('new')]

  it('rehydrates cards by id and keeps added-while-away cards out', () => {
    const restored = rehydrateStudySession(
      snapshot({
        historyIds: ['a', 'b'],
        remainingIds: ['c'],
        historyIndex: 1,
        originalCount: 3,
        flipped: true,
      }),
      cards,
    )
    expect(restored).not.toBeNull()
    expect(restored!.deck.history.map((item) => item.id)).toEqual(['a', 'b'])
    expect(restored!.deck.remaining.map((item) => item.id)).toEqual(['c'])
    expect(restored!.deck.historyIndex).toBe(1)
    expect(restored!.original.map((item) => item.id)).toEqual(['a', 'b', 'c'])
    expect(restored!.original.map((item) => item.id)).not.toContain('new')
    expect(restored!.originalCount).toBe(3)
    expect(restored!.flipped).toBe(true)
  })

  it('drops ids that are no longer in the card list and clamps historyIndex', () => {
    const restored = rehydrateStudySession(
      snapshot({
        historyIds: ['a', 'gone', 'b'],
        remainingIds: ['missing', 'c'],
        historyIndex: 40,
      }),
      cards,
    )
    expect(restored!.deck.history.map((item) => item.id)).toEqual(['a', 'b'])
    expect(restored!.deck.remaining.map((item) => item.id)).toEqual(['c'])
    expect(restored!.deck.historyIndex).toBe(1)
  })

  it('seeds history from remaining when stored history is empty', () => {
    const restored = rehydrateStudySession(
      snapshot({ historyIds: [], remainingIds: ['b', 'c'], historyIndex: 0 }),
      cards,
    )
    expect(restored!.deck.history.map((item) => item.id)).toEqual(['b'])
    expect(restored!.deck.remaining.map((item) => item.id)).toEqual(['c'])
    expect(restored!.deck.historyIndex).toBe(0)
  })

  it('returns an empty deck when no stored ids resolve (cards added later stay out)', () => {
    const restored = rehydrateStudySession(
      snapshot({ historyIds: ['gone'], remainingIds: ['also-gone'], historyIndex: 0 }),
      cards,
    )
    expect(restored).not.toBeNull()
    expect(restored!.deck).toEqual({ history: [], historyIndex: 0, remaining: [] })
    expect(restored!.original).toEqual([])
  })
})


describe('parseStudySessionStorageKey', () => {
  it('splits topic, category, and mode', () => {
    expect(parseStudySessionStorageKey('aws|IAM|due')).toEqual({
      topicId: 'aws',
      category: 'IAM',
      mode: 'due',
    })
    expect(parseStudySessionStorageKey('aws||shuffle')).toEqual({
      topicId: 'aws',
      category: null,
      mode: 'shuffle',
    })
  })
})

describe('listStudySessions', () => {
  it('lists non-expired sessions for a topic, newest first', () => {
    const storage = memoryStorage()
    saveStudySession(
      storage,
      {
        sessionKey: 'aws|IAM|',
        historyIds: ['a'],
        remainingIds: ['b'],
        historyIndex: 0,
        originalCount: 2,
      },
      1_000,
    )
    saveStudySession(
      storage,
      {
        sessionKey: 'aws||due',
        historyIds: ['a'],
        remainingIds: [],
        historyIndex: 0,
        originalCount: 1,
      },
      2_000,
    )
    saveStudySession(
      storage,
      {
        sessionKey: 'pve|Labs|',
        historyIds: ['x'],
        remainingIds: [],
        historyIndex: 0,
        originalCount: 1,
      },
      3_000,
    )

    const listed = listStudySessions(storage, { topicId: 'aws', now: 2_500 })
    expect(listed.map((item) => item.sessionKey)).toEqual(['aws||due', 'aws|IAM|'])
    expect(listed[0]?.updatedAt).toBe(2_000)
    expect(listed[0]?.createdAt).toBe(2_000)
  })

  it('preserves createdAt across later saves', () => {
    const storage = memoryStorage()
    saveStudySession(
      storage,
      {
        sessionKey: 'aws|IAM|',
        historyIds: ['a'],
        remainingIds: [],
        historyIndex: 0,
        originalCount: 1,
      },
      1_000,
    )
    saveStudySession(
      storage,
      {
        sessionKey: 'aws|IAM|',
        historyIds: ['a'],
        remainingIds: [],
        historyIndex: 0,
        originalCount: 1,
      },
      5_000,
    )
    const listed = listStudySessions(storage, { topicId: 'aws', now: 5_100 })
    expect(listed).toHaveLength(1)
    expect(listed[0]?.createdAt).toBe(1_000)
    expect(listed[0]?.updatedAt).toBe(5_000)
  })
})

describe('pickNewerStudySession / mergeStudySessionSnapshots', () => {
  it('picks the snapshot with the later updatedAt (last-write-wins)', () => {
    const older = snapshot({ updatedAt: 1_000, historyIds: ['a'] })
    const newer = snapshot({ updatedAt: 2_000, historyIds: ['a', 'b'] })
    expect(pickNewerStudySession(older, newer).historyIds).toEqual(['a', 'b'])
    expect(pickNewerStudySession(newer, older).historyIds).toEqual(['a', 'b'])
    expect(sessionUpdatedAt(older)).toBe(1_000)
  })

  it('keeps the first snapshot on an updatedAt tie', () => {
    const a = snapshot({ updatedAt: 5_000, historyIds: ['a'] })
    const b = snapshot({ updatedAt: 5_000, historyIds: ['b'] })
    expect(pickNewerStudySession(a, b).historyIds).toEqual(['a'])
  })

  it('merges local-only, remote-only, and conflicting keys', () => {
    const localOnly = snapshot({
      sessionKey: 'aws|IAM|',
      updatedAt: 1_000,
      expiresAt: 1_000 + STUDY_SESSION_TTL_MS,
    })
    const remoteOnly = snapshot({
      sessionKey: 'aws||due',
      updatedAt: 2_000,
      expiresAt: 2_000 + STUDY_SESSION_TTL_MS,
    })
    const localConflict = snapshot({
      sessionKey: 'aws|S3|',
      updatedAt: 4_000,
      historyIds: ['local'],
      expiresAt: 4_000 + STUDY_SESSION_TTL_MS,
    })
    const remoteConflict = snapshot({
      sessionKey: 'aws|S3|',
      updatedAt: 3_000,
      historyIds: ['remote'],
      expiresAt: 3_000 + STUDY_SESSION_TTL_MS,
    })
    const expiredRemote = snapshot({
      sessionKey: 'aws|VPC|',
      updatedAt: 10,
      expiresAt: 20,
    })

    const result = mergeStudySessionSnapshots(
      [localOnly, localConflict],
      [remoteOnly, remoteConflict, expiredRemote],
      5_000,
    )

    expect(result.merged.map((item) => item.sessionKey).sort()).toEqual([
      'aws|IAM|',
      'aws|S3|',
      'aws||due',
    ])
    expect(result.toRemote.map((item) => item.sessionKey).sort()).toEqual(
      ['aws|IAM|', 'aws|S3|'].sort(),
    )
    expect(result.toLocal.map((item) => item.sessionKey)).toEqual(['aws||due'])
    expect(
      result.merged.find((item) => item.sessionKey === 'aws|S3|')?.historyIds,
    ).toEqual(['local'])
  })
})
