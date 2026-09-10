import type { ReactNode } from 'react'
import {
  CALLOUT_LABELS,
  CALLOUT_VISUAL,
  type CalloutType,
} from './calloutMeta'
import { CalloutIcon } from './CalloutIcons'

export type CalloutBlockProps = {
  type: CalloutType
  children: ReactNode
  /** Optional muted subtitle next to the uppercase label (Stitch sheet). */
  subtitle?: string
  className?: string
}

export function CalloutBlock({ type, children, subtitle, className = '' }: CalloutBlockProps) {
  const visual = CALLOUT_VISUAL[type]
  const label = CALLOUT_LABELS[type]

  return (
    <aside
      className={`memori-callout memori-callout--${type} my-3 flex items-start gap-3.5 rounded-2xl border p-4 ${visual.root} ${className}`.trim()}
      data-callout={type}
    >
      <div
        className={`memori-callout__icon mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border ${visual.iconWrap}`}
        aria-hidden
      >
        <CalloutIcon type={type} />
      </div>
      <div className="memori-callout__content min-w-0 flex-1 space-y-1">
        <div className={`memori-callout__label flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${visual.label}`}>
          <span>{label}</span>
          {subtitle ? (
            <span className="text-[10px] font-mono font-normal normal-case tracking-normal text-slate-400">
              {subtitle}
            </span>
          ) : null}
        </div>
        <div
          className={`memori-callout__body text-xs leading-relaxed ${visual.body} [&_p:first-child]:mt-0 [&_p:last-child]:mb-0`}
        >
          {children}
        </div>
      </div>
    </aside>
  )
}
