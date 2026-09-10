'use client'

import { useState, type ReactNode } from 'react'

export type ToggleBlockProps = {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export function ToggleBlock({
  title,
  children,
  defaultOpen = false,
  className = '',
}: ToggleBlockProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <details
      className={`memori-toggle my-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 ${className}`.trim()}
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className="memori-toggle__summary flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-100 marker:content-none [&::-webkit-details-marker]:hidden">
        <span
          className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-white/10 bg-slate-800/80 text-[10px] text-amber-400 transition-transform"
          aria-hidden
        >
          {open ? '▾' : '▸'}
        </span>
        <span className="min-w-0 flex-1">{title}</span>
      </summary>
      <div className="memori-toggle__body border-t border-white/5 px-4 py-3 text-slate-300">
        {children}
      </div>
    </details>
  )
}
