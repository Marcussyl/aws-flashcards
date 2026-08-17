import type { ProgressDocument, ProgressMap } from '@/data/types'
import { getDb } from '@/lib/mongo'
import { readProgressFile } from '@/lib/progress-file'

export const PROGRESS_COLLECTION = 'progress'
export const PROGRESS_DOCUMENT_ID = 'default'

async function getProgressCollection() {
  const db = await getDb()
  return db.collection<ProgressDocument>(PROGRESS_COLLECTION)
}

export async function readProgress(): Promise<ProgressMap> {
  const collection = await getProgressCollection()
  const document = await collection.findOne({ _id: PROGRESS_DOCUMENT_ID })
  if (document) {
    return document.cards ?? {}
  }

  const fileMap = await readProgressFile()
  if (Object.keys(fileMap).length > 0) {
    await writeProgress(fileMap)
    return fileMap
  }

  return {}
}

export async function writeProgress(cards: ProgressMap) {
  const collection = await getProgressCollection()
  await collection.updateOne(
    { _id: PROGRESS_DOCUMENT_ID },
    {
      $set: {
        cards,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  )
}
