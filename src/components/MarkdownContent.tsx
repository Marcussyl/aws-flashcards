'use client'

import {
  Children,
  isValidElement,
  memo,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import dynamic from 'next/dynamic'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

type CalloutKind = 'note' | 'tip' | 'warning' | 'exam'

const CALLOUT_META: Record<
  CalloutKind,
  { label: string; className: string; labelClassName: string }
> = {
  note: {
    label: 'Note',
    className: 'border-slate-500/40 bg-slate-900/70',
    labelClassName: 'text-slate-300',
  },
  tip: {
    label: 'Tip',
    className: 'border-amber-400/40 bg-amber-500/10',
    labelClassName: 'text-amber-300',
  },
  warning: {
    label: 'Warning',
    className: 'border-rose-400/40 bg-rose-500/10',
    labelClassName: 'text-rose-300',
  },
  exam: {
    label: 'Exam trap',
    className: 'border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-rose-500/10',
    labelClassName: 'text-amber-200',
  },
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

type ContentSegment =
  | { kind: 'markdown'; value: string }
  | { kind: 'toggle'; title: string; body: string }

/** Split HTML <details>/<summary> toggles out so study view can render them as React. */
function splitToggleSegments(content: string): ContentSegment[] {
  const pattern =
    /<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>/gi
  const segments: ContentSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'markdown', value: content.slice(lastIndex, match.index) })
    }
    segments.push({
      kind: 'toggle',
      title: decodeBasicEntities(match[1].replace(/<[^>]+>/g, '')).trim() || 'Toggle',
      body: match[2].replace(/^\n+/, '').replace(/\n+$/, ''),
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push({ kind: 'markdown', value: content.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ kind: 'markdown', value: content }]
}

function detectCallout(children: ReactNode): { type: CalloutKind; body: ReactNode } | null {
  const nodes = Children.toArray(children)
  if (nodes.length === 0) {
    return null
  }

  const first = nodes[0]
  if (!isValidElement<{ children?: ReactNode }>(first)) {
    return null
  }

  const firstText = extractText(first.props.children).trim()
  const match = /^\[!(NOTE|TIP|WARNING|EXAM)\](?:\s+(.*))?$/i.exec(firstText)
  if (!match) {
    return null
  }

  const type = match[1].toLowerCase() as CalloutKind
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

function StudyToggle({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false)

  return (
    <details
      className="memori-toggle my-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/70"
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className="memori-toggle__summary cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-slate-100 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="mr-2 inline-block text-accent transition-transform" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
        {title}
      </summary>
      <div className="memori-toggle__body border-t border-white/10 px-3 py-2.5">
        <MarkdownBlock content={body} />
      </div>
    </details>
  )
}

function CalloutBlock({ type, children }: { type: CalloutKind; children: ReactNode }) {
  const meta = CALLOUT_META[type]
  return (
    <aside
      className={`memori-callout memori-callout--${type} my-3 rounded-xl border-l-4 px-3 py-2.5 ${meta.className}`}
      data-callout={type}
    >
      <div className={`mb-1 text-[11px] font-bold uppercase tracking-wide ${meta.labelClassName}`}>
        {meta.label}
      </div>
      <div className="memori-callout__body text-slate-100 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
        {children}
      </div>
    </aside>
  )
}

function MarkdownBlock({ content }: { content: string }) {
  const enableMermaid = hasMermaidFence(content)
  const normalized = normalizeMarkdown(content)

  if (!normalized.trim()) {
    return null
  }

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
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
              className={[className, isTaskList ? 'memori-task-list list-none pl-0' : null]
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
          return (
            <li
              className={[className, isTaskItem ? 'memori-task-item' : null]
                .filter(Boolean)
                .join(' ')}
              {...props}
            >
              {children}
            </li>
          )
        },
        input(props) {
          if (props.type === 'checkbox') {
            return (
              <input
                {...props}
                className="memori-task-checkbox mr-2 align-middle accent-amber-400"
                disabled
                readOnly
              />
            )
          }
          return <input {...props} />
        },
      }}
    >
      {normalized}
    </Markdown>
  )
}

function MarkdownContentInner({ content, className = '' }: MarkdownContentProps) {
  const segments = useMemo(
    () => splitToggleSegments(normalizeMarkdown(content || '')),
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
        return <MarkdownBlock key={`md-${index}`} content={segment.value} />
      })}
    </div>
  )
}

export const MarkdownContent = memo(MarkdownContentInner)
