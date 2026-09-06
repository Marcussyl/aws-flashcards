'use client'

import { useEffect, type ReactNode } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from '@tiptap/markdown'

type RichTextEditorProps = {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  minHeightClassName?: string
  ariaLabel?: string
}

function ToolbarButton({
  label,
  ariaLabel,
  active,
  disabled,
  onClick,
  className = '',
}: {
  label: ReactNode
  ariaLabel: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={`rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide transition ${
        active
          ? 'bg-accent/20 text-accent'
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
      } disabled:cursor-not-allowed disabled:opacity-40 ${className}`.trim()}
      aria-label={ariaLabel}
      title={ariaLabel}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault()
        onClick()
      }}
    >
      {label}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write…',
  minHeightClassName = 'min-h-[7rem]',
  ariaLabel,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            class: 'text-sky-300 underline underline-offset-2',
            rel: 'noreferrer',
            target: '_blank',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'rounded-lg bg-slate-950/80 px-3 py-2 font-mono text-[0.85em] text-accent',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em] text-accent',
          },
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        indentation: { style: 'space', size: 2 },
        markedOptions: { gfm: true, breaks: false },
      }),
    ],
    content: value || '',
    contentType: 'markdown',
    editorProps: {
      attributes: {
        'aria-label': ariaLabel ?? 'Rich text editor',
        class: [
          'prose prose-invert prose-sm max-w-none focus:outline-none',
          'prose-headings:my-2 prose-headings:text-white',
          'prose-p:my-1.5 prose-p:text-slate-100',
          'prose-li:my-0.5 prose-li:text-slate-100',
          'prose-strong:text-white prose-a:text-sky-300',
          'px-3 py-2.5',
          minHeightClassName,
        ].join(' '),
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getMarkdown())
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }
    const current = editor.getMarkdown()
    if ((value || '') !== (current || '')) {
      editor.commands.setContent(value || '', { contentType: 'markdown' })
    }
  }, [editor, value])

  if (!editor) {
    return (
      <div
        className={`rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-500 ${minHeightClassName}`}
      >
        Loading editor…
      </div>
    )
  }

  const activeEditor = editor

  function setLink() {
    const previous = activeEditor.getAttributes('link').href as string | undefined
    const next = window.prompt('Link URL', previous ?? 'https://')
    if (next === null) {
      return
    }
    const trimmed = next.trim()
    if (!trimmed) {
      activeEditor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    activeEditor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950 ring-accent/40 focus-within:ring-2">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 bg-slate-900/80 px-1.5 py-1">
        <ToolbarButton
          label={<span className="font-bold">B</span>}
          ariaLabel="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label={<span className="italic">I</span>}
          ariaLabel="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
        <ToolbarButton
          label="H2"
          ariaLabel="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="H3"
          ariaLabel="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
        <ToolbarButton
          label="• List"
          ariaLabel="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="1. List"
          ariaLabel="Ordered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
        <ToolbarButton
          label="Code"
          ariaLabel="Inline code"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <ToolbarButton
          label="Block"
          ariaLabel="Code block"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <ToolbarButton
          label="Link"
          ariaLabel="Link"
          active={editor.isActive('link')}
          onClick={setLink}
        />
      </div>
      <EditorContent editor={editor} />
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          color: rgb(100 116 139);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}