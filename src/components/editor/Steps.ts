import { mergeAttributes, Node } from '@tiptap/core'
import {
  parseStepsMarkdown,
  serializeStepsMarkdown,
  type StepItem,
} from '@/components/blocks/StepsBlock'

const DEFAULT_STEPS: StepItem[] = [
  {
    title: 'First step',
    description: 'What happens in this step.',
  },
  {
    title: 'Second step',
    description: 'Follow-up detail.',
    examClue: 'Memorable exam discriminator.',
  },
  {
    title: 'Third step',
    description: 'Final outcome.',
  },
]

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

function readSteps(attrs: Record<string, unknown> | undefined): StepItem[] {
  try {
    const parsed = JSON.parse(String(attrs?.stepsJson || '[]')) as StepItem[]
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
  } catch {
    // fall through
  }
  return DEFAULT_STEPS
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    steps: {
      insertSteps: (attrs?: {
        title?: string
        meta?: string
        steps?: StepItem[]
      }) => ReturnType
    }
  }
}

/**
 * Numbered Steps / decision-sequence block.
 *
 * Markdown:
 * ```html
 * <div data-memori="steps" data-title="Failover Sequence" data-meta="Chronological">
 *
 * 1. **Title**
 *    Description
 *    ⚡ Exam clue: …
 *
 * </div>
 * ```
 */
export const Steps = Node.create({
  name: 'steps',

  group: 'block',

  atom: true,

  defining: true,

  addAttributes() {
    return {
      title: {
        default: 'Steps',
        parseHTML: (el) => el.getAttribute('data-title') || 'Steps',
        renderHTML: (attrs) => ({ 'data-title': String(attrs.title || 'Steps') }),
      },
      meta: {
        default: 'Chronological',
        parseHTML: (el) => el.getAttribute('data-meta') || 'Chronological',
        renderHTML: (attrs) => ({ 'data-meta': String(attrs.meta || 'Chronological') }),
      },
      stepsJson: {
        default: JSON.stringify(DEFAULT_STEPS),
        parseHTML: (el) => el.getAttribute('data-steps') || JSON.stringify(DEFAULT_STEPS),
        renderHTML: (attrs) => ({ 'data-steps': String(attrs.stepsJson || '') }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-memori="steps"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-memori': 'steps',
        class: 'memori-steps memori-steps--editor',
      }),
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const steps = readSteps(node.attrs)
      const dom = document.createElement('div')
      dom.dataset.memori = 'steps'
      dom.className = 'memori-steps memori-steps--editor'
      dom.contentEditable = 'false'

      const chrome = document.createElement('div')
      chrome.className = 'memori-steps__chrome'
      chrome.innerHTML = `<strong></strong><span></span>`
      const titleEl = chrome.querySelector('strong')!
      const metaEl = chrome.querySelector('span')!
      titleEl.textContent = String(node.attrs.title || 'Steps')
      metaEl.textContent = String(node.attrs.meta || 'Chronological')

      const list = document.createElement('ol')
      list.className = 'memori-steps__editor-list'

      const renderList = (items: StepItem[]) => {
        list.replaceChildren()
        items.forEach((step, index) => {
          const li = document.createElement('li')
          const badge = document.createElement('span')
          badge.className = 'memori-steps__badge'
          badge.textContent = String(index + 1)
          const body = document.createElement('div')
          const t = document.createElement('div')
          t.className = 'memori-steps__title'
          t.textContent = step.title
          body.append(t)
          if (step.description) {
            const d = document.createElement('div')
            d.className = 'memori-steps__desc'
            d.textContent = step.description
            body.append(d)
          }
          if (step.examClue) {
            const c = document.createElement('div')
            c.className = 'memori-steps__clue'
            c.textContent = `⚡ Exam clue: ${step.examClue}`
            body.append(c)
          }
          li.append(badge, body)
          list.append(li)
        })
      }

      renderList(steps)
      dom.append(chrome, list)

      return {
        dom,
        update: (updated) => {
          if (updated.type !== this.type) {
            return false
          }
          titleEl.textContent = String(updated.attrs.title || 'Steps')
          metaEl.textContent = String(updated.attrs.meta || 'Chronological')
          renderList(readSteps(updated.attrs))
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      insertSteps:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              title: attrs?.title?.trim() || 'Steps',
              meta: attrs?.meta?.trim() || 'Chronological',
              stepsJson: JSON.stringify(attrs?.steps || DEFAULT_STEPS),
            },
          }),
    }
  },

  markdownTokenizer: {
    name: 'steps',
    level: 'block',
    start: (src) => {
      const match = src.match(/<div\b[^>]*data-memori=["']steps["'][^>]*>/i)
      return match?.index ?? -1
    },
    tokenize(src) {
      const open =
        /^<div\b([^>]*)\bdata-memori=["']steps["']([^>]*)>([\s\S]*?)<\/div>\s*/i.exec(src)
      if (!open) {
        return undefined
      }
      const attrBlob = `${open[1]} ${open[2]}`
      const titleMatch = /data-title=["']([^"']*)["']/i.exec(attrBlob)
      const metaMatch = /data-meta=["']([^"']*)["']/i.exec(attrBlob)
      const body = open[3].trim()
      const steps = parseStepsMarkdown(body)
      return {
        type: 'steps',
        raw: open[0],
        title: titleMatch ? decodeAttr(titleMatch[1]) : 'Steps',
        meta: metaMatch ? decodeAttr(metaMatch[1]) : 'Chronological',
        stepsJson: JSON.stringify(steps.length > 0 ? steps : DEFAULT_STEPS),
      }
    },
  },

  parseMarkdown: (token, helpers) => {
    return helpers.createNode('steps', {
      title: token.title || 'Steps',
      meta: token.meta || 'Chronological',
      stepsJson: token.stepsJson || JSON.stringify(DEFAULT_STEPS),
    })
  },

  renderMarkdown: (node) => {
    const steps = readSteps(node.attrs)
    const title = escapeAttr(String(node.attrs?.title || 'Steps'))
    const meta = escapeAttr(String(node.attrs?.meta || 'Chronological'))
    const body = serializeStepsMarkdown(steps)
    return `<div data-memori="steps" data-title="${title}" data-meta="${meta}">\n\n${body}\n\n</div>`
  },
})

export const STEPS_STARTER_MARKDOWN = `<div data-memori="steps" data-title="Failover Sequence" data-meta="Chronological">

1. **Primary Instance Outage Detected**
   AWS health-checks fail on primary host hardware or AZ loss.

2. **Standby Synchronous Replica Promoted**
   Standby storage volume is already completely up to date (RPO ≈ 0).
   ⚡ Exam clue: Zero data loss because of synchronous physical write replication.

3. **Endpoint CNAME Flips to Standby**
   RDS updates DNS record. Connection takes 60–120s without code modification.

</div>`
