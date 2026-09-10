export type StepItem = {
  title: string
  description?: string
  examClue?: string
}

export type StepsBlockProps = {
  steps: StepItem[]
  title?: string
  meta?: string
  className?: string
}

export function StepsBlock({
  steps,
  title = 'Steps',
  meta = 'Chronological',
  className = '',
}: StepsBlockProps) {
  return (
    <div
      className={`memori-steps my-3 space-y-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:p-5 ${className}`.trim()}
      data-memori="steps"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5 text-xs">
        <span className="font-semibold text-slate-200">{title}</span>
        <span className="font-mono text-[10px] text-slate-400">{meta}</span>
      </div>

      <ol className="memori-steps__list m-0 list-none space-y-3.5 p-0">
        {steps.map((step, index) => (
          <li key={`step-${index}`} className="memori-steps__item flex items-start gap-3">
            <div
              className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-slate-800 font-mono text-[10px] font-bold text-amber-400"
              aria-hidden
            >
              {index + 1}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="text-xs font-semibold text-slate-200">{step.title}</div>
              {step.description ? (
                <div className="text-[11px] leading-snug text-slate-400">{step.description}</div>
              ) : null}
              {step.examClue ? (
                <div className="mt-1 inline-block rounded border border-amber-400/10 bg-amber-400/5 px-2 py-0.5 font-mono text-[10px] text-amber-300/80">
                  ⚡ Exam clue: {step.examClue}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

const EXAM_CLUE_RE = /^⚡\s*Exam clue:\s*(.+)$/i

/** Parse markdown ordered-list body into StepItems. */
export function parseStepsMarkdown(body: string): StepItem[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const steps: StepItem[] = []
  let current: StepItem | null = null

  const flush = () => {
    if (current) {
      steps.push(current)
      current = null
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    const start = /^(\d+)[.)]\s+(.*)$/.exec(trimmed)
    if (start) {
      flush()
      const rest = start[2].trim()
      const boldTitle = /^\*\*(.+?)\*\*(?:\s*(?:—|–|-|:)\s*(.*))?$/.exec(rest)
      if (boldTitle) {
        current = {
          title: boldTitle[1].trim(),
          description: boldTitle[2]?.trim() || undefined,
        }
      } else {
        current = { title: rest }
      }
      continue
    }

    if (!current) {
      continue
    }

    const clue = EXAM_CLUE_RE.exec(trimmed)
    if (clue) {
      current.examClue = clue[1].trim()
      continue
    }

    if (current.description) {
      current.description = `${current.description} ${trimmed}`.trim()
    } else {
      current.description = trimmed
    }
  }

  flush()
  return steps
}

export function serializeStepsMarkdown(steps: StepItem[]): string {
  return steps
    .map((step, index) => {
      const lines = [`${index + 1}. **${step.title}**`]
      if (step.description) {
        lines.push(`   ${step.description}`)
      }
      if (step.examClue) {
        lines.push(`   ⚡ Exam clue: ${step.examClue}`)
      }
      return lines.join('\n')
    })
    .join('\n\n')
}
