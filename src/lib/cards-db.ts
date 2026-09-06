import rawAwsCards from '@/data/cards.json'
import rawPveCards from '@/data/pve-cards.json'
import type { TopicId } from '@/data/topics'
import type { Card, CardDocument, CardUpdate } from '@/data/types'
import { getDb } from '@/lib/mongo'

export const CARDS_COLLECTION = 'cards'

type AwsCardSource = Omit<Card, 'topic'>

const globalForCards = globalThis as typeof globalThis & {
  _cardsIndexesReady?: Promise<void>
  _cardsSeeded?: Promise<number>
}

function toCard(doc: CardDocument): Card {
  return {
    id: doc._id,
    topic: doc.topic,
    category: doc.category,
    question: doc.question,
    summary: doc.summary,
    answer: doc.answer,
    sourceQuestion: doc.sourceQuestion,
    images: doc.images,
  }
}

export async function getCardsCollection() {
  const db = await getDb()
  return db.collection<CardDocument>(CARDS_COLLECTION)
}

export async function ensureIndexes() {
  if (!globalForCards._cardsIndexesReady) {
    globalForCards._cardsIndexesReady = (async () => {
      const collection = await getCardsCollection()
      // _id is unique by default; Mongo rejects createIndex({_id:1},{unique:true})
      await Promise.all([
        collection.createIndex({ topic: 1, category: 1 }),
        collection.createIndex(
          { question: 'text', sourceQuestion: 'text', answer: 'text' },
          { name: 'cards_text' },
        ),
      ])
    })().catch((error) => {
      globalForCards._cardsIndexesReady = undefined
      throw error
    })
  }
  return globalForCards._cardsIndexesReady
}

function seedDocuments(): CardDocument[] {
  const now = new Date().toISOString()
  const aws = (rawAwsCards as AwsCardSource[]).map((card) => ({
    _id: card.id,
    topic: 'aws' as const,
    category: card.category,
    question: card.question,
    summary: card.summary,
    answer: card.answer,
    sourceQuestion: card.sourceQuestion,
    ...(card.images?.length ? { images: card.images } : {}),
    createdAt: now,
    updatedAt: now,
  }))
  const pve = (rawPveCards as Card[]).map((card) => ({
    _id: card.id,
    topic: card.topic,
    category: card.category,
    question: card.question,
    summary: card.summary,
    answer: card.answer,
    sourceQuestion: card.sourceQuestion,
    ...(card.images?.length ? { images: card.images } : {}),
    createdAt: now,
    updatedAt: now,
  }))
  return [...aws, ...pve]
}

export async function seedCardsIfEmpty(): Promise<number> {
  if (!globalForCards._cardsSeeded) {
    globalForCards._cardsSeeded = (async () => {
      await ensureIndexes()
      const collection = await getCardsCollection()
      const existing = await collection.estimatedDocumentCount()
      if (existing > 0) {
        return 0
      }
      const docs = seedDocuments()
      if (docs.length === 0) {
        return 0
      }
      await collection.bulkWrite(
        docs.map((doc) => ({
          updateOne: {
            filter: { _id: doc._id },
            update: { $setOnInsert: doc },
            upsert: true,
          },
        })),
        { ordered: false },
      )
      return docs.length
    })().catch((error) => {
      globalForCards._cardsSeeded = undefined
      throw error
    })
  }
  return globalForCards._cardsSeeded
}

export async function forceSeedCards(): Promise<number> {
  await ensureIndexes()
  const collection = await getCardsCollection()
  const docs = seedDocuments()
  if (docs.length === 0) {
    return 0
  }
  await collection.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            topic: doc.topic,
            category: doc.category,
            question: doc.question,
            summary: doc.summary,
            answer: doc.answer,
            sourceQuestion: doc.sourceQuestion,
            ...(doc.images ? { images: doc.images } : {}),
            updatedAt: doc.updatedAt,
          },
          $setOnInsert: {
            createdAt: doc.createdAt,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  )
  globalForCards._cardsSeeded = Promise.resolve(docs.length)
  return docs.length
}

export type ListCardsOptions = {
  topic?: TopicId
  category?: string
  q?: string
}

export async function listCards(options: ListCardsOptions = {}): Promise<Card[]> {
  await seedCardsIfEmpty()
  const collection = await getCardsCollection()
  const filter: Record<string, unknown> = {}
  if (options.topic) {
    filter.topic = options.topic
  }
  if (options.category) {
    filter.category = options.category
  }
  const needle = options.q?.trim()
  if (needle) {
    filter.$text = { $search: needle }
  }

  const cursor = needle
    ? collection
        .find(filter, { projection: { score: { $meta: 'textScore' } } })
        .sort({ score: { $meta: 'textScore' } })
    : collection.find(filter).sort({ _id: 1 })

  const docs = await cursor.toArray()
  return docs.map(toCard)
}

export async function getCard(id: string): Promise<Card | null> {
  await seedCardsIfEmpty()
  const collection = await getCardsCollection()
  const doc = await collection.findOne({ _id: id })
  return doc ? toCard(doc) : null
}

export async function updateCard(id: string, patch: CardUpdate): Promise<Card | null> {
  await ensureIndexes()
  const collection = await getCardsCollection()
  const $set: Record<string, string> = {
    updatedAt: new Date().toISOString(),
  }
  if (typeof patch.question === 'string') {
    $set.question = patch.question
  }
  if (typeof patch.summary === 'string') {
    $set.summary = patch.summary
  }
  if (typeof patch.answer === 'string') {
    $set.answer = patch.answer
  }
  if (typeof patch.category === 'string') {
    $set.category = patch.category
  }

  const result = await collection.findOneAndUpdate(
    { _id: id },
    { $set },
    { returnDocument: 'after' },
  )
  return result ? toCard(result) : null
}


export type SyncSummariesResult = {
  matched: number
  modified: number
  upserted: number
}

/**
 * Upsert only summary and updatedAt from JSON decks by _id.
 * Leaves question/answer/category/sourceQuestion/images untouched so user edits survive.
 * Missing docs are inserted with the full seed document for that id.
 */
export async function syncSummariesFromJson(): Promise<SyncSummariesResult> {
  await ensureIndexes()
  const collection = await getCardsCollection()
  const docs = seedDocuments()
  if (docs.length === 0) {
    return { matched: 0, modified: 0, upserted: 0 }
  }
  const now = new Date().toISOString()
  const result = await collection.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            summary: doc.summary,
            updatedAt: now,
          },
          $setOnInsert: {
            topic: doc.topic,
            category: doc.category,
            question: doc.question,
            answer: doc.answer,
            sourceQuestion: doc.sourceQuestion,
            ...(doc.images ? { images: doc.images } : {}),
            createdAt: doc.createdAt,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  )
  return {
    matched: result.matchedCount,
    modified: result.modifiedCount,
    upserted: result.upsertedCount,
  }
}

export function getCategoryCounts(cards: Card[]): Record<string, number> {
  return cards.reduce<Record<string, number>>((acc, card) => {
    acc[card.category] = (acc[card.category] ?? 0) + 1
    return acc
  }, {})
}
