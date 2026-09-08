import { categoryIdFor, SEED_CATEGORIES } from '@/data/categories'
import {
  contrastAccentFg,
  DEFAULT_LIBRARY_ACCENT,
  DEFAULT_LIBRARY_ACCENT_FG,
  DEFAULT_TOPIC_ACCENTS,
  normalizeTopicSlug,
  SEED_TOPICS,
} from '@/data/topics'
import type {
  CategoryCreate,
  CategoryDocument,
  CategoryMeta,
  CategoryUpdate,
  TopicCreate,
  TopicDocument,
  TopicId,
  TopicMeta,
  TopicUpdate,
} from '@/data/types'
import { getDb } from '@/lib/mongo'

/** Soft invalidate cards caches without importing cards-db (avoids cycles). */
function bumpCardsCache() {
  const g = globalThis as typeof globalThis & {
    _cardsListCache?: Map<string, unknown>
    _cardsIdCache?: Map<string, unknown>
    _cardsMetaCache?: Map<string, unknown>
  }
  g._cardsListCache?.clear()
  g._cardsIdCache?.clear()
  g._cardsMetaCache?.clear()
}

async function cardsCollection() {
  const db = await getDb()
  return db.collection<{ _id: string; topic: string; category: string; updatedAt?: string }>('cards')
}

export const TOPICS_COLLECTION = 'topics'
export const CATEGORIES_COLLECTION = 'categories'

const TAXONOMY_CACHE_TTL_MS = 30_000

const globalForTaxonomy = globalThis as typeof globalThis & {
  _topicsIndexesReady?: Promise<void>
  _taxonomySeeded?: Promise<void>
  _topicsCache?: { at: number; topics: TopicMeta[] }
  _categoriesCache?: Map<string, { at: number; categories: CategoryMeta[] }>
}

function categoriesCache() {
  if (!globalForTaxonomy._categoriesCache) {
    globalForTaxonomy._categoriesCache = new Map()
  }
  return globalForTaxonomy._categoriesCache
}

export function invalidateTaxonomyCache() {
  globalForTaxonomy._topicsCache = undefined
  categoriesCache().clear()
}

function toTopic(doc: TopicDocument): TopicMeta {
  return {
    id: doc._id,
    name: doc.name,
    emoji: doc.emoji,
    tagline: doc.tagline,
    blurb: doc.blurb,
    accent: doc.accent,
    accentFg: doc.accentFg,
  }
}

function toCategory(doc: CategoryDocument): CategoryMeta {
  return {
    id: doc._id,
    topic: doc.topic,
    name: doc.name,
    emoji: doc.emoji,
    blurb: doc.blurb,
  }
}

export async function getTopicsCollection() {
  const db = await getDb()
  return db.collection<TopicDocument>(TOPICS_COLLECTION)
}

export async function getCategoriesCollection() {
  const db = await getDb()
  return db.collection<CategoryDocument>(CATEGORIES_COLLECTION)
}

export async function ensureTaxonomyIndexes() {
  if (!globalForTaxonomy._topicsIndexesReady) {
    globalForTaxonomy._topicsIndexesReady = (async () => {
      const [topics, categories] = await Promise.all([
        getTopicsCollection(),
        getCategoriesCollection(),
      ])
      await Promise.all([
        categories.createIndex({ topic: 1, name: 1 }, { unique: true }),
        categories.createIndex({ topic: 1 }),
      ])
      // topics._id is the slug; no extra unique index needed
      void topics
    })().catch((error) => {
      globalForTaxonomy._topicsIndexesReady = undefined
      throw error
    })
  }
  return globalForTaxonomy._topicsIndexesReady
}

function seedTopicDocs(): TopicDocument[] {
  const now = new Date().toISOString()
  return SEED_TOPICS.map((topic) => ({
    _id: topic.id,
    name: topic.name,
    emoji: topic.emoji,
    tagline: topic.tagline,
    blurb: topic.blurb,
    accent: topic.accent,
    accentFg: topic.accentFg,
    createdAt: now,
    updatedAt: now,
  }))
}

function seedCategoryDocs(): CategoryDocument[] {
  const now = new Date().toISOString()
  return SEED_CATEGORIES.map((category) => ({
    _id: categoryIdFor(category.topic, category.name),
    topic: category.topic,
    name: category.name,
    emoji: category.emoji,
    blurb: category.blurb,
    createdAt: now,
    updatedAt: now,
  }))
}

export async function seedTaxonomyIfEmpty(): Promise<void> {
  if (!globalForTaxonomy._taxonomySeeded) {
    globalForTaxonomy._taxonomySeeded = (async () => {
      await ensureTaxonomyIndexes()
      const [topicsCol, categoriesCol] = await Promise.all([
        getTopicsCollection(),
        getCategoriesCollection(),
      ])
      const [topicCount, categoryCount] = await Promise.all([
        topicsCol.estimatedDocumentCount(),
        categoriesCol.estimatedDocumentCount(),
      ])
      if (topicCount === 0) {
        const docs = seedTopicDocs()
        await topicsCol.bulkWrite(
          docs.map((doc) => ({
            updateOne: {
              filter: { _id: doc._id },
              update: { $setOnInsert: doc },
              upsert: true,
            },
          })),
          { ordered: false },
        )
      }
      if (categoryCount === 0) {
        const docs = seedCategoryDocs()
        await categoriesCol.bulkWrite(
          docs.map((doc) => ({
            updateOne: {
              filter: { _id: doc._id },
              update: { $setOnInsert: doc },
              upsert: true,
            },
          })),
          { ordered: false },
        )
      }
    })().catch((error) => {
      globalForTaxonomy._taxonomySeeded = undefined
      throw error
    })
  }
  return globalForTaxonomy._taxonomySeeded
}

export async function listTopics(): Promise<TopicMeta[]> {
  const hit = globalForTaxonomy._topicsCache
  if (hit && Date.now() - hit.at < TAXONOMY_CACHE_TTL_MS) {
    return hit.topics
  }
  await seedTaxonomyIfEmpty()
  const collection = await getTopicsCollection()
  const docs = await collection.find({}).sort({ _id: 1 }).toArray()
  const topics = docs.map(toTopic)
  globalForTaxonomy._topicsCache = { at: Date.now(), topics }
  return topics
}

export async function getTopic(id: TopicId): Promise<TopicMeta | null> {
  const topics = await listTopics()
  return topics.find((item) => item.id === id) ?? null
}

export async function topicExists(id: TopicId): Promise<boolean> {
  return (await getTopic(id)) !== null
}

export function resolveAccent(topic: TopicMeta | null | undefined): {
  accent: string
  accentFg: string
} {
  if (topic) {
    return { accent: topic.accent, accentFg: topic.accentFg }
  }
  return {
    accent: DEFAULT_LIBRARY_ACCENT,
    accentFg: DEFAULT_LIBRARY_ACCENT_FG,
  }
}

export async function listCategories(topic?: TopicId): Promise<CategoryMeta[]> {
  const key = topic ?? ''
  const hit = categoriesCache().get(key)
  if (hit && Date.now() - hit.at < TAXONOMY_CACHE_TTL_MS) {
    return hit.categories
  }
  await seedTaxonomyIfEmpty()
  const collection = await getCategoriesCollection()
  const filter = topic ? { topic } : {}
  const docs = await collection.find(filter).sort({ topic: 1, name: 1 }).toArray()
  const categories = docs.map(toCategory)
  categoriesCache().set(key, { at: Date.now(), categories })
  return categories
}

export async function getCategory(id: string): Promise<CategoryMeta | null> {
  await seedTaxonomyIfEmpty()
  const collection = await getCategoriesCollection()
  const doc = await collection.findOne({ _id: id })
  return doc ? toCategory(doc) : null
}

export async function getCategoriesForTopic(topic: TopicId): Promise<CategoryMeta[]> {
  return listCategories(topic)
}

export async function categoryAllowed(topic: TopicId, name: string): Promise<boolean> {
  const categories = await getCategoriesForTopic(topic)
  return categories.some((item) => item.name === name)
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
}

export async function createTopic(input: TopicCreate): Promise<TopicMeta> {
  await ensureTaxonomyIndexes()
  const id = normalizeTopicSlug(input.id)
  if (!id) {
    throw new Error('Topic id/slug is required')
  }
  if (id === 'admin' || id === 'api' || id === 'library') {
    throw new Error(`Topic id "${id}" is reserved`)
  }
  if (!input.name.trim()) {
    throw new Error('Topic name is required')
  }
  const accent = (input.accent || DEFAULT_TOPIC_ACCENTS[id]?.accent || DEFAULT_LIBRARY_ACCENT).trim()
  if (!isHexColor(accent)) {
    throw new Error('Accent must be a hex color like #fbbf24')
  }
  const accentFg = (
    input.accentFg?.trim() ||
    DEFAULT_TOPIC_ACCENTS[id]?.accentFg ||
    contrastAccentFg(accent)
  ).trim()
  const now = new Date().toISOString()
  const doc: TopicDocument = {
    _id: id,
    name: input.name.trim(),
    emoji: (input.emoji || '📘').trim(),
    tagline: (input.tagline || '').trim(),
    blurb: (input.blurb || '').trim(),
    accent,
    accentFg,
    createdAt: now,
    updatedAt: now,
  }
  const collection = await getTopicsCollection()
  try {
    await collection.insertOne(doc)
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code === 11000) {
      throw new Error(`Topic "${id}" already exists`)
    }
    throw error
  }
  invalidateTaxonomyCache()
  return toTopic(doc)
}

export async function updateTopic(id: TopicId, patch: TopicUpdate): Promise<TopicMeta | null> {
  await ensureTaxonomyIndexes()
  const $set: Record<string, string> = { updatedAt: new Date().toISOString() }
  if (typeof patch.name === 'string') {
    $set.name = patch.name.trim()
  }
  if (typeof patch.emoji === 'string') {
    $set.emoji = patch.emoji.trim()
  }
  if (typeof patch.tagline === 'string') {
    $set.tagline = patch.tagline.trim()
  }
  if (typeof patch.blurb === 'string') {
    $set.blurb = patch.blurb.trim()
  }
  if (typeof patch.accent === 'string') {
    const accent = patch.accent.trim()
    if (!isHexColor(accent)) {
      throw new Error('Accent must be a hex color like #fbbf24')
    }
    $set.accent = accent
    if (typeof patch.accentFg !== 'string') {
      $set.accentFg = contrastAccentFg(accent)
    }
  }
  if (typeof patch.accentFg === 'string') {
    $set.accentFg = patch.accentFg.trim()
  }
  const collection = await getTopicsCollection()
  const result = await collection.findOneAndUpdate({ _id: id }, { $set }, { returnDocument: 'after' })
  if (!result) {
    return null
  }
  invalidateTaxonomyCache()
  return toTopic(result)
}

export async function deleteTopic(id: TopicId): Promise<{ ok: true } | { error: string; status: number }> {
  await seedTaxonomyIfEmpty()
  const cards = await cardsCollection()
  const cardCount = await cards.countDocuments({ topic: id })
  if (cardCount > 0) {
    return {
      error: `Cannot delete topic "${id}": ${cardCount} card(s) still reference it. Reassign or delete cards first.`,
      status: 409,
    }
  }
  const categories = await getCategoriesCollection()
  const categoryCount = await categories.countDocuments({ topic: id })
  if (categoryCount > 0) {
    return {
      error: `Cannot delete topic "${id}": ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'} still exist. Delete or merge them first.`,
      status: 409,
    }
  }
  const topics = await getTopicsCollection()
  const result = await topics.deleteOne({ _id: id })
  if (result.deletedCount === 0) {
    return { error: 'Topic not found', status: 404 }
  }
  invalidateTaxonomyCache()
  return { ok: true }
}

export async function createCategory(input: CategoryCreate): Promise<CategoryMeta> {
  await ensureTaxonomyIndexes()
  const topic = input.topic.trim()
  const name = input.name.trim()
  if (!topic || !name) {
    throw new Error('Topic and name are required')
  }
  const exists = await topicExists(topic)
  if (!exists) {
    throw new Error(`Topic "${topic}" does not exist`)
  }
  const now = new Date().toISOString()
  const doc: CategoryDocument = {
    _id: categoryIdFor(topic, name),
    topic,
    name,
    emoji: (input.emoji || '⚡').trim(),
    blurb: (input.blurb || '').trim(),
    createdAt: now,
    updatedAt: now,
  }
  const collection = await getCategoriesCollection()
  try {
    await collection.insertOne(doc)
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code === 11000) {
      throw new Error(`Category "${name}" already exists in topic ${topic}`)
    }
    throw error
  }
  invalidateTaxonomyCache()
  return toCategory(doc)
}

export async function updateCategory(
  id: string,
  patch: CategoryUpdate,
): Promise<CategoryMeta | null> {
  await ensureTaxonomyIndexes()
  const collection = await getCategoriesCollection()
  const existing = await collection.findOne({ _id: id })
  if (!existing) {
    return null
  }

  const $set: Record<string, string> = { updatedAt: new Date().toISOString() }
  const oldName = existing.name
  let renamed = false

  if (typeof patch.name === 'string') {
    const nextName = patch.name.trim()
    if (!nextName) {
      throw new Error('Category name cannot be empty')
    }
    if (nextName !== oldName) {
      const clash = await collection.findOne({
        topic: existing.topic,
        name: nextName,
        _id: { $ne: id },
      })
      if (clash) {
        throw new Error(`Category "${nextName}" already exists in topic ${existing.topic}`)
      }
      $set.name = nextName
      renamed = true
    }
  }
  if (typeof patch.emoji === 'string') {
    $set.emoji = patch.emoji.trim()
  }
  if (typeof patch.blurb === 'string') {
    $set.blurb = patch.blurb.trim()
  }

  const result = await collection.findOneAndUpdate({ _id: id }, { $set }, { returnDocument: 'after' })
  if (!result) {
    return null
  }

  if (renamed) {
    const cards = await cardsCollection()
    await cards.updateMany(
      { topic: existing.topic, category: oldName },
      { $set: { category: result.name, updatedAt: new Date().toISOString() } },
    )
    bumpCardsCache()
  }

  invalidateTaxonomyCache()
  return toCategory(result)
}

export async function deleteCategory(
  id: string,
): Promise<{ ok: true } | { error: string; status: number }> {
  await seedTaxonomyIfEmpty()
  const collection = await getCategoriesCollection()
  const existing = await collection.findOne({ _id: id })
  if (!existing) {
    return { error: 'Category not found', status: 404 }
  }
  const cards = await cardsCollection()
  const cardCount = await cards.countDocuments({
    topic: existing.topic,
    category: existing.name,
  })
  if (cardCount > 0) {
    return {
      error: `Cannot delete category "${existing.name}": ${cardCount} card(s) still use it. Merge into another category or reassign cards first.`,
      status: 409,
    }
  }
  await collection.deleteOne({ _id: id })
  invalidateTaxonomyCache()
  return { ok: true }
}

export async function mergeCategories(
  sourceId: string,
  targetId: string,
): Promise<
  | { ok: true; moved: number; source: CategoryMeta; target: CategoryMeta }
  | { error: string; status: number }
> {
  if (sourceId === targetId) {
    return { error: 'Source and target must be different categories', status: 400 }
  }
  await seedTaxonomyIfEmpty()
  const collection = await getCategoriesCollection()
  const [source, target] = await Promise.all([
    collection.findOne({ _id: sourceId }),
    collection.findOne({ _id: targetId }),
  ])
  if (!source) {
    return { error: 'Source category not found', status: 404 }
  }
  if (!target) {
    return { error: 'Target category not found', status: 404 }
  }
  if (source.topic !== target.topic) {
    return { error: 'Categories must belong to the same topic', status: 400 }
  }

  const cards = await cardsCollection()
  const now = new Date().toISOString()
  const result = await cards.updateMany(
    { topic: source.topic, category: source.name },
    { $set: { category: target.name, updatedAt: now } },
  )
  await collection.deleteOne({ _id: sourceId })
  bumpCardsCache()
  invalidateTaxonomyCache()
  return {
    ok: true,
    moved: result.modifiedCount,
    source: toCategory(source),
    target: toCategory(target),
  }
}
