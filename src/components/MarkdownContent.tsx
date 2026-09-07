'use client'

import { Children, isValidElement, type ReactNode } from 'react'
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

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div
      className={`markdown-body prose prose-invert max-w-full min-w-0 prose-headings:scroll-mt-4 prose-headings:text-white prose-p:text-slate-100 prose-li:text-slate-100 prose-strong:text-white prose-a:text-sky-300 prose-code:text-accent prose-th:text-white prose-td:text-slate-200 ${className}`.trim()}
    >
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
              isValidElement<{ className?: string; children?: ReactNode }>(child) &&
              isMermaidCode(child.props.className)
            ) {
              const chart = extractText(child.props.children).replace(/\n$/, '')
              return <MermaidBlock key={chart} chart={chart} />
            }
            return <pre>{children}</pre>
          },
          code({ className, children, ...props }) {
            if (isMermaidCode(className)) {
              // Handled by `pre` so diagrams are not double-wrapped.
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
        }}
      >
        {normalizeMarkdown(content)}
      </Markdown>
    </div>
  )
}
