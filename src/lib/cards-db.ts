import type { TopicId } from '@/data/types'
import type { Card, CardCreate, CardDocument, CardUpdate } from '@/data/types'
import { getDb } from '@/lib/mongo'

export const CARDS_COLLECTION = 'cards'

export type CardMeta = Pick<Card, 'id' | 'topic' | 'category'>

const globalForCards = globalThis as typeof globalThis & {
  _cardsIndexesReady?: Promise<void>
  _cardsListCache?: Map<string, { at: number; cards: Card[] }>
  _cardsIdCache?: Map<string, { at: number; ids: Array<{ id: string; topic: TopicId }> }>
  _cardsMetaCache?: Map<string, { at: number; cards: CardMeta[] }>
}

/** Short in-memory TTL so topic/study/browse navigations reuse a warm Mongo result. */
const CARDS_CACHE_TTL_MS = 30_000

function listCache() {
  if (!globalForCards._cardsListCache) {
    globalForCards._cardsListCache = new Map()
  }
  return globalForCards._cardsListCache
}

function idCache() {
  if (!globalForCards._cardsIdCache) {
    globalForCards._cardsIdCache = new Map()
  }
  return globalForCards._cardsIdCache
}

function metaCache() {
  if (!globalForCards._cardsMetaCache) {
    globalForCards._cardsMetaCache = new Map()
  }
  return globalForCards._cardsMetaCache
}

export function invalidateCardsCache() {
  listCache().clear()
  idCache().clear()
  metaCache().clear()
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

export type ListCardsOptions = {
  topic?: TopicId
  category?: string
  q?: string
}

function listCacheKey(options: ListCardsOptions): string {
  return `list|${options.topic ?? ''}|${options.category ?? ''}|${options.q?.trim() ?? ''}`
}

function idCacheKey(topic?: TopicId): string {
  return `ids|${topic ?? ''}`
}

export async function listCards(options: ListCardsOptions = {}): Promise<Card[]> {
  const key = listCacheKey(options)
  const needle = options.q?.trim()
  if (!needle) {
    const hit = listCache().get(key)
    if (hit && Date.now() - hit.at < CARDS_CACHE_TTL_MS) {
      return hit.cards
    }
  }

  const collection = await getCardsCollection()
  const filter: Record<string, unknown> = {}
  if (options.topic) {
    filter.topic = options.topic
  }
  if (options.category) {
    filter.category = options.category
  }
  if (needle) {
    filter.$text = { $search: needle }
  }

  const cursor = needle
    ? collection
        .find(filter, { projection: { score: { $meta: 'textScore' } } })
        .sort({ score: { $meta: 'textScore' } })
    : collection.find(filter).sort({ _id: 1 })

  const docs = await cursor.toArray()
  const cards = docs.map(toCard)
  if (!needle) {
    listCache().set(key, { at: Date.now(), cards })
  }
  return cards
}

/** Lightweight id+topic projection for header progress without full card payloads. */
export async function listCardIds(options: { topic?: TopicId } = {}): Promise<
  Array<{ id: string; topic: TopicId }>
> {
  const key = idCacheKey(options.topic)
  const hit = idCache().get(key)
  if (hit && Date.now() - hit.at < CARDS_CACHE_TTL_MS) {
    return hit.ids
  }

  // Prefer deriving from a warm full-list cache when present.
  const listKey = listCacheKey({ topic: options.topic })
  const listHit = listCache().get(listKey)
  if (listHit && Date.now() - listHit.at < CARDS_CACHE_TTL_MS) {
    const ids = listHit.cards.map((card) => ({ id: card.id, topic: card.topic }))
    idCache().set(key, { at: Date.now(), ids })
    return ids
  }

  const collection = await getCardsCollection()
  const filter: Record<string, unknown> = {}
  if (options.topic) {
    filter.topic = options.topic
  }
  const docs = await collection
    .find(filter, { projection: { _id: 1, topic: 1 } })
    .sort({ _id: 1 })
    .toArray()
  const ids = docs.map((doc) => ({ id: doc._id, topic: doc.topic }))
  idCache().set(key, { at: Date.now(), ids })
  return ids
}

function metaCacheKey(topic?: TopicId): string {
  return `meta|${topic ?? ''}`
}

/** Lightweight id+topic+category projection for library/topic dashboards. */
export async function listCardMeta(options: { topic?: TopicId } = {}): Promise<CardMeta[]> {
  const key = metaCacheKey(options.topic)
  const hit = metaCache().get(key)
  if (hit && Date.now() - hit.at < CARDS_CACHE_TTL_MS) {
    return hit.cards
  }

  // Prefer deriving from a warm full-list cache when present.
  const listKey = listCacheKey({ topic: options.topic })
  const listHit = listCache().get(listKey)
  if (listHit && Date.now() - listHit.at < CARDS_CACHE_TTL_MS) {
    const cards = listHit.cards.map((card) => ({
      id: card.id,
      topic: card.topic,
      category: card.category,
    }))
    metaCache().set(key, { at: Date.now(), cards })
    return cards
  }

  const collection = await getCardsCollection()
  const filter: Record<string, unknown> = {}
  if (options.topic) {
    filter.topic = options.topic
  }
  const docs = await collection
    .find(filter, { projection: { _id: 1, topic: 1, category: 1 } })
    .sort({ _id: 1 })
    .toArray()
  const cards: CardMeta[] = docs.map((doc) => ({
    id: doc._id,
    topic: doc.topic,
    category: doc.category,
  }))
  metaCache().set(key, { at: Date.now(), cards })
  return cards
}

export async function getCard(id: string): Promise<Card | null> {
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
  if (result) {
    invalidateCardsCache()
    return toCard(result)
  }
  return null
}

export async function deleteCard(id: string): Promise<boolean> {
  await ensureIndexes()
  const collection = await getCardsCollection()
  const result = await collection.deleteOne({ _id: id })
  if (result.deletedCount > 0) {
    invalidateCardsCache()
    return true
  }
  return false
}

/** Stable id prefixes for known decks; new topics use a sanitized slug prefix. */
function idPrefixForTopic(topic: TopicId): string {
  if (topic === 'aws') return 'c'
  if (topic === 'pve') return 'pve'
  const clean = topic.replace(/[^a-z0-9]/gi, '').toLowerCase()
  return clean || 't'
}

function nextIdForTopic(existingIds: string[], topic: TopicId): string {
  const prefix = idPrefixForTopic(topic)
  let max = 0
  for (const id of existingIds) {
    if (!id.startsWith(prefix)) {
      continue
    }
    const suffix = id.slice(prefix.length)
    if (!/^\d+$/.test(suffix)) {
      continue
    }
    const num = Number.parseInt(suffix, 10)
    if (num > max) {
      max = num
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

export async function createCard(input: CardCreate): Promise<Card> {
  await ensureIndexes()
  const collection = await getCardsCollection()
  const topicDocs = await collection
    .find({ topic: input.topic }, { projection: { _id: 1 } })
    .toArray()
  const id = nextIdForTopic(
    topicDocs.map((doc) => doc._id),
    input.topic,
  )
  const now = new Date().toISOString()
  const doc: CardDocument = {
    _id: id,
    topic: input.topic,
    category: input.category.trim(),
    question: input.question.trim(),
    summary: input.summary.trim(),
    answer: input.answer.trim(),
    sourceQuestion: input.question.trim(),
    createdAt: now,
    updatedAt: now,
  }
  try {
    await collection.insertOne(doc)
  } catch (error) {
    // Rare race: another insert grabbed the same id — retry once with a fresh max.
    const code = (error as { code?: number }).code
    if (code !== 11000) {
      throw error
    }
    const again = await collection
      .find({ topic: input.topic }, { projection: { _id: 1 } })
      .toArray()
    doc._id = nextIdForTopic(
      again.map((item) => item._id),
      input.topic,
    )
    await collection.insertOne(doc)
  }
  invalidateCardsCache()
  return toCard(doc)
}

export function getCategoryCounts(cards: { category: string }[]): Record<string, number> {
  return cards.reduce<Record<string, number>>((acc, card) => {
    acc[card.category] = (acc[card.category] ?? 0) + 1
    return acc
  }, {})
}