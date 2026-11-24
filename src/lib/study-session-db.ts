import { getDb } from '@/lib/mongo'
import {
  isPersistedStudySession,
  isStudySessionExpired,
  pickNewerStudySession,
  sessionUpdatedAt,
  type PersistedStudySession,
} from '@/lib/study-session-store'

export const STUDY_SESSIONS_COLLECTION = 'study-sessions'

type StudySessionDocument = PersistedStudySession & {
  userId: string
  expiresAtDate: Date
}

const globalForSessions = globalThis as typeof globalThis & {
  _studySessionIndexesReady?: Promise<void>
}

async function getStudySessionsCollection() {
  const db = await getDb()
  return db.collection<StudySessionDocument>(STUDY_SESSIONS_COLLECTION)
}

export async function ensureStudySessionIndexes() {
  if (!globalForSessions._studySessionIndexesReady) {
    globalForSessions._studySessionIndexesReady = (async () => {
      const collection = await getStudySessionsCollection()
      await collection.createIndex(
        { userId: 1, sessionKey: 1 },
        { unique: true, name: 'study_session_user_key' },
      )
      await collection.createIndex(
        { expiresAtDate: 1 },
        { expireAfterSeconds: 0, name: 'study_session_ttl' },
      )
    })().catch((error) => {
      globalForSessions._studySessionIndexesReady = undefined
      throw error
    })
  }
  await globalForSessions._studySessionIndexesReady
}

function toSnapshot(doc: StudySessionDocument): PersistedStudySession {
  return {
    version: doc.version,
    expiresAt: doc.expiresAt,
    sessionKey: doc.sessionKey,
    historyIds: doc.historyIds,
    remainingIds: doc.remainingIds,
    historyIndex: doc.historyIndex,
    originalCount: doc.originalCount,
    flipped: doc.flipped,
    completed: doc.completed,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function toDocument(userId: string, snapshot: PersistedStudySession): StudySessionDocument {
  return {
    ...snapshot,
    userId,
    expiresAtDate: new Date(snapshot.expiresAt),
  }
}

function matchesTopic(sessionKey: string, topicId: string): boolean {
  return sessionKey === topicId || sessionKey.startsWith(`${topicId}|`)
}

export async function listStudySessionsForUser(
  userId: string,
  options: { topicId?: string; now?: number } = {},
): Promise<PersistedStudySession[]> {
  await ensureStudySessionIndexes()
  const now = options.now ?? Date.now()
  const collection = await getStudySessionsCollection()
  const docs = await collection.find({ userId }).toArray()
  const live: PersistedStudySession[] = []
  const expiredKeys: string[] = []

  for (const doc of docs) {
    if (!isPersistedStudySession(doc) || isStudySessionExpired(doc, now)) {
      expiredKeys.push(doc.sessionKey)
      continue
    }
    if (options.topicId && !matchesTopic(doc.sessionKey, options.topicId)) {
      continue
    }
    live.push(toSnapshot(doc))
  }

  if (expiredKeys.length > 0) {
    await collection.deleteMany({ userId, sessionKey: { $in: expiredKeys } })
  }

  live.sort((a, b) => sessionUpdatedAt(b) - sessionUpdatedAt(a))
  return live
}

export async function getStudySessionForUser(
  userId: string,
  sessionKey: string,
  now = Date.now(),
): Promise<PersistedStudySession | null> {
  await ensureStudySessionIndexes()
  const collection = await getStudySessionsCollection()
  const doc = await collection.findOne({ userId, sessionKey })
  if (!doc) {
    return null
  }
  if (!isPersistedStudySession(doc) || isStudySessionExpired(doc, now)) {
    await collection.deleteOne({ userId, sessionKey })
    return null
  }
  return toSnapshot(doc)
}

/**
 * Last-write-wins upsert. If the stored snapshot is newer, it is kept and
 * returned; otherwise `snapshot` is written.
 */
export async function saveStudySessionForUser(
  userId: string,
  snapshot: PersistedStudySession,
): Promise<PersistedStudySession> {
  await ensureStudySessionIndexes()
  const collection = await getStudySessionsCollection()
  const existing = await collection.findOne({
    userId,
    sessionKey: snapshot.sessionKey,
  })

  if (
    existing
    && isPersistedStudySession(existing)
    && !isStudySessionExpired(existing)
    && sessionUpdatedAt(existing) > sessionUpdatedAt(snapshot)
  ) {
    return toSnapshot(existing)
  }

  const winner = existing && isPersistedStudySession(existing)
    ? pickNewerStudySession(toSnapshot(existing), snapshot)
    : snapshot
  const doc = toDocument(userId, winner)
  await collection.updateOne(
    { userId, sessionKey: winner.sessionKey },
    { $set: doc },
    { upsert: true },
  )
  return winner
}

export async function deleteStudySessionForUser(userId: string, sessionKey: string) {
  await ensureStudySessionIndexes()
  const collection = await getStudySessionsCollection()
  await collection.deleteOne({ userId, sessionKey })
}
