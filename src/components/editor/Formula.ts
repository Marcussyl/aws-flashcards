import { mergeAttributes, Node } from '@tiptap/core'
import { extractLatexFromFormulaBody } from '@/components/blocks/FormulaBlock'

const DEFAULT_LATEX =
  String.raw`\text{Throughput (MiB/s)} = \min\left(\text{IOPS} \times \frac{\text{I/O Size (KiB)}}{1024}, \text{Cap}\right)`

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

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    formula: {
      insertFormula: (attrs?: {
        label?: string
        meta?: string
        caption?: string
        latex?: string
      }) => ReturnType
    }
  }
}

/**
 * Formula / KaTeX block.
 *
 * Markdown:
 * ```html
 * <div data-memori="formula" data-label="…" data-meta="…" data-caption="…">
 *
 * $$
 * \text{Throughput} = \ldots
 * $$
 *
 * </div>
 * ```
 *
 * Bare `$$...$$` display math is also wrapped with Formula chrome in MarkdownContent.
 */
export const Formula = Node.create({
  name: 'formula',

  group: 'block',

  atom: true,

  defining: true,

  addAttributes() {
    return {
      label: {
        default: 'Formula',
        parseHTML: (el) => el.getAttribute('data-label') || 'Formula',
        renderHTML: (attrs) => ({ 'data-label': String(attrs.label || 'Formula') }),
      },
      meta: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-meta') || '',
        renderHTML: (attrs) =>
          attrs.meta ? { 'data-meta': String(attrs.meta) } : {},
      },
      caption: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-caption') || '',
        renderHTML: (attrs) =>
          attrs.caption ? { 'data-caption': String(attrs.caption) } : {},
      },
      latex: {
        default: DEFAULT_LATEX,
        parseHTML: (el) => el.getAttribute('data-latex') || DEFAULT_LATEX,
        renderHTML: (attrs) => ({ 'data-latex': String(attrs.latex || DEFAULT_LATEX) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-memori="formula"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-memori': 'formula',
        class: 'memori-formula memori-formula--editor',
      }),
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.dataset.memori = 'formula'
      dom.className = 'memori-formula memori-formula--editor'
      dom.contentEditable = 'false'

      const chrome = document.createElement('div')
      chrome.className = 'memori-formula__chrome'
      const labelEl = document.createElement('span')
      const metaEl = document.createElement('span')
      chrome.append(labelEl, metaEl)

      const surface = document.createElement('pre')
      surface.className = 'memori-formula__editor-surface'

      const captionEl = document.createElement('div')
      captionEl.className = 'memori-formula__editor-caption'

      const sync = (attrs: typeof node.attrs) => {
        labelEl.textContent = String(attrs.label || 'Formula')
        metaEl.textContent = String(attrs.meta || '')
        surface.textContent = String(attrs.latex || DEFAULT_LATEX)
        const caption = String(attrs.caption || '')
        captionEl.textContent = caption ? `Caption: ${caption}` : ''
        captionEl.hidden = !caption
      }

      sync(node.attrs)
      dom.append(chrome, surface, captionEl)

      return {
        dom,
        update: (updated) => {
          if (updated.type !== this.type) {
            return false
          }
          sync(updated.attrs)
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      insertFormula:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              label: attrs?.label?.trim() || 'EBS IOPS Throughput Formula',
              meta: attrs?.meta?.trim() || 'gp3 / io2 Block',
              caption:
                attrs?.caption?.trim() ||
                'Throughput scales with I/O block size until hitting instance EC2 EBS-bandwidth limit.',
              latex: attrs?.latex?.trim() || DEFAULT_LATEX,
            },
          }),
    }
  },

  markdownTokenizer: {
    name: 'formula',
    level: 'block',
    start: (src) => {
      const match = src.match(/<div\b[^>]*data-memori=["']formula["'][^>]*>/i)
      return match?.index ?? -1
    },
    tokenize(src) {
      const open =
        /^<div\b([^>]*)\bdata-memori=["']formula["']([^>]*)>([\s\S]*?)<\/div>\s*/i.exec(src)
      if (!open) {
        return undefined
      }
      const attrBlob = `${open[1]} ${open[2]}`
      const labelMatch = /data-label=["']([^"']*)["']/i.exec(attrBlob)
      const metaMatch = /data-meta=["']([^"']*)["']/i.exec(attrBlob)
      const captionMatch = /data-caption=["']([^"']*)["']/i.exec(attrBlob)
      const latexAttr = /data-latex=["']([^"']*)["']/i.exec(attrBlob)
      const body = open[3].trim()
      const latex = latexAttr
        ? decodeAttr(latexAttr[1])
        : extractLatexFromFormulaBody(body) || DEFAULT_LATEX
      return {
        type: 'formula',
        raw: open[0],
        label: labelMatch ? decodeAttr(labelMatch[1]) : 'Formula',
        meta: metaMatch ? decodeAttr(metaMatch[1]) : '',
        caption: captionMatch ? decodeAttr(captionMatch[1]) : '',
        latex,
      }
    },
  },

  parseMarkdown: (token, helpers) => {
    return helpers.createNode('formula', {
      label: token.label || 'Formula',
      meta: token.meta || '',
      caption: token.caption || '',
      latex: token.latex || DEFAULT_LATEX,
    })
  },

  renderMarkdown: (node) => {
    const label = escapeAttr(String(node.attrs?.label || 'Formula'))
    const meta = String(node.attrs?.meta || '')
    const caption = String(node.attrs?.caption || '')
    const latex = String(node.attrs?.latex || DEFAULT_LATEX)
    const metaAttr = meta ? ` data-meta="${escapeAttr(meta)}"` : ''
    const captionAttr = caption ? ` data-caption="${escapeAttr(caption)}"` : ''
    return `<div data-memori="formula" data-label="${label}"${metaAttr}${captionAttr}>\n\n$$\n${latex}\n$$\n\n</div>`
  },
})

export const FORMULA_STARTER_MARKDOWN = `<div data-memori="formula" data-label="EBS IOPS Throughput Formula" data-meta="gp3 / io2 Block" data-caption="Throughput scales with I/O block size until hitting instance EC2 EBS-bandwidth limit.">

$$
\\text{Throughput (MiB/s)} = \\min\\left(\\text{IOPS} \\times \\frac{\\text{I/O Size (KiB)}}{1024}, \\text{Cap}\\right)
$$

</div>`
