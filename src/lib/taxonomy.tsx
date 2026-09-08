'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_LIBRARY_ACCENT,
  DEFAULT_LIBRARY_ACCENT_FG,
  DEFAULT_TOPIC_ACCENTS,
  SEED_TOPICS,
  topicFromPath,
} from '@/data/topics'
import { SEED_CATEGORIES } from '@/data/categories'
import type { CategoryMeta, TopicId, TopicMeta } from '@/data/types'

type TaxonomyState = {
  topics: TopicMeta[]
  categories: CategoryMeta[]
  ready: boolean
  refresh: () => Promise<void>
  getTopic: (id: TopicId) => TopicMeta | undefined
  getCategoriesForTopic: (topic: TopicId) => CategoryMeta[]
  getCategoryEmoji: (name: string, topic?: TopicId) => string
  accentFor: (topicId: TopicId | null) => { accent: string; accentFg: string }
}

const TaxonomyContext = createContext<TaxonomyState | null>(null)

const seedTopicsFallback: TopicMeta[] = SEED_TOPICS
const seedCategoriesFallback: CategoryMeta[] = SEED_CATEGORIES.map((item) => ({
  id: `${item.topic}__seed`,
  topic: item.topic,
  name: item.name,
  emoji: item.emoji,
  blurb: item.blurb,
}))

let moduleCache: { at: number; topics: TopicMeta[]; categories: CategoryMeta[] } | null = null
let inflight: Promise<{ topics: TopicMeta[]; categories: CategoryMeta[] }> | null = null
const TTL_MS = 30_000

async function fetchTaxonomy(force = false) {
  if (!force && moduleCache && Date.now() - moduleCache.at < TTL_MS) {
    return moduleCache
  }
  if (!inflight) {
    inflight = Promise.all([
      fetch('/api/topics').then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load topics')
        }
        return response.json() as Promise<TopicMeta[]>
      }),
      fetch('/api/categories').then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load categories')
        }
        return response.json() as Promise<CategoryMeta[]>
      }),
    ])
      .then(([topics, categories]) => {
        const next = {
          at: Date.now(),
          topics: Array.isArray(topics) ? topics : seedTopicsFallback,
          categories: Array.isArray(categories) ? categories : seedCategoriesFallback,
        }
        moduleCache = next
        return next
      })
      .catch(() => {
        const next = {
          at: Date.now(),
          topics: moduleCache?.topics ?? seedTopicsFallback,
          categories: moduleCache?.categories ?? seedCategoriesFallback,
        }
        moduleCache = next
        return next
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function TaxonomyProvider({
  children,
  initialTopics,
  initialCategories,
}: {
  children: ReactNode
  initialTopics?: TopicMeta[]
  initialCategories?: CategoryMeta[]
}) {
  const [topics, setTopics] = useState<TopicMeta[]>(
    () => initialTopics ?? moduleCache?.topics ?? seedTopicsFallback,
  )
  const [categories, setCategories] = useState<CategoryMeta[]>(
    () => initialCategories ?? moduleCache?.categories ?? seedCategoriesFallback,
  )
  const [ready, setReady] = useState(Boolean(initialTopics && initialCategories) || Boolean(moduleCache))

  const apply = useCallback((next: { topics: TopicMeta[]; categories: CategoryMeta[] }) => {
    setTopics(next.topics)
    setCategories(next.categories)
    setReady(true)
  }, [])

  const refresh = useCallback(async () => {
    const next = await fetchTaxonomy(true)
    apply(next)
  }, [apply])

  useEffect(() => {
    let cancelled = false
    void fetchTaxonomy(false).then((next) => {
      if (!cancelled) {
        apply(next)
      }
    })
    return () => {
      cancelled = true
    }
  }, [apply])

  const value = useMemo<TaxonomyState>(() => {
    function getTopic(id: TopicId) {
      return topics.find((item) => item.id === id)
    }
    function getCategoriesForTopic(topic: TopicId) {
      return categories.filter((item) => item.topic === topic)
    }
    function getCategoryEmoji(name: string, topic?: TopicId) {
      return (
        categories.find((item) => item.name === name && (!topic || item.topic === topic))?.emoji ??
        '⚡'
      )
    }
    function accentFor(topicId: TopicId | null) {
      if (!topicId) {
        return {
          accent: DEFAULT_LIBRARY_ACCENT,
          accentFg: DEFAULT_LIBRARY_ACCENT_FG,
        }
      }
      const topic = getTopic(topicId)
      if (topic) {
        return { accent: topic.accent, accentFg: topic.accentFg }
      }
      const fallback = DEFAULT_TOPIC_ACCENTS[topicId]
      if (fallback) {
        return fallback
      }
      return {
        accent: DEFAULT_LIBRARY_ACCENT,
        accentFg: DEFAULT_LIBRARY_ACCENT_FG,
      }
    }
    return {
      topics,
      categories,
      ready,
      refresh,
      getTopic,
      getCategoriesForTopic,
      getCategoryEmoji,
      accentFor,
    }
  }, [topics, categories, ready, refresh])

  return <TaxonomyContext.Provider value={value}>{children}</TaxonomyContext.Provider>
}

export function useTaxonomy() {
  const ctx = useContext(TaxonomyContext)
  if (!ctx) {
    throw new Error('useTaxonomy must be used within TaxonomyProvider')
  }
  return ctx
}

export function useTopicFromPath(pathname: string): TopicId | null {
  return topicFromPath(pathname)
}

/** Clear module cache after admin mutations (also call refresh()). */
export function invalidateTaxonomyClientCache() {
  moduleCache = null
}
