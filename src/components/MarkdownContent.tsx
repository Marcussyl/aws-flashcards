import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MarkdownContentProps = {
  content: string
  className?: string
}

// Notes sometimes use a unicode bullet instead of markdown list syntax.
function normalizeMarkdown(content: string) {
  return content.replace(/^[ \t]*•[ \t]+/gm, '- ')
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div
      className={`markdown-body prose prose-invert max-w-none prose-headings:scroll-mt-4 prose-headings:text-white prose-p:text-slate-100 prose-li:text-slate-100 prose-strong:text-white prose-a:text-sky-300 prose-code:text-accent prose-th:text-white prose-td:text-slate-200 ${className}`.trim()}
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
        }}
      >
        {normalizeMarkdown(content)}
      </Markdown>
    </div>
  )
}
