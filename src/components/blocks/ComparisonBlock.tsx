import { parsePreferredColumn, type GfmTable } from './parseGfmTable'

export type ComparisonBlockProps = {
  table: GfmTable
  /** 1-based data column index to highlight (Feature col is 0). Default: last column. */
  preferred?: number
  label?: string
  meta?: string
  className?: string
}

export function ComparisonBlock({
  table,
  preferred,
  label = 'Comparison Table',
  meta,
  className = '',
}: ComparisonBlockProps) {
  const { headers, rows } = table
  const dataColCount = Math.max(0, headers.length - 1)
  const preferredCol = parsePreferredColumn(
    preferred ?? (dataColCount > 0 ? dataColCount : 1),
    headers.length,
  )
  const featureCount = rows.length
  const metaLabel = meta?.trim() || `${featureCount} Feature Row${featureCount === 1 ? '' : 's'}`

  return (
    <div
      className={`memori-comparison my-3 space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:p-5 ${className}`.trim()}
      data-memori="comparison"
      data-preferred={preferredCol}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5 text-xs text-slate-400">
        <div className="font-mono text-[11px] uppercase tracking-wider text-amber-400/90">
          {label}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-400">
            {metaLabel}
          </span>
          <span className="hidden font-mono text-[10px] text-slate-500 sm:inline">Scroll →</span>
        </div>
      </div>

      <div className="memori-comparison__scroll -mx-1 overflow-x-auto px-1 pb-1">
        <table className="memori-comparison__table w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs">
              {headers.map((header, colIndex) => {
                const isFeature = colIndex === 0
                const isPreferred = colIndex === preferredCol
                return (
                  <th
                    key={`h-${colIndex}`}
                    className={[
                      'px-3.5 py-3 align-bottom font-semibold',
                      isFeature
                        ? 'w-1/4 font-mono text-[11px] font-medium uppercase tracking-wider text-slate-400'
                        : 'text-white',
                      isPreferred
                        ? 'rounded-t-xl border border-b-0 border-amber-400/20 bg-amber-500/[0.04]'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {isFeature ? (
                      header || 'Feature'
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden>
                          {colIndex === 1 ? '🗄️' : '⚡'}
                        </span>
                        <span>{header}</span>
                        {isPreferred ? (
                          <span className="ml-auto rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-amber-300">
                            Preferred
                          </span>
                        ) : null}
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {rows.map((row, rowIndex) => (
              <tr key={`r-${rowIndex}`} className="group transition-colors hover:bg-white/[0.02]">
                {headers.map((_, colIndex) => {
                  const cell = row[colIndex] ?? ''
                  const isFeature = colIndex === 0
                  const isPreferred = colIndex === preferredCol
                  const isLast = rowIndex === rows.length - 1
                  return (
                    <td
                      key={`c-${rowIndex}-${colIndex}`}
                      className={[
                        'px-3.5 py-3',
                        isFeature
                          ? 'font-mono text-[11px] text-slate-400'
                          : isPreferred
                            ? 'border-x border-amber-400/10 bg-amber-500/[0.02] font-medium text-slate-200'
                            : 'text-slate-300',
                        isPreferred && isLast ? 'rounded-b-xl border-b border-amber-400/20' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {cell}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
