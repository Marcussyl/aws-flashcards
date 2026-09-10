'use client'

import { useMemo } from 'react'
import katex from 'katex'

export type FormulaBlockProps = {
  latex: string
  label?: string
  meta?: string
  caption?: string
  className?: string
}

function stripDollarDelimiters(source: string): string {
  const trimmed = source.trim()
  if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
    return trimmed.slice(2, -2).trim()
  }
  if (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length > 2) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function FormulaBlock({
  latex,
  label = 'Formula',
  meta,
  caption,
  className = '',
}: FormulaBlockProps) {
  const expression = stripDollarDelimiters(latex)

  const html = useMemo(() => {
    try {
      return katex.renderToString(expression, {
        throwOnError: false,
        displayMode: true,
        strict: 'ignore',
      })
    } catch {
      return ''
    }
  }, [expression])

  return (
    <div
      className={`memori-formula my-3 space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:p-5 ${className}`.trim()}
      data-memori="formula"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 text-xs text-slate-400">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        {meta ? <span className="font-mono text-[10px] text-slate-500">{meta}</span> : null}
      </div>

      <div className="memori-formula__surface rounded-xl border border-white/10 bg-slate-950/80 px-4 py-4 text-center shadow-inner md:px-6">
        {html ? (
          <div
            className="memori-formula__katex overflow-x-auto text-amber-300 [&_.katex]:text-amber-300 [&_.katex-display]:m-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="m-0 overflow-x-auto whitespace-pre-wrap font-mono text-sm font-medium tracking-wide text-amber-300 md:text-base">
            {expression}
          </pre>
        )}
      </div>

      {caption ? (
        <p className="text-center font-mono text-[11px] text-slate-400">Caption: {caption}</p>
      ) : null}
    </div>
  )
}

export function extractLatexFromFormulaBody(body: string): string {
  const trimmed = body.trim()
  const display = /\$\$([\s\S]+?)\$\$/.exec(trimmed)
  if (display) {
    return display[1].trim()
  }
  const inline = /\$([^$\n]+?)\$/.exec(trimmed)
  if (inline) {
    return inline[1].trim()
  }
  return trimmed
}
