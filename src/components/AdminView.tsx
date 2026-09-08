'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_LIBRARY_ACCENT,
  DEFAULT_LIBRARY_ACCENT_FG,
  contrastAccentFg,
  normalizeTopicSlug,
} from '@/data/topics'
import type { CategoryMeta, TopicMeta } from '@/data/types'
import { invalidateTaxonomyClientCache, useTaxonomy } from '@/lib/taxonomy'

type TopicForm = {
  id: string
  name: string
  emoji: string
  tagline: string
  blurb: string
  accent: string
  accentFg: string
}

type CategoryForm = {
  topic: string
  name: string
  emoji: string
  blurb: string
}

const emptyTopic = (): TopicForm => ({
  id: '',
  name: '',
  emoji: '📘',
  tagline: '',
  blurb: '',
  accent: DEFAULT_LIBRARY_ACCENT,
  accentFg: DEFAULT_LIBRARY_ACCENT_FG,
})

const emptyCategory = (topic: string): CategoryForm => ({
  topic,
  name: '',
  emoji: '⚡',
  blurb: '',
})

export function AdminView() {
  const { topics, categories, refresh, getCategoriesForTopic } = useTaxonomy()
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topics[0]?.id ?? 'aws')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [topicForm, setTopicForm] = useState<TopicForm>(emptyTopic)
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)

  const [categoryForm, setCategoryForm] = useState<CategoryForm>(() => emptyCategory(selectedTopicId))
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)

  const [mergeSourceId, setMergeSourceId] = useState<string>('')
  const [mergeTargetId, setMergeTargetId] = useState<string>('')

  const topicCategories = useMemo(
    () => getCategoriesForTopic(selectedTopicId),
    [getCategoriesForTopic, selectedTopicId, categories],
  )

  useEffect(() => {
    if (!topics.some((item) => item.id === selectedTopicId) && topics[0]) {
      setSelectedTopicId(topics[0].id)
      setCategoryForm((current) => ({ ...current, topic: topics[0].id }))
    }
  }, [topics, selectedTopicId])

  async function afterMutation(okMessage: string) {
    invalidateTaxonomyClientCache()
    await refresh()
    setMessage(okMessage)
    setError(null)
  }

  async function saveTopic() {
    setBusy(true)
    setError(null)
    try {
      const accent = topicForm.accent.trim()
      const accentFg = topicForm.accentFg.trim() || contrastAccentFg(accent)
      if (editingTopicId) {
        const response = await fetch(`/api/topics/${encodeURIComponent(editingTopicId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: topicForm.name,
            emoji: topicForm.emoji,
            tagline: topicForm.tagline,
            blurb: topicForm.blurb,
            accent,
            accentFg,
          }),
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to update topic')
        }
        await afterMutation(`Updated topic ${editingTopicId}`)
      } else {
        const id = normalizeTopicSlug(topicForm.id || topicForm.name)
        const response = await fetch('/api/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            name: topicForm.name,
            emoji: topicForm.emoji,
            tagline: topicForm.tagline,
            blurb: topicForm.blurb,
            accent,
            accentFg,
          }),
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to create topic')
        }
        setSelectedTopicId(payload.id)
        await afterMutation(`Created topic ${payload.id}`)
      }
      setTopicForm(emptyTopic())
      setEditingTopicId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Topic save failed')
    } finally {
      setBusy(false)
    }
  }

  function startEditTopic(topic: TopicMeta) {
    setEditingTopicId(topic.id)
    setTopicForm({
      id: topic.id,
      name: topic.name,
      emoji: topic.emoji,
      tagline: topic.tagline,
      blurb: topic.blurb,
      accent: topic.accent,
      accentFg: topic.accentFg,
    })
  }

  async function removeTopic(topic: TopicMeta) {
    if (!window.confirm(`Delete topic "${topic.name}" (${topic.id})? Only allowed if it has no cards or categories.`)) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/topics/${encodeURIComponent(topic.id)}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete topic')
      }
      if (selectedTopicId === topic.id) {
        setSelectedTopicId(topics.find((item) => item.id !== topic.id)?.id ?? '')
      }
      await afterMutation(`Deleted topic ${topic.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Topic delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveCategory() {
    setBusy(true)
    setError(null)
    try {
      if (editingCategoryId) {
        const response = await fetch(`/api/categories/${encodeURIComponent(editingCategoryId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: categoryForm.name,
            emoji: categoryForm.emoji,
            blurb: categoryForm.blurb,
          }),
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to update category')
        }
        await afterMutation(`Updated category "${payload.name}" (cards renamed if needed)`)
      } else {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryForm),
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to create category')
        }
        await afterMutation(`Created category "${payload.name}"`)
      }
      setCategoryForm(emptyCategory(selectedTopicId))
      setEditingCategoryId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Category save failed')
    } finally {
      setBusy(false)
    }
  }

  function startEditCategory(category: CategoryMeta) {
    setEditingCategoryId(category.id)
    setCategoryForm({
      topic: category.topic,
      name: category.name,
      emoji: category.emoji,
      blurb: category.blurb,
    })
    setSelectedTopicId(category.topic)
  }

  async function removeCategory(category: CategoryMeta) {
    if (
      !window.confirm(
        `Delete category "${category.name}"? Only allowed if no cards use it. Prefer Merge if cards exist.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/categories/${encodeURIComponent(category.id)}`, {
        method: 'DELETE',
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete category')
      }
      await afterMutation(`Deleted category "${category.name}"`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Category delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function runMerge() {
    if (!mergeSourceId || !mergeTargetId) {
      setError('Pick both source and target categories to merge')
      return
    }
    const source = topicCategories.find((item) => item.id === mergeSourceId)
    const target = topicCategories.find((item) => item.id === mergeTargetId)
    if (
      !window.confirm(
        `Merge "${source?.name}" → "${target?.name}"? All cards move to the target and the source category is deleted.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/categories/${encodeURIComponent(mergeSourceId)}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: mergeTargetId }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to merge categories')
      }
      setMergeSourceId('')
      setMergeTargetId('')
      await afterMutation(`Merged categories (moved ${payload.moved} card(s))`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-10 pb-10">
      <section className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Topics & categories</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Manage taxonomy stored in MongoDB. Card ids and progress stay stable. Deletes are blocked while
          cards still reference a topic or category — use merge/reassign first.
        </p>
        {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">Topics</h2>
          <ul className="mt-4 space-y-2">
            {topics.map((topic) => (
              <li
                key={topic.id}
                className={`flex items-start justify-between gap-3 rounded-2xl border px-3 py-3 ${
                  selectedTopicId === topic.id
                    ? 'border-accent/40 bg-accent/5'
                    : 'border-white/10 bg-slate-950/40'
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setSelectedTopicId(topic.id)
                    setCategoryForm((current) => ({ ...current, topic: topic.id }))
                  }}
                >
                  <p className="text-sm font-medium text-white">
                    <span className="mr-2">{topic.emoji}</span>
                    {topic.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    /{topic.id} · <span style={{ color: topic.accent }}>{topic.accent}</span>
                  </p>
                </button>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                    onClick={() => startEditTopic(topic)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                    onClick={() => void removeTopic(topic)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {editingTopicId ? `Edit ${editingTopicId}` : 'Add topic'}
            </p>
            {!editingTopicId ? (
              <input
                value={topicForm.id}
                onChange={(event) => setTopicForm((current) => ({ ...current, id: event.target.value }))}
                placeholder="slug (e.g. k8s)"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
              />
            ) : null}
            <input
              value={topicForm.name}
              onChange={(event) => setTopicForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Name"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={topicForm.emoji}
                onChange={(event) => setTopicForm((current) => ({ ...current, emoji: event.target.value }))}
                placeholder="Emoji"
                className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
              />
              <input
                value={topicForm.accent}
                onChange={(event) => {
                  const accent = event.target.value
                  setTopicForm((current) => ({
                    ...current,
                    accent,
                    accentFg: contrastAccentFg(accent),
                  }))
                }}
                placeholder="#fbbf24"
                className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
              />
            </div>
            <input
              value={topicForm.tagline}
              onChange={(event) => setTopicForm((current) => ({ ...current, tagline: event.target.value }))}
              placeholder="Tagline"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
            />
            <textarea
              value={topicForm.blurb}
              onChange={(event) => setTopicForm((current) => ({ ...current, blurb: event.target.value }))}
              placeholder="Blurb"
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60"
                disabled={busy}
                onClick={() => void saveTopic()}
              >
                {editingTopicId ? 'Save topic' : 'Create topic'}
              </button>
              {editingTopicId ? (
                <button
                  type="button"
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-white"
                  onClick={() => {
                    setEditingTopicId(null)
                    setTopicForm(emptyTopic())
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Categories</h2>
            <select
              value={selectedTopicId}
              onChange={(event) => {
                setSelectedTopicId(event.target.value)
                setCategoryForm((current) => ({ ...current, topic: event.target.value }))
                setMergeSourceId('')
                setMergeTargetId('')
              }}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
            >
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.emoji} {topic.id}
                </option>
              ))}
            </select>
          </div>

          <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {topicCategories.map((category) => (
              <li
                key={category.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    <span className="mr-2">{category.emoji}</span>
                    {category.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{category.blurb || '—'}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                    onClick={() => startEditCategory(category)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                    onClick={() => void removeCategory(category)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {topicCategories.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-white/10 px-3 py-6 text-center text-sm text-slate-500">
                No categories for this topic yet.
              </li>
            ) : null}
          </ul>

          <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {editingCategoryId ? 'Edit category (rename updates cards)' : 'Add category'}
            </p>
            <input
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Name"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
            />
            <input
              value={categoryForm.emoji}
              onChange={(event) => setCategoryForm((current) => ({ ...current, emoji: event.target.value }))}
              placeholder="Emoji"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
            />
            <textarea
              value={categoryForm.blurb}
              onChange={(event) => setCategoryForm((current) => ({ ...current, blurb: event.target.value }))}
              placeholder="Blurb"
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60"
                disabled={busy || !selectedTopicId}
                onClick={() => void saveCategory()}
              >
                {editingCategoryId ? 'Save category' : 'Create category'}
              </button>
              {editingCategoryId ? (
                <button
                  type="button"
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-white"
                  onClick={() => {
                    setEditingCategoryId(null)
                    setCategoryForm(emptyCategory(selectedTopicId))
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Merge categories
            </p>
            <p className="text-xs text-slate-500">
              Moves all cards from source → target within this topic, then deletes the source.
            </p>
            <select
              value={mergeSourceId}
              onChange={(event) => setMergeSourceId(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Source category…</option>
              {topicCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.emoji} {item.name}
                </option>
              ))}
            </select>
            <select
              value={mergeTargetId}
              onChange={(event) => setMergeTargetId(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">Target category…</option>
              {topicCategories
                .filter((item) => item.id !== mergeSourceId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.emoji} {item.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/20 disabled:opacity-60"
              disabled={busy}
              onClick={() => void runMerge()}
            >
              Merge now
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
