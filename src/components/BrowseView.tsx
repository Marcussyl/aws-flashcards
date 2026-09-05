'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { getCategoriesForTopic } from '@/data/categories'
import type { TopicId } from '@/data/topics'
import { getTopic } from '@/data/topics'
import { getCardsByTopic } from '@/lib/cards'
import { MarkdownContent } from '@/components/MarkdownContent'
import { easeOutExpo } from '@/lib/motion'
import { useProgress } from '@/lib/progress'

export function BrowseView({ topicId }: { topicId: TopicId }) {
  const { map } = useProgress()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [openId, setOpenId] = useState<string | null>(null)
  const reduce = useReducedMotion()
  const topic = getTopic(topicId)
  const topicCards = getCardsByTopic(topicId)
  const categories = getCategoriesForTopic(topicId)

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
    <div className='space-y-6'>
      <div>
        <p className='font-mono text-[11px] uppercase tracking-wider text-accent'>
          {topic?.name ?? 'Topic'} notes
        </p>
        <h1 className='mt-2 text-[30px] font-semibold leading-[38px] tracking-tight'>
          Browse {topic?.name ?? 'cards'}
        </h1>
        <p className='mt-2 text-muted'>Search questions or notes in this topic.</p>
      </div>
      <div className='flex flex-col gap-3'>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Filter questions or answers'
          className='w-full rounded-xl border border-border bg-[#181c24] px-4 py-3 text-sm outline-none placeholder:text-muted-2 focus:border-border-strong focus:bg-surface-3'
        />
        <div className='flex flex-wrap gap-2'>
          <FilterChip
            label='All'
            active={category === 'All'}
            onClick={() => setCategory('All')}
          />
          {categories.map((item) => (
            <FilterChip
              key={item.name}
              label={item.name}
              active={category === item.name}
              onClick={() => setCategory(item.name)}
            />
          ))}
        </div>
      </div>
      <p className='font-mono text-[11px] uppercase tracking-wider text-muted-2'>
        {visible.length} cards
      </p>
      <div key={`${category}|${query}`} className='space-y-3'>
        {visible.length === 0 ? (
          <p className='surface-card rounded-xl px-5 py-8 text-center text-sm text-muted'>
            No cards match this search.
          </p>
        ) : (
          visible.map((card) => {
            const status = map[card.id]?.status ?? 'unseen'
            const open = openId === card.id
            return (
              <article
                key={card.id}
                className='surface-card rounded-xl'
              >
                <button
                  type='button'
                  className='flex w-full items-start justify-between gap-4 p-5 text-left'
                  onClick={() => setOpenId(open ? null : card.id)}
                >
                  <div>
                    <p className='font-mono text-[11px] uppercase tracking-[0.08em] text-accent'>
                      {card.category}
                    </p>
                    <h2 className='mt-1 font-medium text-foreground'>{card.question}</h2>
                  </div>
                  <span className='shrink-0 rounded-full bg-[#181c24] px-2 py-1 font-mono text-[11px] capitalize text-muted'>
                    {status}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      key='answer'
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduce ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: easeOutExpo }}
                      className='overflow-hidden'
                    >
                      <div className='border-t border-border p-5 text-[17px] leading-7 text-muted'>
                        {(card.images?.length ?? 0) > 0 && (
                          <div className='mb-4 space-y-3'>
                            {card.images?.map((src) => (
                              <img
                                key={src}
                                src={src}
                                alt=''
                                className='max-h-80 w-full rounded-xl border border-border bg-[#0b0f17] object-contain'
                              />
                            ))}
                          </div>
                        )}
                        <MarkdownContent className='prose-sm' content={card.answer} />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-accent text-accent-fg'
          : 'bg-[#181c24] text-muted hover:bg-surface-3 hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}
