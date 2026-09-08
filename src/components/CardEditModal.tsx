'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { MarkdownContent } from '@/components/MarkdownContent'
import { RichTextEditor } from '@/components/RichTextEditor'
import { IconTrash } from '@/components/icons'
import type { Card } from '@/data/types'
import { useIsClient } from '@/lib/use-is-client'
import { useTaxonomy } from '@/lib/taxonomy'

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
  const { getCategoriesForTopic } = useTaxonomy()
  const categories = getCategoriesForTopic(card.topic)
  const [draft, setDraft] = useState<Draft>({
    question: card.question,
    summary: card.summary,
    answer: card.answer,
    category: card.category,
  })
  const [preview, setPreview] = useState(false)
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
    setPreview(false)
    setError(null)
    setConfirmDelete(false)
  }, [open, card])

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
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, confirmDelete])

  async function save() {
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
  }

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

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="card-edit-modal"
          className="fixed inset-0 z-[60] flex items-end bg-black/70 p-3 sm:items-center sm:p-8"
          data-card-edit="true"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-3xl border border-white/10 bg-slate-900 shadow-2xl sm:mx-auto sm:max-h-[90vh]"
            initial={reduce ? false : { y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">
                  Edit card
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {card.id} · summary = brief takeaway · answer = full note
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                  onClick={() => setPreview((value) => !value)}
                >
                  {preview ? 'Edit' : 'Preview'}
                </button>
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
                <FieldLabel label="Category" help="Topic / grouping for this card" />
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
              <RichField
                label="Question"
                help="What this card asks — the prompt shown on the front"
                value={draft.question}
                onChange={(question) => setDraft((current) => ({ ...current, question }))}
                preview={preview}
                placeholder="e.g. When should you use S3 Intelligent-Tiering?"
                minHeightClassName="min-h-[5.5rem]"
              />
              <RichField
                label="Summary"
                help="Brief takeaway — a short condensed summary of the key point, not a truncated copy of the answer"
                value={draft.summary}
                onChange={(summary) => setDraft((current) => ({ ...current, summary }))}
                preview={preview}
                placeholder="1–3 sentences capturing the essential takeaway"
                minHeightClassName="min-h-[7rem]"
              />
              <RichField
                label="Answer"
                help="Full note — the complete explanation, details, and examples"
                value={draft.answer}
                onChange={(answer) => setDraft((current) => ({ ...current, answer }))}
                preview={preview}
                placeholder="Full explanation with lists, headings, and links as needed"
                minHeightClassName="min-h-[14rem]"
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
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
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
                  {saving ? 'Saving…' : 'Save changes'}
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

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <p className="text-xs leading-relaxed text-slate-500">{help}</p>
    </div>
  )
}

function RichField({
  label,
  help,
  value,
  onChange,
  preview,
  placeholder,
  minHeightClassName,
}: {
  label: string
  help: string
  value: string
  onChange: (value: string) => void
  preview: boolean
  placeholder: string
  minHeightClassName: string
}) {
  return (
    <div className="space-y-2">
      <FieldLabel label={label} help={help} />
      {preview ? (
        <div className={`rounded-xl border border-white/10 bg-slate-950/60 p-3 ${minHeightClassName}`}>
          <MarkdownContent className="prose-sm" content={value || '_Empty_'} />
        </div>
      ) : (
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeightClassName={minHeightClassName}
          ariaLabel={label}
        />
      )}
    </div>
  )
}
