export const CALLOUT_TYPES = ['note', 'tip', 'warning', 'exam'] as const
export type CalloutType = (typeof CALLOUT_TYPES)[number]

/** Canonical markdown tag written on serialize (aliases normalize into these). */
export const CALLOUT_MARKDOWN_TAG: Record<CalloutType, string> = {
  note: 'NOTE',
  tip: 'TIP',
  warning: 'WARNING',
  exam: 'EXAM',
}

/** Study / editor visible labels (Stitch sheet). */
export const CALLOUT_LABELS: Record<CalloutType, string> = {
  note: 'Note',
  tip: 'Exam tip',
  warning: 'Warning',
  exam: 'Exam trap',
}

export type CalloutVisual = {
  root: string
  iconWrap: string
  label: string
  body: string
}

/**
 * Stitch Memori callout tokens — dark slate / amber brand (not Material teal).
 * NOTE uses sky/info chip per Phase 1 brief; TIP amber; WARNING rose; EXAM amber-rose.
 */
export const CALLOUT_VISUAL: Record<CalloutType, CalloutVisual> = {
  note: {
    root: 'border-sky-500/25 bg-slate-900/60',
    iconWrap: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
    label: 'text-sky-200',
    body: 'text-slate-300',
  },
  tip: {
    root: 'border-amber-500/30 bg-amber-950/20',
    iconWrap: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
    label: 'text-amber-300',
    body: 'text-slate-300',
  },
  warning: {
    root: 'border-rose-500/30 bg-rose-950/20',
    iconWrap: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
    label: 'text-rose-300',
    body: 'text-slate-300',
  },
  exam: {
    root: 'border-amber-400/40 bg-gradient-to-r from-rose-950/25 to-amber-950/20',
    iconWrap: 'border-amber-400/40 bg-amber-500/20 text-amber-300',
    label: 'text-amber-300',
    body: 'text-slate-200',
  },
}

const ALIAS_TO_TYPE: Record<string, CalloutType> = {
  note: 'note',
  tip: 'tip',
  warning: 'warning',
  exam: 'exam',
  examtrap: 'exam',
  trap: 'exam',
}

/** Accept NOTE|TIP|WARNING|EXAM|EXAMTRAP|TRAP (case-insensitive). */
export function normalizeCalloutType(value: unknown): CalloutType {
  const raw = String(value ?? 'note')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  return ALIAS_TO_TYPE[raw] ?? 'note'
}

export const CALLOUT_HEADER_RE = 'NOTE|TIP|WARNING|EXAMTRAP|EXAM|TRAP'
