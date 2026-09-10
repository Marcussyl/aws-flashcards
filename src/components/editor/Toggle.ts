import { mergeAttributes, Node } from '@tiptap/core'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleBlock: {
      insertToggle: (attrs?: { title?: string }) => ReturnType
      setToggle: (attrs?: { title?: string }) => ReturnType
    }
  }
}

/**
 * Collapsible toggle using HTML <details>/<summary> semantics.
 *
 * Markdown serialization (documented in PR #44):
 * ```html
 * <details>
 * <summary>Title</summary>
 *
 * body
 *
 * </details>
 * ```
 */
export const Toggle = Node.create({
  name: 'toggle',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      title: {
        default: 'Toggle',
        parseHTML: (element) => {
          const summary = element.querySelector(':scope > summary')
          const fromSummary = summary?.textContent?.trim()
          return fromSummary || element.getAttribute('data-title') || 'Toggle'
        },
        renderHTML: (attributes) => ({
          'data-title': attributes.title || 'Toggle',
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'details[data-toggle]',
        contentElement: (element): HTMLElement => {
          const existing = element.querySelector(':scope > .memori-toggle__body')
          if (existing instanceof HTMLElement) {
            return existing
          }
          const body = document.createElement('div')
          body.className = 'memori-toggle__body'
          Array.from(element.childNodes).forEach((child) => {
            if (child.nodeName.toLowerCase() === 'summary') {
              return
            }
            body.append(child)
          })
          element.append(body)
          return body
        },
      },
      {
        tag: 'details',
        contentElement: (element): HTMLElement => {
          const body = document.createElement('div')
          Array.from(element.childNodes).forEach((child) => {
            if (child.nodeName.toLowerCase() === 'summary') {
              return
            }
            body.append(child)
          })
          element.append(body)
          return body
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const title = String(node.attrs.title || 'Toggle')
    return [
      'details',
      mergeAttributes(HTMLAttributes, {
        'data-toggle': '',
        'data-title': title,
        open: 'true',
        class: 'memori-toggle',
      }),
      [
        'summary',
        { class: 'memori-toggle__summary' },
        ['span', { class: 'memori-toggle__chevron', 'aria-hidden': 'true' }, '▾'],
        ['span', { class: 'memori-toggle__title' }, title],
      ],
      ['div', { class: 'memori-toggle__body' }, 0],
    ]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const details = document.createElement('details')
      details.dataset.toggle = ''
      details.className = 'memori-toggle'
      details.open = true

      const summary = document.createElement('summary')
      summary.className = 'memori-toggle__summary'
      const chevron = document.createElement('span')
      chevron.className = 'memori-toggle__chevron'
      chevron.setAttribute('aria-hidden', 'true')
      chevron.textContent = '▾'
      const titleSpan = document.createElement('span')
      titleSpan.className = 'memori-toggle__title'
      titleSpan.contentEditable = editor.isEditable ? 'true' : 'false'
      titleSpan.textContent = String(node.attrs.title || 'Toggle')
      summary.append(chevron, titleSpan)

      titleSpan.addEventListener('mousedown', (event) => {
        if (editor.isEditable) {
          event.preventDefault()
          titleSpan.focus()
        }
      })

      const syncTitle = () => {
        const nextTitle = titleSpan.textContent?.replace(/\u00a0/g, ' ').trim() || 'Toggle'
        if (typeof getPos !== 'function') {
          return
        }
        const pos = getPos()
        if (typeof pos !== 'number') {
          return
        }
        const current = editor.state.doc.nodeAt(pos)
        if (!current || current.attrs.title === nextTitle) {
          return
        }
        editor
          .chain()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, {
              ...current.attrs,
              title: nextTitle,
            })
            return true
          })
          .run()
      }

      titleSpan.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          titleSpan.blur()
          editor.commands.focus()
        }
      })
      titleSpan.addEventListener('blur', syncTitle)
      titleSpan.addEventListener('input', () => {
        details.dataset.title = titleSpan.textContent?.trim() || 'Toggle'
      })

      const body = document.createElement('div')
      body.className = 'memori-toggle__body'

      details.append(summary, body)
      details.dataset.title = String(node.attrs.title || 'Toggle')

      return {
        dom: details,
        contentDOM: body,
        ignoreMutation: (mutation) => titleSpan.contains(mutation.target as globalThis.Node),
        update: (updated) => {
          if (updated.type !== this.type) {
            return false
          }
          const nextTitle = String(updated.attrs.title || 'Toggle')
          details.dataset.title = nextTitle
          if (document.activeElement !== titleSpan && titleSpan.textContent !== nextTitle) {
            titleSpan.textContent = nextTitle
          }
          titleSpan.contentEditable = editor.isEditable ? 'true' : 'false'
          return true
        },
        destroy: () => {
          titleSpan.removeEventListener('blur', syncTitle)
        },
      }
    }
  },

  addCommands() {
    return {
      insertToggle:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { title: attrs?.title?.trim() || 'Toggle' },
            content: [{ type: 'paragraph' }],
          }),
      setToggle:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { title: attrs?.title?.trim() || 'Toggle' }),
    }
  },

  markdownTokenizer: {
    name: 'toggle',
    level: 'block',
    start: (src) => {
      const match = src.match(/<details\b/i)
      return match?.index ?? -1
    },
    tokenize(src, _tokens, lexer) {
      const match =
        /^<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>\s*/i.exec(
          src,
        )
      if (!match) {
        return undefined
      }

      const title = decodeBasicEntities(match[1].replace(/<[^>]+>/g, '')).trim() || 'Toggle'
      const body = match[2].replace(/^\n+/, '').replace(/\n+$/, '')

      return {
        type: 'toggle',
        raw: match[0],
        title,
        text: body,
        tokens: lexer.blockTokens(body || ''),
      }
    },
  },

  parseMarkdown: (token, helpers) => {
    const content = helpers.parseChildren(token.tokens || [])
    return helpers.createNode(
      'toggle',
      { title: String(token.title || 'Toggle') },
      content.length > 0 ? content : [helpers.createNode('paragraph', {}, [])],
    )
  },

  renderMarkdown: (node, helpers) => {
    const title = escapeHtml(String(node.attrs?.title || 'Toggle'))
    const body = helpers.renderChildren(node.content || [], '\n\n').replace(/\n$/, '')
    return `<details>\n<summary>${title}</summary>\n\n${body}\n\n</details>`
  },
})
