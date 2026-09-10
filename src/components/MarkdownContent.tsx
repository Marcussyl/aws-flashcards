'use client'

import {
  Children,
  isValidElement,
  memo,
  useMemo,
  type ReactNode,
} from 'react'
import dynamic from 'next/dynamic'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import {
  CalloutBlock,
  ComparisonBlock,
  FormulaBlock,
  StepsBlock,
  ToggleBlock,
  extractLatexFromFormulaBody,
  normalizeCalloutType,
  parseGfmTable,
  parseStepsMarkdown,
  type CalloutType,
  type GfmTable,
  type StepItem,
} from '@/components/blocks'
import { StudyTaskCheckbox } from '@/components/StudyTaskCheckbox'
import 'katex/dist/katex.min.css'

const MermaidBlock = dynamic(
  () => import('@/components/MermaidBlock').then((mod) => mod.MermaidBlock),
  {
    ssr: false,
    loading: () => (
      <div className="md-mermaid flex min-h-16 max-w-full items-center justify-center overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 px-3 py-4 text-xs text-slate-400">
        Rendering diagram…
      </div>
    ),
  },
)

type MarkdownContentProps = {
  content: string
  className?: string
}

// Notes sometimes use a unicode bullet instead of markdown list syntax.
function normalizeMarkdown(content: string) {
  return content.replace(/^[ \t]*•[ \t]+/gm, '- ')
}

function extractText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child)
      }
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return extractText(child.props.children)
      }
      return ''
    })
    .join('')
}

function isMermaidCode(className?: string) {
  return Boolean(className && /(?:^|\s)language-mermaid(?:\s|$)/.test(className))
}

function hasMermaidFence(content: string) {
  return /```\s*mermaid\b/i.test(content)
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

function readDataAttr(attrBlob: string, name: string): string | undefined {
  const re = new RegExp(`data-${name}=["']([^"']*)["']`, 'i')
  const match = re.exec(attrBlob)
  return match ? decodeBasicEntities(match[1]) : undefined
}

type ContentSegment =
  | { kind: 'markdown'; value: string }
  | { kind: 'toggle'; title: string; body: string }
  | {
      kind: 'comparison'
      preferred?: number
      label?: string
      table: GfmTable
    }
  | {
      kind: 'steps'
      title?: string
      meta?: string
      steps: StepItem[]
    }
  | {
      kind: 'formula'
      label?: string
      meta?: string
      caption?: string
      latex: string
    }

const MEMORI_BLOCK_RE =
  /<div\b([^>]*)\bdata-memori=["'](comparison|steps|formula)["']([^>]*)>([\s\S]*?)<\/div>/gi

const TOGGLE_RE =
  /<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>/gi

/** Split HTML toggles + memori wrappers so study view can render dedicated React chrome. */
function splitRichSegments(content: string): ContentSegment[] {
  type Hit =
    | { index: number; length: number; segment: ContentSegment }
  const hits: Hit[] = []

  MEMORI_BLOCK_RE.lastIndex = 0
  let memoriMatch: RegExpExecArray | null
  while ((memoriMatch = MEMORI_BLOCK_RE.exec(content)) !== null) {
    const attrBlob = `${memoriMatch[1]} ${memoriMatch[3]}`
    const kind = memoriMatch[2].toLowerCase() as 'comparison' | 'steps' | 'formula'
    const body = memoriMatch[4].trim()

    if (kind === 'comparison') {
      const table = parseGfmTable(body)
      if (!table) {
        continue
      }
      const preferredRaw = readDataAttr(attrBlob, 'preferred')
      hits.push({
        index: memoriMatch.index,
        length: memoriMatch[0].length,
        segment: {
          kind: 'comparison',
          preferred: preferredRaw ? Number.parseInt(preferredRaw, 10) : undefined,
          label: readDataAttr(attrBlob, 'label'),
          table,
        },
      })
      continue
    }

    if (kind === 'steps') {
      const steps = parseStepsMarkdown(body)
      if (steps.length === 0) {
        continue
      }
      hits.push({
        index: memoriMatch.index,
        length: memoriMatch[0].length,
        segment: {
          kind: 'steps',
          title: readDataAttr(attrBlob, 'title'),
          meta: readDataAttr(attrBlob, 'meta'),
          steps,
        },
      })
      continue
    }

    const latex = extractLatexFromFormulaBody(body)
    if (!latex) {
      continue
    }
    hits.push({
      index: memoriMatch.index,
      length: memoriMatch[0].length,
      segment: {
        kind: 'formula',
        label: readDataAttr(attrBlob, 'label'),
        meta: readDataAttr(attrBlob, 'meta'),
        caption: readDataAttr(attrBlob, 'caption'),
        latex,
      },
    })
  }

  TOGGLE_RE.lastIndex = 0
  let toggleMatch: RegExpExecArray | null
  while ((toggleMatch = TOGGLE_RE.exec(content)) !== null) {
    hits.push({
      index: toggleMatch.index,
      length: toggleMatch[0].length,
      segment: {
        kind: 'toggle',
        title:
          decodeBasicEntities(toggleMatch[1].replace(/<[^>]+>/g, '')).trim() || 'Toggle',
        body: toggleMatch[2].replace(/^\n+/, '').replace(/\n+$/, ''),
      },
    })
  }

  hits.sort((a, b) => a.index - b.index)

  const segments: ContentSegment[] = []
  let lastIndex = 0
  for (const hit of hits) {
    if (hit.index < lastIndex) {
      continue
    }
    if (hit.index > lastIndex) {
      segments.push({ kind: 'markdown', value: content.slice(lastIndex, hit.index) })
    }
    segments.push(hit.segment)
    lastIndex = hit.index + hit.length
  }

  if (lastIndex < content.length) {
    segments.push({ kind: 'markdown', value: content.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ kind: 'markdown', value: content }]
}

function detectCallout(children: ReactNode): { type: CalloutType; body: ReactNode } | null {
  const nodes = Children.toArray(children)
  if (nodes.length === 0) {
    return null
  }

  const first = nodes[0]
  if (!isValidElement<{ children?: ReactNode }>(first)) {
    return null
  }

  const firstText = extractText(first.props.children).trim()
  const match = /^\[!(NOTE|TIP|WARNING|EXAMTRAP|EXAM|TRAP)\](?:\s+(.*))?$/i.exec(firstText)
  if (!match) {
    return null
  }

  const type = normalizeCalloutType(match[1])
  const leftover = match[2]?.trim()
  const rest = nodes.slice(1)

  let body: ReactNode = rest
  if (leftover) {
    body = (
      <>
        <p>{leftover}</p>
        {rest}
      </>
    )
  } else if (rest.length === 0) {
    body = null
  }

  return { type, body }
}

/** Detect HTML-comment marker before a GFM table: <!-- memori:comparison preferred="2" --> */
function detectComparisonComment(content: string): {
  before: string
  after: string
  preferred?: number
  label?: string
  tableMarkdown: string
} | null {
  const re =
    /<!--\s*memori:comparison\b([^>]*)-->\s*((?:\|[^\n]*\n)+)/i
  const match = re.exec(content)
  if (!match) {
    return null
  }
  const attrs = match[1] || ''
  const preferredMatch = /preferred=["']?(\d+)/i.exec(attrs)
  const labelMatch = /label=["']([^"']*)["']/i.exec(attrs)
  return {
    before: content.slice(0, match.index),
    after: content.slice(match.index + match[0].length),
    preferred: preferredMatch ? Number.parseInt(preferredMatch[1], 10) : undefined,
    label: labelMatch ? decodeBasicEntities(labelMatch[1]) : undefined,
    tableMarkdown: match[2],
  }
}

function StudyToggle({ title, body }: { title: string; body: string }) {
  return (
    <ToggleBlock title={title}>
      <MarkdownBlock content={body} />
    </ToggleBlock>
  )
}

function MarkdownBlock({ content }: { content: string }) {
  const enableMermaid = hasMermaidFence(content)
  let working = normalizeMarkdown(content)

  // Optional HTML-comment comparison marker (TipTap-safe fallback).
  const commentComparison = detectComparisonComment(working)
  if (commentComparison) {
    const table = parseGfmTable(commentComparison.tableMarkdown)
    if (table) {
      return (
        <>
          {commentComparison.before.trim() ? (
            <MarkdownBlock content={commentComparison.before} />
          ) : null}
          <ComparisonBlock
            table={table}
            preferred={commentComparison.preferred}
            label={commentComparison.label}
          />
          {commentComparison.after.trim() ? (
            <MarkdownBlock content={commentComparison.after} />
          ) : null}
        </>
      )
    }
  }

  if (!working.trim()) {
    return null
  }

  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          )
        },
        table({ children }) {
          return (
            <div className="md-table-wrap">
              <table>{children}</table>
            </div>
          )
        },
        pre({ children }) {
          const child = Children.toArray(children)[0]
          if (
            enableMermaid &&
            isValidElement<{ className?: string; children?: ReactNode }>(child) &&
            isMermaidCode(child.props.className)
          ) {
            const chart = extractText(child.props.children).replace(/\n$/, '')
            return <MermaidBlock key={chart} chart={chart} />
          }
          return <pre>{children}</pre>
        },
        code({ className, children, ...props }) {
          if (enableMermaid && isMermaidCode(className)) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          )
        },
        blockquote({ children }) {
          const callout = detectCallout(children)
          if (callout) {
            return <CalloutBlock type={callout.type}>{callout.body}</CalloutBlock>
          }
          return <blockquote>{children}</blockquote>
        },
        ul({ className, children, ...props }) {
          const isTaskList =
            typeof className === 'string' && className.includes('contains-task-list')
          return (
            <ul
              className={[
                className,
                isTaskList ? 'memori-task-list list-none space-y-2 pl-0' : null,
              ]
                .filter(Boolean)
                .join(' ')}
              {...props}
            >
              {children}
            </ul>
          )
        },
        li({ className, children, ...props }) {
          const isTaskItem =
            typeof className === 'string' && className.includes('task-list-item')
          if (!isTaskItem) {
            return (
              <li className={className} {...props}>
                {children}
              </li>
            )
          }

          const nodes = Children.toArray(children)
          const isTaskCheckbox = (node: ReactNode) =>
            isValidElement<{ type?: string }>(node) && node.props.type === 'checkbox'
          const checkboxes = nodes.filter(isTaskCheckbox)
          const contentNodes = nodes.filter((node) => !isTaskCheckbox(node))

          return (
            <li
              className={[
                className,
                'memori-task-item rounded-xl border border-white/5 bg-white/[0.02] px-2 py-2',
              ]
                .filter(Boolean)
                .join(' ')}
              {...props}
            >
              {checkboxes}
              <div>{contentNodes}</div>
            </li>
          )
        },
        input(props) {
          if (props.type === 'checkbox') {
            return (
              <StudyTaskCheckbox defaultChecked={Boolean(props.checked)} />
            )
          }
          return <input {...props} />
        },
        // Bare display math ($$) from remark-math → rehype-katex lands as span.katex-display.
        // Wrap standalone math paragraphs with Formula chrome when the whole paragraph is math.
        p({ children, ...props }) {
          const nodes = Children.toArray(children)
          if (
            nodes.length === 1 &&
            isValidElement<{ className?: string; children?: ReactNode }>(nodes[0])
          ) {
            const className = nodes[0].props.className || ''
            if (/(?:^|\s)katex(?:\s|$)/.test(className) || className.includes('katex-display')) {
              // Already rendered by rehype-katex — leave inline/display as-is inside prose.
              return <p {...props}>{children}</p>
            }
          }
          return <p {...props}>{children}</p>
        },
      }}
    >
      {working}
    </Markdown>
  )
}

function MarkdownContentInner({ content, className = '' }: MarkdownContentProps) {
  const segments = useMemo(
    () => splitRichSegments(normalizeMarkdown(content || '')),
    [content],
  )

  return (
    <div
      className={`markdown-body prose prose-invert max-w-full min-w-0 prose-headings:scroll-mt-4 prose-headings:text-white prose-p:text-slate-100 prose-li:text-slate-100 prose-strong:text-white prose-a:text-sky-300 prose-code:text-accent prose-th:text-white prose-td:text-slate-200 ${className}`.trim()}
    >
      {segments.map((segment, index) => {
        if (segment.kind === 'toggle') {
          return (
            <StudyToggle
              key={`toggle-${index}-${segment.title}`}
              title={segment.title}
              body={segment.body}
            />
          )
        }
        if (segment.kind === 'comparison') {
          return (
            <ComparisonBlock
              key={`comparison-${index}`}
              table={segment.table}
              preferred={segment.preferred}
              label={segment.label}
            />
          )
        }
        if (segment.kind === 'steps') {
          return (
            <StepsBlock
              key={`steps-${index}`}
              steps={segment.steps}
              title={segment.title}
              meta={segment.meta}
            />
          )
        }
        if (segment.kind === 'formula') {
          return (
            <FormulaBlock
              key={`formula-${index}`}
              latex={segment.latex}
              label={segment.label}
              meta={segment.meta}
              caption={segment.caption}
            />
          )
        }
        return <MarkdownBlock key={`md-${index}`} content={segment.value} />
      })}
    </div>
  )
}

export const MarkdownContent = memo(MarkdownContentInner)
