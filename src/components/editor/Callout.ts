import { mergeAttributes, Node } from '@tiptap/core'
import {
  CALLOUT_HEADER_RE,
  CALLOUT_LABELS,
  CALLOUT_MARKDOWN_TAG,
  CALLOUT_TYPES,
  normalizeCalloutType,
  type CalloutType,
} from '@/components/blocks/calloutMeta'
import { CALLOUT_ICON_HTML } from '@/components/blocks/CalloutIcons'

export { CALLOUT_TYPES, normalizeCalloutType }
export type { CalloutType }

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { type?: CalloutType }) => ReturnType
      toggleCallout: (attrs?: { type?: CalloutType }) => ReturnType
      unsetCallout: () => ReturnType
    }
  }
}

function buildCalloutChrome(type: CalloutType, labelEl: HTMLElement, iconEl: HTMLElement) {
  labelEl.textContent = CALLOUT_LABELS[type]
  iconEl.innerHTML = CALLOUT_ICON_HTML[type]
}

/**
 * GitHub-style alert callouts.
 *
 * Markdown format (documented in PR #44, aliases extended in Phase 1):
 * ```
 * > [!NOTE]
 * > body
 * ```
 * Supports TIP / WARNING / EXAM (canonical). Parse also accepts EXAMTRAP / TRAP → exam.
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
          class: 'memori-callout__icon',
          contenteditable: 'false',
          'aria-hidden': 'true',
        },
      ],
      [
        'div',
        { class: 'memori-callout__content' },
        [
          'div',
          {
            class: 'memori-callout__label',
            contenteditable: 'false',
          },
          CALLOUT_LABELS[type],
        ],
        ['div', { class: 'memori-callout__body' }, 0],
      ],
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const type = normalizeCalloutType(node.attrs.type)
      const dom = document.createElement('div')
      dom.dataset.callout = type
      dom.className = `memori-callout memori-callout--${type}`

      const icon = document.createElement('div')
      icon.className = 'memori-callout__icon'
      icon.contentEditable = 'false'
      icon.setAttribute('aria-hidden', 'true')

      const content = document.createElement('div')
      content.className = 'memori-callout__content'

      const label = document.createElement('div')
      label.className = 'memori-callout__label'
      label.contentEditable = 'false'

      const body = document.createElement('div')
      body.className = 'memori-callout__body'

      buildCalloutChrome(type, label, icon)
      content.append(label, body)
      dom.append(icon, content)

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
          buildCalloutChrome(nextType, label, icon)
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
      const match = src.match(new RegExp(`^>\\s*\\[!(${CALLOUT_HEADER_RE})\\]`, 'im'))
      return match?.index ?? -1
    },
    tokenize(src, _tokens, lexer) {
      const header = new RegExp(`^>\\s*\\[!(${CALLOUT_HEADER_RE})\\][^\\n]*\\n?`, 'i').exec(src)
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
        if (/^>\s*$/.test(rawLine.replace(/\n$/, '')) && !/^>/.test(rest.slice(rawLine.length))) {
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
    const type = normalizeCalloutType(node.attrs?.type)
    const tag = CALLOUT_MARKDOWN_TAG[type]
    const rendered = helpers.renderChildren(node.content || [], '\n\n').replace(/\n$/, '')
    const quoted =
      rendered.length === 0
        ? '>'
        : rendered
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n')
    return `> [!${tag}]\n${quoted}`
  },
})

export function calloutLabel(type: CalloutType) {
  return CALLOUT_LABELS[type]
}
