import { mergeAttributes, Node } from '@tiptap/core'
import {
  parseGfmTable,
  parsePreferredColumn,
  serializeGfmTable,
  type GfmTable,
} from '@/components/blocks/parseGfmTable'

const DEFAULT_TABLE: GfmTable = {
  headers: ['Feature', 'Option A', 'Option B'],
  rows: [
    ['Purpose', 'Describe A', 'Describe B'],
    ['Sync model', '…', '…'],
    ['Failover', '…', '…'],
  ],
}

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function decodeAttr(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function readTableFromAttrs(attrs: Record<string, unknown> | undefined): GfmTable {
  try {
    const headers = JSON.parse(String(attrs?.headersJson || '[]')) as string[]
    const rows = JSON.parse(String(attrs?.rowsJson || '[]')) as string[][]
    if (Array.isArray(headers) && headers.length >= 2 && Array.isArray(rows)) {
      return { headers, rows }
    }
  } catch {
    // fall through
  }
  return DEFAULT_TABLE
}

function tableToAttrs(table: GfmTable, preferred?: number, label?: string) {
  return {
    preferred: parsePreferredColumn(preferred ?? 2, table.headers.length),
    label: label?.trim() || 'Comparison Table',
    headersJson: JSON.stringify(table.headers),
    rowsJson: JSON.stringify(table.rows),
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comparison: {
      insertComparison: (attrs?: {
        preferred?: number
        label?: string
        table?: GfmTable
      }) => ReturnType
    }
  }
}

/**
 * Comparison matrix block.
 *
 * Markdown:
 * ```html
 * <div data-memori="comparison" data-preferred="2" data-label="Comparison Table">
 *
 * | Feature | Option A | Option B |
 * | --- | --- | --- |
 * | … | … | … |
 *
 * </div>
 * ```
 */
export const Comparison = Node.create({
  name: 'comparison',

  group: 'block',

  atom: true,

  defining: true,

  addAttributes() {
    return {
      preferred: {
        default: 2,
        parseHTML: (el) => Number.parseInt(el.getAttribute('data-preferred') || '2', 10) || 2,
        renderHTML: (attrs) => ({ 'data-preferred': String(attrs.preferred ?? 2) }),
      },
      label: {
        default: 'Comparison Table',
        parseHTML: (el) => el.getAttribute('data-label') || 'Comparison Table',
        renderHTML: (attrs) => ({ 'data-label': String(attrs.label || 'Comparison Table') }),
      },
      headersJson: {
        default: JSON.stringify(DEFAULT_TABLE.headers),
        parseHTML: (el) => el.getAttribute('data-headers') || JSON.stringify(DEFAULT_TABLE.headers),
        renderHTML: (attrs) => ({ 'data-headers': String(attrs.headersJson || '') }),
      },
      rowsJson: {
        default: JSON.stringify(DEFAULT_TABLE.rows),
        parseHTML: (el) => el.getAttribute('data-rows') || JSON.stringify(DEFAULT_TABLE.rows),
        renderHTML: (attrs) => ({ 'data-rows': String(attrs.rowsJson || '') }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-memori="comparison"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-memori': 'comparison',
        class: 'memori-comparison memori-comparison--editor',
      }),
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const table = readTableFromAttrs(node.attrs)
      const preferred = parsePreferredColumn(node.attrs.preferred, table.headers.length)
      const dom = document.createElement('div')
      dom.dataset.memori = 'comparison'
      dom.className = 'memori-comparison memori-comparison--editor'
      dom.contentEditable = 'false'

      const chrome = document.createElement('div')
      chrome.className = 'memori-comparison__chrome'
      chrome.textContent = String(node.attrs.label || 'Comparison Table')

      const pre = document.createElement('pre')
      pre.className = 'memori-comparison__preview'
      pre.textContent = serializeGfmTable(table)

      const hint = document.createElement('div')
      hint.className = 'memori-comparison__hint'
      hint.textContent = `Preferred column: ${preferred} · Edit markdown source after save / re-open as HTML wrapper`

      dom.append(chrome, pre, hint)

      return {
        dom,
        update: (updated) => {
          if (updated.type !== this.type) {
            return false
          }
          const next = readTableFromAttrs(updated.attrs)
          const nextPreferred = parsePreferredColumn(updated.attrs.preferred, next.headers.length)
          chrome.textContent = String(updated.attrs.label || 'Comparison Table')
          pre.textContent = serializeGfmTable(next)
          hint.textContent = `Preferred column: ${nextPreferred} · Edit markdown source after save / re-open as HTML wrapper`
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      insertComparison:
        (attrs) =>
        ({ commands }) => {
          const table = attrs?.table || DEFAULT_TABLE
          return commands.insertContent({
            type: this.name,
            attrs: tableToAttrs(table, attrs?.preferred, attrs?.label),
          })
        },
    }
  },

  markdownTokenizer: {
    name: 'comparison',
    level: 'block',
    start: (src) => {
      const match = src.match(/<div\b[^>]*data-memori=["']comparison["'][^>]*>/i)
      return match?.index ?? -1
    },
    tokenize(src) {
      const open =
        /^<div\b([^>]*)\bdata-memori=["']comparison["']([^>]*)>([\s\S]*?)<\/div>\s*/i.exec(src)
      if (!open) {
        return undefined
      }
      const attrBlob = `${open[1]} ${open[2]}`
      const preferredMatch = /data-preferred=["']?(\d+)/i.exec(attrBlob)
      const labelMatch = /data-label=["']([^"']*)["']/i.exec(attrBlob)
      const body = open[3].trim()
      const table = parseGfmTable(body) || DEFAULT_TABLE
      return {
        type: 'comparison',
        raw: open[0],
        preferred: preferredMatch ? Number.parseInt(preferredMatch[1], 10) : 2,
        label: labelMatch ? decodeAttr(labelMatch[1]) : 'Comparison Table',
        headersJson: JSON.stringify(table.headers),
        rowsJson: JSON.stringify(table.rows),
      }
    },
  },

  parseMarkdown: (token, helpers) => {
    return helpers.createNode('comparison', {
      preferred: token.preferred ?? 2,
      label: token.label || 'Comparison Table',
      headersJson: token.headersJson || JSON.stringify(DEFAULT_TABLE.headers),
      rowsJson: token.rowsJson || JSON.stringify(DEFAULT_TABLE.rows),
    })
  },

  renderMarkdown: (node) => {
    const table = readTableFromAttrs(node.attrs)
    const preferred = parsePreferredColumn(node.attrs?.preferred, table.headers.length)
    const label = escapeAttr(String(node.attrs?.label || 'Comparison Table'))
    const body = serializeGfmTable(table)
    return `<div data-memori="comparison" data-preferred="${preferred}" data-label="${label}">\n\n${body}\n\n</div>`
  },
})

export const COMPARISON_STARTER_MARKDOWN = `<div data-memori="comparison" data-preferred="2" data-label="Comparison Table">

| Feature | Option A | Option B |
| --- | --- | --- |
| Purpose | Describe A | Describe B |
| Sync model | … | … |
| Failover | … | … |

</div>`
