'use client'

import { useMemo, useState } from 'react'
import { CATEGORIES } from '@/data/categories'
import { cards } from '@/lib/cards'
import { MarkdownContent } from '@/components/MarkdownContent'
import { useProgress } from '@/lib/progress'

export function BrowseView() {
  const { map } = useProgress()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [openId, setOpenId] = useState<string | null>(null)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return cards.filter((card) => {
      const categoryOk = category === 'All' || card.category === category
      if (!categoryOk) {
        return false
      }
      if (!needle) {
        return true
      }
      return (
        card.question.toLowerCase().includes(needle) ||
        card.answer.toLowerCase().includes(needle) ||
        card.sourceQuestion.toLowerCase().includes(needle)
      )
    })
  }, [query, category])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Browse cards</h1>
        <p className="mt-2 text-slate-400">
          Search original notes or paraphrased exam-style questions.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search questions or answers"
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none ring-amber-400/40 placeholder:text-slate-500 focus:ring-2"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm sm:w-auto"
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-slate-500">{visible.length} cards</p>
      <div className="space-y-3">
        {visible.map((card) => {
          const status = map[card.id]?.status ?? 'unseen'
          const open = openId === card.id
          return (
            <article
              key={card.id}
              className="rounded-2xl border border-white/10 bg-slate-900/80"
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-4 p-5 text-left"
                onClick={() => setOpenId(open ? null : card.id)}
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-300/80">
                    {card.category}
                  </p>
                  <h2 className="mt-1 font-medium text-white">{card.question}</h2>
                </div>
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-xs capitalize text-slate-400">
                  {status}
                </span>
              </button>
              {open && (
                <div className="border-t border-white/10 p-5 text-slate-300">
                  {(card.images?.length ?? 0) > 0 && (
                    <div className="mb-4 space-y-3">
                      {card.images?.map((src) => (
                        <img
                          key={src}
                          src={src}
                          alt=""
                          className="max-h-80 w-full rounded-xl border border-white/10 object-contain bg-slate-950"
                        />
                      ))}
                    </div>
                  )}
                  <MarkdownContent className="prose-sm" content={card.answer} />
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
