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

export const slashCommandPluginKey = new PluginKey('slashCommand')

function applyBlockCommand(
  editor: Editor,
  range: Range,
  run: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>,
) {
  const chain = editor.chain().focus().deleteRange(range)
  run(chain).run()
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
      title: 'Quote',
      description: 'Blockquote',
      keywords: ['quote', 'blockquote', 'citation'],
      icon: '❝',
      command: ({ editor, range }) => {
        applyBlockCommand(editor, range, (chain) => chain.toggleBlockquote())
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

function renderSlashMenu() {
  let component: ReactRenderer<SlashCommandListRef> | null = null
  let unmount: (() => void) | null = null

  return {
    onStart(props: SuggestionProps<SlashCommandItem>) {
      component = new ReactRenderer(SlashCommandList, {
        props: {
          items: props.items,
          command: props.command,
        },
        editor: props.editor,
      })
      unmount = props.mount(component.element)
    },

    onUpdate(props: SuggestionProps<SlashCommandItem>) {
      component?.updateProps({
        items: props.items,
        command: props.command,
      })
    },

    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === 'Escape') {
        return true
      }
      return component?.ref?.onKeyDown(props) ?? false
    },

    onExit() {
      unmount?.()
      unmount = null
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
