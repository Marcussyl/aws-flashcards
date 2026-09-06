'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { MarkdownContent } from '@/components/MarkdownContent'
import { useIsClient } from '@/lib/use-is-client'
import type { Card } from '@/data/types'

type CardEditModalProps = {
  card: Card
  open: boolean
  onClose: () => void
  onSaved: (card: Card) => void
}

type Draft = {
  question: string
  summary: string
  answer: string
  category: string
}

export function CardEditModal({ card, open, onClose, onSaved }: CardEditModalProps) {
  const isClient = useIsClient()
  const reduce = useReducedMotion()
  const [draft, setDraft] = useState<Draft>({
    question: card.question,
    summary: card.summary,
    answer: card.answer,
    category: card.category,
  })
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
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
  }, [open, card])

  useEffect(() => {
    if (!open) {
      return
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

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

  if (!isClient) {
    return null
  }

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
                  {card.id} · markdown supported in summary & answer
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
              <Field
                label="Category"
                value={draft.category}
                onChange={(category) => setDraft((current) => ({ ...current, category }))}
                preview={false}
              />
              <Field
                label="Question"
                value={draft.question}
                onChange={(question) => setDraft((current) => ({ ...current, question }))}
                rows={3}
                preview={preview}
              />
              <Field
                label="Summary"
                value={draft.summary}
                onChange={(summary) => setDraft((current) => ({ ...current, summary }))}
                rows={6}
                preview={preview}
                markdown
              />
              <Field
                label="Answer"
                value={draft.answer}
                onChange={(answer) => setDraft((current) => ({ ...current, answer }))}
                rows={12}
                preview={preview}
                markdown
              />
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white hover:border-white/40"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60"
                onClick={() => void save()}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

function Field({
  label,
  value,
  onChange,
  rows = 1,
  preview,
  markdown = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  preview: boolean
  markdown?: boolean
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
        {markdown ? <span className="ml-2 normal-case tracking-normal text-slate-500">markdown</span> : null}
      </span>
      {preview && markdown ? (
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
          <MarkdownContent className="prose-sm" content={value || '_Empty_'} />
        </div>
      ) : preview ? (
        <p className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white whitespace-pre-wrap">
          {value || '—'}
        </p>
      ) : rows === 1 ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:ring-2"
        />
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          spellCheck={false}
          className="w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 font-mono text-sm leading-6 text-white outline-none ring-accent/40 focus:ring-2"
        />
      )}
    </label>
  )
}
