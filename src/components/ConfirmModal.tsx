'use client'

import type { ReactNode } from 'react'

type ConfirmModalProps = {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'warning' | 'default'
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

const confirmToneClass: Record<NonNullable<ConfirmModalProps['tone']>, string> = {
  danger: 'bg-rose-500 text-white hover:bg-rose-400',
  warning: 'border border-amber-400/40 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25',
  default: 'bg-accent text-accent-fg hover:opacity-90',
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
      >
        <p
          className={`text-xs font-semibold uppercase tracking-[0.18em] ${
            tone === 'danger'
              ? 'text-rose-300/80'
              : tone === 'warning'
                ? 'text-amber-300/80'
                : 'text-accent'
          }`}
        >
          Confirm
        </p>
        <h2 id="confirm-modal-title" className="mt-2 text-lg font-semibold text-white">
          {title}
        </h2>
        {description ? <div className="mt-2 text-sm leading-6 text-slate-400">{description}</div> : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="cursor-pointer rounded-full border border-white/15 px-5 py-2.5 text-sm text-white hover:border-white/40 disabled:opacity-60"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${confirmToneClass[tone]}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
