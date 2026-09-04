'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconFlip } from '@/components/icons'
import { MarkdownContent } from '@/components/MarkdownContent'
import { getCategoryEmoji } from '@/data/categories'
import { useIsClient } from '@/lib/use-is-client'
import type { Card } from '@/data/types'

type FlashCardProps = {
  card: Card
  flipped: boolean
  onFlip: () => void
}

export function FlashCard({ card, flipped, onFlip }: FlashCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isClient = useIsClient()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!expanded) {
      return
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [expanded])

  function openExpanded(event: React.MouseEvent) {
    event.stopPropagation()
    setExpanded(true)
  }

  return (
    <>
      <div
        className="card-scene h-full w-full text-left"
        onClick={onFlip}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onFlip()
          }
          if (event.key === ' ') {
            event.preventDefault()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Hide answer' : 'Reveal answer'}
      >
        <div className={`card-inner ${flipped ? 'is-flipped' : ''}`}>
          <div className="card-face card-front">
            <div className="flex h-8 shrink-0 items-center justify-between gap-3">
              <p className="flex min-w-0 items-center gap-2 leading-none text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                <span aria-hidden="true">{getCategoryEmoji(card.category)}</span>
                <span className="truncate">{card.category}</span>
              </p>
              <ExpandButton onClick={openExpanded} />
            </div>
            <div className="mt-4 flex min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <h2 className="m-auto w-full text-center text-xl font-semibold leading-snug text-white sm:text-3xl">
                {card.question}
              </h2>
            </div>
            <p className="flex shrink-0 items-center justify-center gap-2 pt-4 text-sm text-slate-400 sm:pt-6">
              <IconFlip className="h-4 w-4 text-amber-300/80" />
              Tap the card to flip
            </p>
          </div>
          <div className="card-face card-back">
            <div className="flex h-8 shrink-0 items-center justify-between gap-3">
              <p className="leading-none text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
                Answer
              </p>
              <ExpandButton onClick={openExpanded} />
            </div>
            <div
              className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 text-left text-slate-100"
              onClick={(event) => event.stopPropagation()}
            >
              <CardBody card={card} />
            </div>
          </div>
        </div>
      </div>
      {isClient
        ? createPortal(
            <AnimatePresence>
              {expanded ? (
                <motion.div
                  key="card-modal"
                  className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:p-8"
                  data-card-expanded="true"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  onClick={() => setExpanded(false)}
                >
                  <motion.div
                    className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl sm:mx-auto sm:max-h-[88vh] sm:p-8"
                    initial={reduce ? false : { y: 28, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={reduce ? undefined : { y: 16, opacity: 0, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-4 flex h-8 items-center justify-between gap-3">
                      <p className="leading-none text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
                        {flipped ? 'Answer' : card.category}
                      </p>
                      <button
                        type="button"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
                        onClick={() => setExpanded(false)}
                        aria-label="Close expanded card"
                      >
                        <CollapseIcon />
                      </button>
                    </div>
                    <div className="overflow-y-auto pr-1 text-slate-100">
                      {flipped ? (
                        <CardBody card={card} />
                      ) : (
                        <h2 className="text-center text-2xl font-semibold leading-snug text-white sm:text-3xl">
                          {card.question}
                        </h2>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  )
}

function CardBody({ card }: { card: Card }) {
  return (
    <>
      {(card.images?.length ?? 0) > 0 && (
        <div className="mb-4 space-y-3">
          {card.images?.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              className="max-h-[70vh] w-full rounded-xl border border-white/10 object-contain bg-slate-950"
            />
          ))}
        </div>
      )}
      <MarkdownContent content={card.answer} />
    </>
  )
}

function ExpandButton({ onClick }: { onClick: (event: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
      onClick={onClick}
      aria-label="Expand card"
    >
      <ExpandIcon />
    </button>
  )
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3v5H4M15 3v5h5M9 21v-5H4M15 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
