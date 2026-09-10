import { mergeAttributes, Node } from '@tiptap/core'

export const CALLOUT_TYPES = ['note', 'tip', 'warning', 'exam'] as const
export type CalloutType = (typeof CALLOUT_TYPES)[number]

const CALLOUT_LABELS: Record<CalloutType, string> = {
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
  exam: 'Exam trap',
}

function normalizeCalloutType(value: unknown): CalloutType {
  const raw = String(value ?? 'note').toLowerCase()
  return (CALLOUT_TYPES as readonly string[]).includes(raw) ? (raw as CalloutType) : 'note'
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { type?: CalloutType }) => ReturnType
      toggleCallout: (attrs?: { type?: CalloutType }) => ReturnType
      unsetCallout: () => ReturnType
    }
  }
}

/**
 * GitHub-style alert callouts.
 *
 * Markdown format (documented in PR #44):
 * ```
 * > [!NOTE]
 * > body
 * ```
 * Also supports TIP / WARNING / EXAM.
 */
export const Callout = Node.create({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'note' satisfies CalloutType,
        parseHTML: (element) => normalizeCalloutType(element.getAttribute('data-callout')),
        renderHTML: (attributes) => ({
          'data-callout': normalizeCalloutType(attributes.type),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = normalizeCalloutType(node.attrs.type)
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-callout': type,
        class: `memori-callout memori-callout--${type}`,
      }),
      [
        'div',
        {
          class: 'memori-callout__label',
          contenteditable: 'false',
        },
        CALLOUT_LABELS[type],
      ],
      ['div', { class: 'memori-callout__body' }, 0],
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const type = normalizeCalloutType(node.attrs.type)
      const dom = document.createElement('div')
      dom.dataset.callout = type
      dom.className = `memori-callout memori-callout--${type}`

      const label = document.createElement('div')
      label.className = 'memori-callout__label'
      label.contentEditable = 'false'
      label.textContent = CALLOUT_LABELS[type]

      const body = document.createElement('div')
      body.className = 'memori-callout__body'

      dom.append(label, body)

      return {
        dom,
        contentDOM: body,
        update: (updated) => {
          if (updated.type !== this.type) {
            return false
          }
          const nextType = normalizeCalloutType(updated.attrs.type)
          dom.dataset.callout = nextType
          dom.className = `memori-callout memori-callout--${nextType}`
          label.textContent = CALLOUT_LABELS[nextType]
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { type: normalizeCalloutType(attrs?.type) }),
      toggleCallout:
        (attrs) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { type: normalizeCalloutType(attrs?.type) }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    }
  },

  markdownTokenizer: {
    name: 'callout',
    level: 'block',
    start: (src) => {
      const match = src.match(/^>\s*\[!(NOTE|TIP|WARNING|EXAM)\]/im)
      return match?.index ?? -1
    },
    tokenize(src, _tokens, lexer) {
      const header = /^>\s*\[!(NOTE|TIP|WARNING|EXAM)\][^\n]*\n?/.exec(src)
      if (!header) {
        return undefined
      }

      const type = normalizeCalloutType(header[1])
      let rest = src.slice(header[0].length)
      const bodyLines: string[] = []
      let consumed = header[0]

      while (rest.length > 0) {
        const lineMatch = /^(>[^\n]*(?:\n|$))/.exec(rest)
        if (!lineMatch) {
          break
        }
        const rawLine = lineMatch[1]
        // Blank quote line (">" or "> ") ends only if followed by non-quote; keep blank lines inside.
        if (/^>\s*$/.test(rawLine.replace(/\n$/, '')) && !/^>/.test(rest.slice(rawLine.length))) {
          // trailing blank blockquote line — include then stop
          bodyLines.push('')
          consumed += rawLine
          rest = rest.slice(rawLine.length)
          break
        }
        const stripped = rawLine.replace(/^>\s?/, '').replace(/\n$/, '')
        bodyLines.push(stripped)
        consumed += rawLine
        rest = rest.slice(rawLine.length)
      }

      const body = bodyLines.join('\n').trimEnd()
      return {
        type: 'callout',
        raw: consumed,
        calloutType: type,
        text: body,
        tokens: lexer.blockTokens(body || ''),
      }
    },
  },

  parseMarkdown: (token, helpers) => {
    const content = helpers.parseChildren(token.tokens || [])
    return helpers.createNode(
      'callout',
      { type: normalizeCalloutType(token.calloutType || token.attrs?.type) },
      content.length > 0 ? content : [helpers.createNode('paragraph', {}, [])],
    )
  },

  renderMarkdown: (node, helpers) => {
    const type = normalizeCalloutType(node.attrs?.type).toUpperCase()
    const rendered = helpers.renderChildren(node.content || [], '\n\n').replace(/\n$/, '')
    const quoted =
      rendered.length === 0
        ? '>'
        : rendered
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n')
    return `> [!${type}]\n${quoted}`
  },
})

export function calloutLabel(type: CalloutType) {
  return CALLOUT_LABELS[type]
}
