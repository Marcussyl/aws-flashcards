import type {
  LegacyProgressDocument,
  ProgressDocument,
  ProgressEntry,
  ProgressMap,
} from '@/data/types'
import { LOCAL_PROGRESS_USER_ID } from '@/data/types'
import { getDb } from '@/lib/mongo'
import { readProgressFile } from '@/lib/progress-file'

export const PROGRESS_COLLECTION = 'progress'
export const LEGACY_PROGRESS_DOCUMENT_ID = 'default' as const

const globalForProgress = globalThis as typeof globalThis & {
  _progressIndexesReady?: Promise<void>
  _progressMigrated?: Promise<void>
}

async function getProgressCollection() {
  const db = await getDb()
  return db.collection<ProgressDocument>(PROGRESS_COLLECTION)
}

export async function ensureIndexes() {
  if (!globalForProgress._progressIndexesReady) {
    globalForProgress._progressIndexesReady = (async () => {
      const collection = await getProgressCollection()
      await collection.createIndex(
        { userId: 1, cardId: 1 },
        { unique: true, name: 'progress_user_card' },
      )
    })().catch((error) => {
      globalForProgress._progressIndexesReady = undefined
      throw error
    })
  }
  await globalForProgress._progressIndexesReady
}

function bulkUpsertOps(
  userId: string,
  cards: ProgressMap,
  updatedAt: string,
) {
  return Object.entries(cards).map(([cardId, entry]) => ({
    updateOne: {
      filter: { userId, cardId },
      update: {
        $set: {
          userId,
          cardId,
          status: entry.status,
          seen: entry.seen,
          updatedAt,
        },
      },
      upsert: true as const,
    },
  }))
}

/**
 * Expand legacy `_id: "default"` mega-document into one doc per card
 * (`userId: "local"`), then delete the legacy doc. Safe to call repeatedly.
 */
export async function migrateLegacyDefaultDocIfNeeded(userId = LOCAL_PROGRESS_USER_ID) {
  if (!globalForProgress._progressMigrated) {
    globalForProgress._progressMigrated = (async () => {
      await ensureIndexes()
      const db = await getDb()
      const collection = await getProgressCollection()
      const legacyCollection = db.collection<LegacyProgressDocument>(PROGRESS_COLLECTION)

      const legacy = await legacyCollection.findOne({ _id: LEGACY_PROGRESS_DOCUMENT_ID })
      if (legacy?.cards && typeof legacy.cards === 'object') {
        const entries = Object.entries(legacy.cards)
        if (entries.length > 0) {
          const updatedAt = legacy.updatedAt ?? new Date().toISOString()
          await collection.bulkWrite(
            bulkUpsertOps(userId, legacy.cards, updatedAt),
            { ordered: false },
          )
        }
        await legacyCollection.deleteOne({ _id: LEGACY_PROGRESS_DOCUMENT_ID })
      }

      // One-shot file seed when neither legacy nor per-card docs exist yet.
      const existing = await collection.countDocuments({ userId }, { limit: 1 })
      if (existing === 0) {
        const fileMap = await readProgressFile()
        if (Object.keys(fileMap).length > 0) {
          await collection.bulkWrite(
            bulkUpsertOps(userId, fileMap, new Date().toISOString()),
            { ordered: false },
          )
        }
      }
    })().catch((error) => {
      globalForProgress._progressMigrated = undefined
      throw error
    })
  }
  await globalForProgress._progressMigrated
}

export async function readProgressMap(
  userId = LOCAL_PROGRESS_USER_ID,
): Promise<ProgressMap> {
  await migrateLegacyDefaultDocIfNeeded(userId)
  const collection = await getProgressCollection()
  const docs = await collection.find({ userId }).toArray()
  const map: ProgressMap = {}
  for (const doc of docs) {
    map[doc.cardId] = { status: doc.status, seen: doc.seen }
  }
  return map
}

export async function upsertProgressEntry(
  cardId: string,
  entry: ProgressEntry,
  userId = LOCAL_PROGRESS_USER_ID,
) {
  await migrateLegacyDefaultDocIfNeeded(userId)
  const collection = await getProgressCollection()
  const updatedAt = new Date().toISOString()
  await collection.updateOne(
    { userId, cardId },
    {
      $set: {
        userId,
        cardId,
        status: entry.status,
        seen: entry.seen,
        updatedAt,
      },
    },
    { upsert: true },
  )
}

/**
 * Bulk sync: upsert every entry in `cards`, then delete any per-card docs for
 * this user whose cardId is missing from the map (supports full reset).
 */
export async function writeProgressMap(
  cards: ProgressMap,
  userId = LOCAL_PROGRESS_USER_ID,
) {
  await migrateLegacyDefaultDocIfNeeded(userId)
  const collection = await getProgressCollection()
  const updatedAt = new Date().toISOString()
  const cardIds = Object.keys(cards)

  const ops = bulkUpsertOps(userId, cards, updatedAt)
  if (ops.length > 0) {
    await collection.bulkWrite(ops, { ordered: false })
  }

  if (cardIds.length === 0) {
    await collection.deleteMany({ userId })
  } else {
    await collection.deleteMany({ userId, cardId: { $nin: cardIds } })
  }
}

/** Alias kept so older call sites keep compiling during the transition. */
export async function readProgress(): Promise<ProgressMap> {
  return readProgressMap()
}

/** Alias kept so older call sites keep compiling during the transition. */
export async function writeProgress(cards: ProgressMap) {
  return writeProgressMap(cards)
}
