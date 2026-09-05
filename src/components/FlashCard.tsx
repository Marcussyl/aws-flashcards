'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { IconFlip } from '@/components/icons'
import { Keycap } from '@/components/Keycap'
import { MarkdownContent } from '@/components/MarkdownContent'
import { getCategoryEmoji } from '@/data/categories'
import { cardNoteRemainder } from '@/lib/paths'
import { useIsClient } from '@/lib/use-is-client'
import type { Card } from '@/data/types'

type FlashCardProps = {
  card: Card
  flipped: boolean
  onFlip: () => void
}

export function FlashCard({ card, flipped, onFlip }: FlashCardProps) {
  const [ui, setUi] = useState({ id: card.id, expanded: false, showFull: false })
  const isClient = useIsClient()
  const reduce = useReducedMotion()

  if (ui.id !== card.id) {
    setUi({ id: card.id, expanded: false, showFull: false })
  }

  const expanded = ui.expanded
  const showFull = ui.showFull

  function setExpanded(value: boolean) {
    setUi((current) => ({ ...current, id: card.id, expanded: value }))
  }

  function setShowFull(value: boolean | ((prev: boolean) => boolean)) {
    setUi((current) => ({
      ...current,
      id: card.id,
      showFull: typeof value === 'function' ? value(current.showFull) : value,
    }))
  }

  useEffect(() => {
    if (!expanded) {
      return
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUi((current) => ({ ...current, expanded: false }))
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
        className='card-scene h-full w-full text-left'
        onClick={onFlip}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onFlip()
          }
          if (event.key === ' ') {
            event.preventDefault()
          }
        }}
        role='button'
        tabIndex={0}
        aria-label={flipped ? 'Hide answer' : 'Reveal answer'}
      >
        <div className={`card-inner ${flipped ? 'is-flipped' : ''}`}>
          <div className='card-face card-front'>
            <div className='flex h-8 shrink-0 items-center justify-between gap-3'>
              <p className='flex min-w-0 items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-accent'>
                <span aria-hidden='true'>{getCategoryEmoji(card.category, card.topic)}</span>
                <span className='truncate'>{card.category}</span>
              </p>
              <ExpandButton onClick={openExpanded} />
            </div>
            <div className='mt-4 flex min-h-0 flex-1 overflow-y-auto overscroll-contain'>
              <div className='m-auto w-full'>
                <p className='mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-accent'>
                  Question
                </p>
                <h2 className='text-xl font-medium leading-snug tracking-tight text-foreground sm:text-[30px] sm:leading-[38px]'>
                  {card.question}
                </h2>
              </div>
            </div>
            <p className='flex shrink-0 items-center justify-center gap-2 pt-4 text-[13px] text-muted sm:pt-6'>
              <IconFlip className='h-4 w-4 text-accent' />
              Press <Keycap>Space</Keycap> to flip
            </p>
          </div>
          <div className='card-face card-back'>
            <div className='flex h-8 shrink-0 items-center justify-between gap-3'>
              <p className='font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary'>
                Answer
              </p>
              <ExpandButton onClick={openExpanded} />
            </div>
            <div
              className='mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 text-left text-[17px] leading-7 text-foreground'
              onClick={(event) => event.stopPropagation()}
            >
              <CardBody card={card} showFull={showFull} onToggleFull={() => setShowFull((value) => !value)} />
            </div>
          </div>
        </div>
      </div>
      {isClient
        ? createPortal(
            <AnimatePresence>
              {expanded ? (
                <motion.div
                  key='card-modal'
                  className='fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:p-8'
                  data-card-expanded='true'
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  onClick={() => setExpanded(false)}
                >
                  <motion.div
                    className='surface-card flex max-h-[92vh] w-full max-w-3xl flex-col rounded-xl p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.75)] sm:mx-auto sm:max-h-[88vh] sm:p-8'
                    initial={reduce ? false : { y: 28, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={reduce ? undefined : { y: 16, opacity: 0, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className='mb-4 flex h-8 items-center justify-between gap-3'>
                      <p className='font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-accent'>
                        {flipped ? 'Answer' : card.category}
                      </p>
                      <button
                        type='button'
                        className='flex size-8 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-surface-3 hover:text-foreground'
                        onClick={() => setExpanded(false)}
                        aria-label='Close expanded card'
                      >
                        <CollapseIcon />
                      </button>
                    </div>
                    <div className='overflow-y-auto pr-1 text-foreground'>
                      {flipped ? (
                        <CardBody
                          card={card}
                          showFull={showFull}
                          onToggleFull={() => setShowFull((value) => !value)}
                        />
                      ) : (
                        <h2 className='text-2xl font-medium leading-snug text-foreground sm:text-[30px]'>
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

function CardBody({
  card,
  showFull,
  onToggleFull,
}: {
  card: Card
  showFull: boolean
  onToggleFull: () => void
}) {
  const extra = cardNoteRemainder(card.summary, card.answer)
  const images = card.images ?? []

  return (
    <>
      <MarkdownContent content={card.summary} />
      {extra && !showFull ? (
        <button
          type='button'
          className='mt-4 text-sm font-medium text-accent hover:underline'
          onClick={onToggleFull}
        >
          Show full note
        </button>
      ) : null}
      {extra && showFull ? (
        <div className='mt-4 space-y-4 border-t border-border pt-4'>
          {images.length > 0 ? (
            <div className='space-y-3'>
              {images.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=''
                  className='max-h-[70vh] w-full rounded-xl border border-border bg-[#0b0f17] object-contain'
                />
              ))}
            </div>
          ) : null}
          <MarkdownContent content={extra} />
          <button
            type='button'
            className='text-sm font-medium text-muted hover:text-foreground'
            onClick={onToggleFull}
          >
            Hide full note
          </button>
        </div>
      ) : null}
      {!extra && images.length > 0 ? (
        <div className='mt-4 space-y-3'>
          {images.map((src) => (
            <img
              key={src}
              src={src}
              alt=''
              className='max-h-[70vh] w-full rounded-xl border border-border bg-[#0b0f17] object-contain'
            />
          ))}
        </div>
      ) : null}
    </>
  )
}

function ExpandButton({ onClick }: { onClick: (event: React.MouseEvent) => void }) {
  return (
    <button
      type='button'
      className='flex size-8 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-surface-3 hover:text-foreground'
      onClick={onClick}
      aria-label='Expand card'
    >
      <ExpandIcon />
    </button>
  )
}

function ExpandIcon() {
  return (
    <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
      <path d='M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

function CollapseIcon() {
  return (
    <svg viewBox='0 0 24 24' className='h-5 w-5' fill='none' stroke='currentColor' strokeWidth='2'>
      <path d='M9 3v5H4M15 3v5h5M9 21v-5H4M15 21v-5h5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}
