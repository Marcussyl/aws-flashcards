'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from 'react'
import type { Editor, Range } from '@tiptap/core'

export type SlashCommandItem = {
  title: string
  description: string
  keywords: string[]
  icon: ReactNode
  command: (props: { editor: Editor; range: Range }) => void
}

export type SlashCommandListProps = {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

export type SlashCommandListRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const SlashCommandList = forwardRef<SlashCommandListRef, SlashCommandListProps>(
  function SlashCommandList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index]
        if (!item) {
          return false
        }
        command(item)
        return true
      },
      [command, items],
    )

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: ({ event }) => {
          if (items.length === 0) {
            return false
          }
          if (event.key === 'ArrowUp') {
            setSelectedIndex((index) => (index + items.length - 1) % items.length)
            return true
          }
          if (event.key === 'ArrowDown') {
            setSelectedIndex((index) => (index + 1) % items.length)
            return true
          }
          if (event.key === 'Enter') {
            return selectItem(selectedIndex)
          }
          return false
        },
      }),
      [items.length, selectItem, selectedIndex],
    )

    if (items.length === 0) {
      return (
        <div className="z-[100] min-w-[14rem] overflow-hidden rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-400 shadow-2xl">
          No matching commands
        </div>
      )
    }

    return (
      <div
        className="z-[100] max-h-72 min-w-[16rem] overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-1 shadow-2xl"
        role="listbox"
        aria-label="Slash commands"
      >
        {items.map((item, index) => {
          const active = index === selectedIndex
          return (
            <button
              key={item.title}
              type="button"
              role="option"
              aria-selected={active}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-slate-200 hover:bg-white/5 hover:text-white'
              }`}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault()
                selectItem(index)
              }}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-semibold ${
                  active
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-white/10 bg-slate-950/80 text-slate-300'
                }`}
                aria-hidden
              >
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">{item.title}</span>
                <span
                  className={`mt-0.5 block text-[11px] leading-tight ${
                    active ? 'text-accent/80' : 'text-slate-400'
                  }`}
                >
                  {item.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    )
  },
)
