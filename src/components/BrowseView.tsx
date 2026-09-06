'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CardEditModal } from '@/components/CardEditModal'
import { IconPencil } from '@/components/icons'
import { MarkdownContent } from '@/components/MarkdownContent'
import { getCategoriesForTopic } from '@/data/categories'
import type { TopicId } from '@/data/topics'
import type { Card } from '@/data/types'
import { easeOutExpo } from '@/lib/motion'
import { useProgress } from '@/lib/progress'

export function BrowseView({ topicId, cards }: { topicId: TopicId; cards: Card[] }) {
  const { map } = useProgress()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Card | null>(null)
  const [topicCards, setTopicCards] = useState(cards)
  const reduce = useReducedMotion()
  const categories = getCategoriesForTopic(topicId)

  useEffect(() => {
    setTopicCards(cards)
  }, [cards])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return topicCards.filter((card) => {
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
  }, [query, category, topicCards])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Browse cards</h1>
        <p className="mt-2 text-slate-400">
          Search questions or notes in this topic. Use the pencil to edit markdown.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search questions or answers"
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none ring-accent/40 placeholder:text-slate-500 focus:ring-2"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm sm:w-auto"
        >
          <option value="All">All categories</option>
          {categories.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-slate-500">{visible.length} cards</p>
      <motion.div
        key={`${category}|${query}`}
        className="space-y-3"
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: easeOutExpo }}
      >
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-8 text-center text-sm text-slate-400">
            No cards match this search.
          </p>
        ) : (
          visible.map((card) => {
            const status = map[card.id]?.status ?? 'unseen'
            const open = openId === card.id
            return (
              <article
                key={card.id}
                className="rounded-2xl border border-white/10 bg-slate-900/80"
              >
                <div className="flex w-full items-start gap-2 p-5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setOpenId(open ? null : card.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-accent/80">
                          {card.category}
                        </p>
                        <h2 className="mt-1 font-medium text-white">{card.question}</h2>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-xs capitalize text-slate-400">
                        {status}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                    aria-label={`Edit ${card.id}`}
                    onClick={() => setEditing(card)}
                  >
                    <IconPencil className="h-4 w-4" />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      key="answer"
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduce ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: easeOutExpo }}
                      className="overflow-hidden"
                    >
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
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            )
          })
        )}
      </motion.div>
      {editing ? (
        <CardEditModal
          card={editing}
          open
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setTopicCards((current) => current.map((item) => (item.id === next.id ? next : item)))
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}
