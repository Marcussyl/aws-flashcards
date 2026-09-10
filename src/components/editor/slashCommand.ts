'use client'

import { Extension, type Editor, type Range } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionOptions,
  type SuggestionProps,
} from '@tiptap/suggestion'
import {
  SlashCommandList,
  type SlashCommandItem,
  type SlashCommandListRef,
} from './SlashCommandList'
import type { CalloutType } from './Callout'

export const slashCommandPluginKey = new PluginKey('slashCommand')

function applyBlockCommand(
  editor: Editor,
  range: Range,
  run: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>,
) {
  const chain = editor.chain().focus().deleteRange(range)
  run(chain).run()
}

function insertCallout(editor: Editor, range: Range, type: CalloutType) {
  applyBlockCommand(editor, range, (chain) =>
    chain.insertContent({
      type: 'callout',
      attrs: { type },
      content: [{ type: 'paragraph' }],
    }),
  )
}

export function getSlashCommandItems(query: string): SlashCommandItem[] {
  const items: SlashCommandItem[] = [
    {
      title: 'Text',
      description: 'Plain paragraph',
      keywords: ['paragraph', 'text', 'plain', 'body'],
      icon: '¶',
      command: ({ editor, range }) => {
        applyBlockCommand(editor, range, (chain) => chain.setParagraph())
      },
    },
    {
      title: 'Heading 2',
      description: 'Section heading',
      keywords: ['heading', 'h2', 'title', 'header'],
      icon: 'H2',
      command: ({ editor, range }) => {
        applyBlockCommand(editor, range, (chain) => chain.setHeading({ level: 2 }))
      },
    },
    {
      title: 'Heading 3',
      description: 'Subsection heading',
      keywords: ['heading', 'h3', 'subtitle', 'header'],
      icon: 'H3',
      command: ({ editor, range }) => {
        applyBlockCommand(editor, range, (chain) => chain.setHeading({ level: 3 }))
      },
    },
    {
      title: 'Bullet list',
      description: 'Unordered list',
      keywords: ['bullet', 'ul', 'unordered', 'list'],
      icon: '•',
      command: ({ editor, range }) => {
        applyBlockCommand(editor, range, (chain) => chain.toggleBulletList())
      },
    },
    {
      title: 'Numbered list',
      description: 'Ordered list',
      keywords: ['numbered', 'ol', 'ordered', 'list', '1.'],
      icon: '1.',
      command: ({ editor, range }) => {
        applyBlockCommand(editor, range, (chain) => chain.toggleOrderedList())
      },
    },
    {
      title: 'Checklist',
      description: 'Task list with checkboxes',
      keywords: ['checklist', 'todo', 'task', 'checkbox', 'tasklist'],
      icon: '☑',
      command: ({ editor, range }) => {
        applyBlockCommand(editor, range, (chain) => chain.toggleTaskList())
      },
    },
    {
      title: 'Quote',
      description: 'Blockquote',
      keywords: ['quote', 'blockquote', 'citation'],
      icon: '❝',
      command: ({ editor, range }) => {
        applyBlockCommand(editor, range, (chain) => chain.toggleBlockquote())
      },
    },
    {
      title: 'Callout / Note',
      description: 'Sky info callout',
      keywords: ['callout', 'note', 'info', 'admonition', 'alert'],
      icon: 'ℹ',
      command: ({ editor, range }) => {
        insertCallout(editor, range, 'note')
      },
    },
    {
      title: 'Exam tip',
      description: 'Amber exam-tip callout',
      keywords: ['callout', 'tip', 'exam tip', 'hint', 'admonition', 'alert'],
      icon: '💡',
      command: ({ editor, range }) => {
        insertCallout(editor, range, 'tip')
      },
    },
    {
      title: 'Warning',
      description: 'Rose warning callout',
      keywords: ['callout', 'warning', 'caution', 'admonition', 'alert'],
      icon: '⚠',
      command: ({ editor, range }) => {
        insertCallout(editor, range, 'warning')
      },
    },
    {
      title: 'Exam trap',
      description: 'Amber-rose exam trap callout',
      keywords: ['callout', 'exam', 'trap', 'examtrap', 'gotcha', 'admonition', 'alert'],
      icon: '⚠️',
      command: ({ editor, range }) => {
        insertCallout(editor, range, 'exam')
      },
    },
    {
      title: 'Toggle',
      description: 'Collapsible section',
      keywords: ['toggle', 'details', 'summary', 'collapse', 'spoiler', 'accordion'],
      icon: '▸',
      command: ({ editor, range }) => {
        applyBlockCommand(editor, range, (chain) =>
          chain.insertContent({
            type: 'toggle',
            attrs: { title: 'Toggle title' },
            content: [{ type: 'paragraph' }],
          }),
        )
      },
    },
    {
      title: 'Code block',
      description: 'Fenced code',
      keywords: ['code', 'codeblock', 'pre', 'snippet'],
      icon: '</>',
      command: ({ editor, range }) => {
        applyBlockCommand(editor, range, (chain) => chain.toggleCodeBlock())
      },
    },
    {
      title: 'Divider',
      description: 'Horizontal rule',
      keywords: ['divider', 'hr', 'line', 'separator', 'horizontal'],
      icon: '—',
      command: ({ editor, range }) => {
        applyBlockCommand(editor, range, (chain) => chain.setHorizontalRule())
      },
    },
  ]

  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return items
  }

  return items.filter((item) => {
    const haystack = [item.title, item.description, ...item.keywords]
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalized)
  })
}

type SlashSuggestionOptions = Omit<SuggestionOptions<SlashCommandItem>, 'editor'>

function positionSlashMenu(
  element: HTMLElement,
  clientRect?: (() => DOMRect | null) | null,
) {
  const rect = clientRect?.()
  if (!rect) {
    return
  }

  element.style.position = 'fixed'
  element.style.zIndex = '100'

  // Measure after layout so we can clamp to the viewport.
  const menuRect = element.getBoundingClientRect()
  const padding = 8
  let top = rect.bottom + 6
  let left = rect.left

  const maxLeft = Math.max(padding, window.innerWidth - menuRect.width - padding)
  const maxTop = Math.max(padding, window.innerHeight - menuRect.height - padding)
  left = Math.min(Math.max(left, padding), maxLeft)
  top = Math.min(Math.max(top, padding), maxTop)

  element.style.top = `${top}px`
  element.style.left = `${left}px`
}

function renderSlashMenu() {
  let component: ReactRenderer<SlashCommandListRef> | null = null
  let wrapper: HTMLDivElement | null = null

  return {
    onStart(props: SuggestionProps<SlashCommandItem>) {
      component = new ReactRenderer(SlashCommandList, {
        props: {
          items: props.items,
          command: props.command,
        },
        editor: props.editor,
      })

      // Portal to document.body so overflow/stacking from the editor or
      // CardEditModal (z-[60]) cannot clip or bury the menu.
      wrapper = document.createElement('div')
      wrapper.style.position = 'fixed'
      wrapper.style.zIndex = '100'
      wrapper.appendChild(component.element)
      document.body.appendChild(wrapper)
      positionSlashMenu(wrapper, props.clientRect)
    },

    onUpdate(props: SuggestionProps<SlashCommandItem>) {
      component?.updateProps({
        items: props.items,
        command: props.command,
      })
      if (wrapper) {
        positionSlashMenu(wrapper, props.clientRect)
      }
    },

    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === 'Escape') {
        return true
      }
      return component?.ref?.onKeyDown(props) ?? false
    },

    onExit() {
      if (wrapper) {
        wrapper.remove()
        wrapper = null
      }
      component?.destroy()
      component = null
    },
  }
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: slashCommandPluginKey,
        allowedPrefixes: [' '],
        startOfLine: false,
        allowSpaces: false,
        placement: 'bottom-start',
        offset: { mainAxis: 6, crossAxis: 0 },
        dismissOnOutsideClick: true,
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
        items: ({ query }) => getSlashCommandItems(query),
        render: renderSlashMenu,
      } satisfies Partial<SlashSuggestionOptions>,
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
