'use client'

import { useMemo, useState } from 'react'
import { ConfirmModal } from '@/components/ConfirmModal'
import { IconLayers, IconPencil, IconPlus, IconTrash } from '@/components/icons'
import {
  DEFAULT_LIBRARY_ACCENT,
  DEFAULT_LIBRARY_ACCENT_FG,
  contrastAccentFg,
  normalizeTopicSlug,
} from '@/data/topics'
import type { CategoryMeta, TopicMeta } from '@/data/types'
import { invalidateTaxonomyClientCache, useTaxonomy } from '@/lib/taxonomy'

type Zone = 'topics' | 'categories'

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

type ConfirmState =
  | { kind: 'topic-delete'; topic: TopicMeta }
  | { kind: 'category-delete'; category: CategoryMeta }
  | { kind: 'category-merge'; source: CategoryMeta; targetId: string }
  | null

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

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2'

export function AdminView() {
  const { topics, categories, refresh, getCategoriesForTopic } = useTaxonomy()
  const [zone, setZone] = useState<Zone>('topics')
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topics[0]?.id ?? 'aws')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [topicModalOpen, setTopicModalOpen] = useState(false)
  const [topicForm, setTopicForm] = useState<TopicForm>(emptyTopic)
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(() => emptyCategory(selectedTopicId))
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)

  const [mergeSource, setMergeSource] = useState<CategoryMeta | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState('')

  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const activeTopicId = topics.some((item) => item.id === selectedTopicId)
    ? selectedTopicId
    : (topics[0]?.id ?? '')

  const topicCategories = useMemo(
    () => getCategoriesForTopic(activeTopicId),
    [getCategoriesForTopic, activeTopicId],
  )

  const categoryCountByTopic = useMemo(() => {
    const map = new Map<string, number>()
    for (const category of categories) {
      map.set(category.topic, (map.get(category.topic) ?? 0) + 1)
    }
    return map
  }, [categories])

  async function afterMutation(okMessage: string) {
    invalidateTaxonomyClientCache()
    await refresh()
    setMessage(okMessage)
    setError(null)
  }

  function openCreateTopic() {
    setEditingTopicId(null)
    setTopicForm(emptyTopic())
    setTopicModalOpen(true)
    setError(null)
  }

  function openEditTopic(topic: TopicMeta) {
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
    setTopicModalOpen(true)
    setError(null)
  }

  function closeTopicModal() {
    setTopicModalOpen(false)
    setEditingTopicId(null)
    setTopicForm(emptyTopic())
  }

  async function saveTopic() {
    setBusy(true)
    setError(null)
    try {
      const accent = topicForm.accent.trim() || DEFAULT_LIBRARY_ACCENT
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
      closeTopicModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Topic save failed')
    } finally {
      setBusy(false)
    }
  }

  function openCreateCategory() {
    setEditingCategoryId(null)
    setCategoryForm(emptyCategory(activeTopicId))
    setCategoryModalOpen(true)
    setError(null)
  }

  function openEditCategory(category: CategoryMeta) {
    setEditingCategoryId(category.id)
    setCategoryForm({
      topic: category.topic,
      name: category.name,
      emoji: category.emoji,
      blurb: category.blurb,
    })
    setSelectedTopicId(category.topic)
    setCategoryModalOpen(true)
    setError(null)
  }

  function closeCategoryModal() {
    setCategoryModalOpen(false)
    setEditingCategoryId(null)
    setCategoryForm(emptyCategory(activeTopicId))
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
          body: JSON.stringify({ ...categoryForm, topic: activeTopicId }),
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to create category')
        }
        await afterMutation(`Created category "${payload.name}"`)
      }
      closeCategoryModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Category save failed')
    } finally {
      setBusy(false)
    }
  }

  function openMerge(category: CategoryMeta) {
    setMergeSource(category)
    setMergeTargetId('')
    setError(null)
  }

  function requestMergeConfirm() {
    if (!mergeSource || !mergeTargetId) {
      setError('Pick a target category to merge into')
      return
    }
    setConfirmError(null)
    setConfirm({ kind: 'category-merge', source: mergeSource, targetId: mergeTargetId })
  }

  async function runConfirmedAction() {
    if (!confirm) return
    setBusy(true)
    setConfirmError(null)
    try {
      if (confirm.kind === 'topic-delete') {
        const response = await fetch(`/api/topics/${encodeURIComponent(confirm.topic.id)}`, {
          method: 'DELETE',
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to delete topic')
        }
        if (selectedTopicId === confirm.topic.id) {
          setSelectedTopicId(topics.find((item) => item.id !== confirm.topic.id)?.id ?? '')
        }
        await afterMutation(`Deleted topic ${confirm.topic.id}`)
      } else if (confirm.kind === 'category-delete') {
        const response = await fetch(`/api/categories/${encodeURIComponent(confirm.category.id)}`, {
          method: 'DELETE',
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to delete category')
        }
        await afterMutation(`Deleted category "${confirm.category.name}"`)
      } else if (confirm.kind === 'category-merge') {
        const response = await fetch(
          `/api/categories/${encodeURIComponent(confirm.source.id)}/merge`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId: confirm.targetId }),
          },
        )
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error ?? 'Failed to merge categories')
        }
        setMergeSource(null)
        setMergeTargetId('')
        await afterMutation(`Merged categories (moved ${payload.moved} card(s))`)
      }
      setConfirm(null)
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const selectedTopic = topics.find((item) => item.id === activeTopicId)
  const previewAccent = topicForm.accent.trim() || DEFAULT_LIBRARY_ACCENT
  const previewAccentFg = topicForm.accentFg.trim() || contrastAccentFg(previewAccent)
  const mergeTarget = topicCategories.find((item) => item.id === mergeTargetId)

  return (
    <div className="space-y-6 pb-24">
      <section className="max-w-3xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Deck taxonomy</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Manage topics and categories in MongoDB. Card ids and progress stay stable. Deletes are
              blocked while cards still reference a topic or category — merge or reassign first.
            </p>
          </div>
          <span className="hidden shrink-0 font-mono text-xs text-slate-500 sm:inline">/admin</span>
        </div>
        {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </section>

      <div className="flex rounded-xl border border-white/10 bg-slate-900/90 p-1 text-sm font-medium text-slate-400">
        <button
          type="button"
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2 transition ${
            zone === 'topics'
              ? 'bg-slate-800 font-semibold text-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.18)]'
              : 'hover:text-slate-200'
          }`}
          onClick={() => setZone('topics')}
        >
          Topics
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              zone === 'topics' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {topics.length}
          </span>
        </button>
        <button
          type="button"
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2 transition ${
            zone === 'categories'
              ? 'bg-slate-800 font-semibold text-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.18)]'
              : 'hover:text-slate-200'
          }`}
          onClick={() => setZone('categories')}
        >
          Categories
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              zone === 'categories' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {categories.length}
          </span>
        </button>
      </div>

      {zone === 'topics' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Topics</h2>
            <button
              type="button"
              onClick={openCreateTopic}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90"
            >
              <IconPlus className="h-4 w-4" />
              Add topic
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {topics.map((topic) => {
              const catCount = categoryCountByTopic.get(topic.id) ?? 0
              const canDelete = catCount === 0
              return (
                <article
                  key={topic.id}
                  className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl"
                  style={{ ['--accent' as string]: topic.accent, ['--accent-fg' as string]: topic.accentFg }}
                >
                  <div
                    className="absolute bottom-0 left-0 top-0 w-1"
                    style={{ backgroundColor: topic.accent }}
                    aria-hidden
                  />
                  <div className="pl-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl" aria-hidden>
                            {topic.emoji}
                          </span>
                          <h3 className="truncate text-base font-semibold text-white">{topic.name}</h3>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                            slug: {topic.id}
                          </span>
                          <span
                            className="inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-white/10"
                            style={{ backgroundColor: topic.accent }}
                            title={topic.accent}
                            aria-label={`Accent ${topic.accent}`}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-300">
                      {topic.tagline || topic.blurb || '—'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="rounded-md border border-white/5 bg-slate-950/70 px-2 py-0.5 text-slate-300">
                        {catCount} categor{catCount === 1 ? 'y' : 'ies'}
                      </span>
                      {topic.blurb && topic.tagline ? (
                        <span className="line-clamp-1 text-slate-500">{topic.blurb}</span>
                      ) : null}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                      <button
                        type="button"
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                        onClick={() => openEditTopic(topic)}
                      >
                        <IconPencil className="h-3.5 w-3.5 text-slate-400" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-accent/25 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/15"
                        onClick={() => {
                          setSelectedTopicId(topic.id)
                          setCategoryForm((current) => ({ ...current, topic: topic.id }))
                          setZone('categories')
                        }}
                      >
                        <IconLayers className="h-3.5 w-3.5" />
                        Categories ({catCount})
                      </button>
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={busy || !canDelete}
                        title={
                          canDelete
                            ? `Delete topic ${topic.id}`
                            : `Cannot delete: ${catCount} categor${catCount === 1 ? 'y' : 'ies'} still exist`
                        }
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => {
                          setConfirmError(null)
                          setConfirm({ kind: 'topic-delete', topic })
                        }}
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                        {canDelete ? 'Delete' : 'Delete blocked (not empty)'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          {topics.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
              No topics yet. Add your first topic to get started.
            </div>
          ) : null}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Categories</h2>
              <p className="mt-1 text-xs text-slate-500">
                Scoped to a topic. Renaming updates card category labels.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateCategory}
              disabled={!activeTopicId}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60"
            >
              <IconPlus className="h-4 w-4" />
              Add category
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {topics.map((topic) => {
              const active = topic.id === activeTopicId
              const count = categoryCountByTopic.get(topic.id) ?? 0
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setSelectedTopicId(topic.id)
                    setCategoryForm((current) => ({ ...current, topic: topic.id }))
                    setMergeSource(null)
                    setMergeTargetId('')
                  }}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-white/10 bg-slate-900/70 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <span aria-hidden>{topic.emoji}</span>
                  {topic.name}
                  <span className="rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {selectedTopic ? (
            <p className="text-xs text-slate-500">
              Showing categories for{' '}
              <span className="text-slate-300">
                {selectedTopic.emoji} {selectedTopic.name}
              </span>
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {topicCategories.map((category) => (
              <article
                key={category.id}
                className="rounded-3xl border border-white/10 bg-slate-900/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      <span className="mr-2" aria-hidden>
                        {category.emoji}
                      </span>
                      {category.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {category.blurb || 'No blurb'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                    onClick={() => openEditCategory(category)}
                  >
                    <IconPencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/20"
                    onClick={() => openMerge(category)}
                    disabled={topicCategories.length < 2}
                    title={
                      topicCategories.length < 2
                        ? 'Need another category in this topic to merge into'
                        : 'Merge into another category'
                    }
                  >
                    Merge into…
                  </button>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-rose-500/20 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
                    disabled={busy}
                    onClick={() => {
                      setConfirmError(null)
                      setConfirm({ kind: 'category-delete', category })
                    }}
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>

          {topicCategories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
              No categories for this topic yet.
            </div>
          ) : null}
        </section>
      )}

      {/* Topic modal */}
      {topicModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-8">
          <div className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {editingTopicId ? 'Edit topic' : 'Add topic'}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  {editingTopicId ? editingTopicId : 'New topic'}
                </h2>
              </div>
              <button
                type="button"
                className="cursor-pointer rounded-full border border-white/15 px-3 py-1 text-sm text-slate-300 hover:border-white/40"
                onClick={closeTopicModal}
              >
                Close
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto px-5 py-4">
              {!editingTopicId ? (
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-400">Slug / id (create-only)</span>
                  <input
                    value={topicForm.id}
                    onChange={(event) =>
                      setTopicForm((current) => ({ ...current, id: event.target.value }))
                    }
                    placeholder="e.g. k8s"
                    className={fieldClass}
                  />
                </label>
              ) : (
                <p className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                  Slug locked: <span className="font-mono text-slate-200">{editingTopicId}</span>
                </p>
              )}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-400">Name</span>
                <input
                  value={topicForm.name}
                  onChange={(event) =>
                    setTopicForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Display name"
                  className={fieldClass}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-400">Emoji</span>
                  <input
                    value={topicForm.emoji}
                    onChange={(event) =>
                      setTopicForm((current) => ({ ...current, emoji: event.target.value }))
                    }
                    placeholder="📘"
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-slate-400">Accent</span>
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
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-400">Accent foreground (optional)</span>
                <input
                  value={topicForm.accentFg}
                  onChange={(event) =>
                    setTopicForm((current) => ({ ...current, accentFg: event.target.value }))
                  }
                  placeholder="auto contrast"
                  className={fieldClass}
                />
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3">
                <span className="text-xs text-slate-400">Preview</span>
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: previewAccent, color: previewAccentFg }}
                >
                  {topicForm.emoji || '📘'} {topicForm.name || 'Topic name'}
                </span>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-400">Tagline</span>
                <input
                  value={topicForm.tagline}
                  onChange={(event) =>
                    setTopicForm((current) => ({ ...current, tagline: event.target.value }))
                  }
                  placeholder="Short tagline"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-400">Blurb</span>
                <textarea
                  value={topicForm.blurb}
                  onChange={(event) =>
                    setTopicForm((current) => ({ ...current, blurb: event.target.value }))
                  }
                  placeholder="Longer description"
                  rows={3}
                  className={fieldClass}
                />
              </label>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="cursor-pointer rounded-full border border-white/15 px-5 py-2.5 text-sm text-white hover:border-white/40"
                onClick={closeTopicModal}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60"
                disabled={busy || !topicForm.name.trim()}
                onClick={() => void saveTopic()}
              >
                {busy ? 'Saving…' : editingTopicId ? 'Save topic' : 'Create topic'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Category modal */}
      {categoryModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-8">
          <div className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {editingCategoryId ? 'Edit category' : 'Add category'}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  {editingCategoryId ? 'Rename updates cards' : selectedTopic?.name ?? 'Category'}
                </h2>
              </div>
              <button
                type="button"
                className="cursor-pointer rounded-full border border-white/15 px-3 py-1 text-sm text-slate-300 hover:border-white/40"
                onClick={closeCategoryModal}
              >
                Close
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto px-5 py-4">
              <p className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                Topic:{' '}
                <span className="text-slate-200">
                  {selectedTopic?.emoji} {selectedTopic?.name ?? activeTopicId}
                </span>
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-400">Name</span>
                <input
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Category name"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-400">Emoji</span>
                <input
                  value={categoryForm.emoji}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, emoji: event.target.value }))
                  }
                  placeholder="⚡"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-400">Blurb</span>
                <textarea
                  value={categoryForm.blurb}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, blurb: event.target.value }))
                  }
                  placeholder="Optional description"
                  rows={3}
                  className={fieldClass}
                />
              </label>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="cursor-pointer rounded-full border border-white/15 px-5 py-2.5 text-sm text-white hover:border-white/40"
                onClick={closeCategoryModal}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60"
                disabled={busy || !categoryForm.name.trim() || !selectedTopicId}
                onClick={() => void saveCategory()}
              >
                {busy ? 'Saving…' : editingCategoryId ? 'Save category' : 'Create category'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Merge sheet */}
      {mergeSource ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-8">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/80">
              Merge category
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Merge “{mergeSource.name}” into…
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              All cards in the source category move to the target. The source category is then
              removed.
            </p>
            <label className="mt-4 block space-y-1.5">
              <span className="text-xs font-medium text-slate-400">Target category</span>
              <select
                value={mergeTargetId}
                onChange={(event) => setMergeTargetId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Choose target…</option>
                {topicCategories
                  .filter((item) => item.id !== mergeSource.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.emoji} {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="cursor-pointer rounded-full border border-white/15 px-5 py-2.5 text-sm text-white hover:border-white/40"
                onClick={() => {
                  setMergeSource(null)
                  setMergeTargetId('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-full border border-amber-400/40 bg-amber-400/15 px-5 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-400/25 disabled:opacity-60"
                disabled={!mergeTargetId || busy}
                onClick={requestMergeConfirm}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={confirm?.kind === 'topic-delete'}
        tone="danger"
        title={confirm?.kind === 'topic-delete' ? `Delete topic “${confirm.topic.name}”?` : ''}
        description={
          confirm?.kind === 'topic-delete' ? (
            <p>
              Only allowed if the topic has no cards or categories. Slug:{' '}
              <span className="font-mono text-slate-300">{confirm.topic.id}</span>
            </p>
          ) : null
        }
        confirmLabel="Delete topic"
        busy={busy}
        error={confirmError}
        onCancel={() => {
          setConfirm(null)
          setConfirmError(null)
        }}
        onConfirm={() => void runConfirmedAction()}
      />

      <ConfirmModal
        open={confirm?.kind === 'category-delete'}
        tone="danger"
        title={
          confirm?.kind === 'category-delete' ? `Delete category “${confirm.category.name}”?` : ''
        }
        description="Only allowed if no cards use this category. Prefer Merge if cards exist."
        confirmLabel="Delete category"
        busy={busy}
        error={confirmError}
        onCancel={() => {
          setConfirm(null)
          setConfirmError(null)
        }}
        onConfirm={() => void runConfirmedAction()}
      />

      <ConfirmModal
        open={confirm?.kind === 'category-merge'}
        tone="warning"
        title={
          confirm?.kind === 'category-merge'
            ? `Merge “${confirm.source.name}” → “${
                topicCategories.find((item) => item.id === confirm.targetId)?.name ?? mergeTarget?.name ?? 'target'
              }”?`
            : ''
        }
        description="All cards move to the target category and the source category is removed."
        confirmLabel="Merge now"
        busy={busy}
        error={confirmError}
        onCancel={() => {
          setConfirm(null)
          setConfirmError(null)
        }}
        onConfirm={() => void runConfirmedAction()}
      />
    </div>
  )
}
