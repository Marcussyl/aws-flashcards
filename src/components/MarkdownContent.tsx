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
      className={`markdown-body prose prose-invert max-w-none prose-headings:scroll-mt-4 prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-accent prose-code:text-accent prose-th:text-foreground prose-td:text-muted ${className}`.trim()}
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
