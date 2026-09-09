'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { MarkdownContent } from '@/components/MarkdownContent'
import { RichTextEditor } from '@/components/RichTextEditor'
import { IconTrash } from '@/components/icons'
import type { Card } from '@/data/types'
import { useIsClient } from '@/lib/use-is-client'
import { useTaxonomy } from '@/lib/taxonomy'

type ViewMode = 'split' | 'editor' | 'preview'

type CardEditModalProps = {
  card: Card
  open: boolean
  onClose: () => void
  onSaved: (card: Card) => void
  onDeleted?: (id: string) => void
}

type Draft = {
  question: string
  summary: string
  answer: string
  category: string
}

export function CardEditModal({ card, open, onClose, onSaved, onDeleted }: CardEditModalProps) {
  const isClient = useIsClient()
  const reduce = useReducedMotion()
  const { getCategoriesForTopic, getTopic } = useTaxonomy()
  const categories = getCategoriesForTopic(card.topic)
  const topicMeta = getTopic(card.topic)
  const [draft, setDraft] = useState<Draft>({
    question: card.question,
    summary: card.summary,
    answer: card.answer,
    category: card.category,
  })
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setDraft({
      question: card.question,
      summary: card.summary,
      answer: card.answer,
      category: card.category,
    })
    setViewMode('split')
    setError(null)
    setConfirmDelete(false)
  }, [open, card])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/cards/${encodeURIComponent(card.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: draft.question,
          summary: draft.summary,
          answer: draft.answer,
          category: draft.category,
        }),
      })
      const payload = (await response.json()) as Card & { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to save card')
      }
      onSaved(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card')
    } finally {
      setSaving(false)
    }
  }, [card.id, draft, onClose, onSaved])

  useEffect(() => {
    if (!open) {
      return
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (confirmDelete) {
          setConfirmDelete(false)
        } else {
          onClose()
        }
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        if (!saving && !deleting && !confirmDelete) {
          void save()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, confirmDelete, saving, deleting, save])

  async function remove() {
    setDeleting(true)
    setError(null)
    try {
      const response = await fetch(`/api/cards/${encodeURIComponent(card.id)}`, {
        method: 'DELETE',
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete card')
      }
      onDeleted?.(card.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (!isClient) {
    return null
  }

  const categoryOptions = categories.some((item) => item.name === draft.category)
    ? categories
    : [{ id: '_current', topic: card.topic, name: draft.category, emoji: '⚡', blurb: '' }, ...categories]

  const topicLabel = topicMeta ? `${topicMeta.emoji} ${topicMeta.name}` : card.topic
  const categoryEmoji =
    categoryOptions.find((item) => item.name === draft.category)?.emoji ?? '⚡'

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="card-edit-modal"
          className="fixed inset-0 z-[60] flex items-end bg-black/70 p-3 sm:items-center sm:p-6"
          data-card-edit="true"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-[94vh] w-full max-w-5xl flex-col rounded-3xl border border-white/10 bg-slate-900 shadow-2xl sm:mx-auto sm:max-h-[92vh]"
            initial={reduce ? false : { y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">
                    Edit Card
                  </h2>
                  <span className="rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-0.5 font-mono text-[11px] text-slate-300">
                    {card.id}
                  </span>
                  <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                    {categoryEmoji} {draft.category}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-400">
                    {topicLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Summary = brief takeaway · Answer = full note
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ViewModeToggle value={viewMode} onChange={setViewMode} />
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
                  onClick={onClose}
                  aria-label="Close editor"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              <label className="block space-y-2">
                <FieldLabel label="Category" />
                <select
                  value={draft.category}
                  onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:ring-2"
                >
                  {categoryOptions.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.emoji} {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <ModeField
                label="Question"
                value={draft.question}
                onChange={(question) => setDraft((current) => ({ ...current, question }))}
                viewMode={viewMode}
                placeholder="e.g. When should you use S3 Intelligent-Tiering?"
                minHeightClassName="min-h-[5.5rem]"
                splitRaw={false}
              />
              <ModeField
                label="Summary"
                value={draft.summary}
                onChange={(summary) => setDraft((current) => ({ ...current, summary }))}
                viewMode={viewMode}
                placeholder="1–3 sentences capturing the essential takeaway"
                minHeightClassName="min-h-[7rem]"
                splitRaw={false}
              />
              <ModeField
                label="Answer"
                value={draft.answer}
                onChange={(answer) => setDraft((current) => ({ ...current, answer }))}
                viewMode={viewMode}
                placeholder="Full explanation with lists, headings, and links as needed"
                minHeightClassName="min-h-[16rem]"
                splitRaw
              />

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              {confirmDelete ? (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                  <p className="font-medium">Delete card {card.id}?</p>
                  <p className="mt-1 text-rose-200/80">
                    This removes the card from MongoDB. Progress for this id will become orphaned until reused.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-60"
                      disabled={deleting}
                      onClick={() => void remove()}
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/15 px-4 py-2 text-xs text-white hover:border-white/40"
                      disabled={deleting}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Keep card
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-400/30 px-4 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting || confirmDelete}
              >
                <IconTrash className="h-4 w-4" />
                Delete
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <p className="hidden text-[11px] text-slate-500 sm:mr-1 sm:block">
                  Ctrl/⌘+Enter to save · Esc to close
                </p>
                <button
                  type="button"
                  className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white hover:border-white/40"
                  onClick={onClose}
                  disabled={saving || deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60"
                  onClick={() => void save()}
                  disabled={saving || deleting}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  const options: { id: ViewMode; label: string }[] = [
    { id: 'split', label: 'Split' },
    { id: 'editor', label: 'Editor' },
    { id: 'preview', label: 'Preview' },
  ]
  return (
    <div
      className="inline-flex rounded-xl border border-white/10 bg-slate-950/80 p-0.5"
      role="tablist"
      aria-label="Editor view mode"
    >
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold tracking-wide transition sm:px-3 ${
              active
                ? 'bg-accent/20 text-accent'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function FieldLabel({ label }: { label: string }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
  )
}

function ModeField({
  label,
  value,
  onChange,
  viewMode,
  placeholder,
  minHeightClassName,
  splitRaw,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  viewMode: ViewMode
  placeholder: string
  minHeightClassName: string
  /** Split mode: raw markdown textarea + live preview (Answer / Question). */
  splitRaw: boolean
}) {
  if (viewMode === 'preview') {
    return (
      <div className="space-y-2">
        <FieldLabel label={label} />
        <div className={`rounded-xl border border-white/10 bg-slate-950/60 p-3 ${minHeightClassName}`}>
          <MarkdownContent className="prose-sm" content={value || '_Empty_'} />
        </div>
      </div>
    )
  }

  if (viewMode === 'editor' || !splitRaw) {
    return (
      <div className="space-y-2">
        <FieldLabel label={label} />
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeightClassName={minHeightClassName}
          ariaLabel={label}
        />
      </div>
    )
  }

  // Split + raw: side-by-side on lg, stacked on mobile
  return (
    <div className="space-y-2">
      <FieldLabel label={label} />
      <div className="grid gap-3 lg:grid-cols-2">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          aria-label={`${label} markdown`}
          className={`w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-slate-100 outline-none ring-accent/40 placeholder:text-slate-600 focus:ring-2 ${minHeightClassName}`}
        />
        <div
          className={`overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 p-3 ${minHeightClassName}`}
        >
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Preview
          </p>
          <MarkdownContent className="prose-sm" content={value || '_Empty_'} />
        </div>
      </div>
    </div>
  )
}
