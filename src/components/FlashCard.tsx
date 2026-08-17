'use client'

import { useState } from 'react'
import type { Card } from '@/data/types'

type FlashCardProps = {
  card: Card
  flipped: boolean
  onFlip: () => void
}

export function FlashCard({ card, flipped, onFlip }: FlashCardProps) {
  const [showFull, setShowFull] = useState(false)

  return (
    <div
      className="card-scene w-full text-left"
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">
            {card.category}
          </p>
          <h2 className="mt-6 text-2xl font-semibold leading-snug text-white sm:text-3xl">
            {card.question}
          </h2>
          <p className="mt-auto pt-10 text-sm text-slate-400">
            Click or press Space to flip
          </p>
        </div>
        <div className="card-face card-back">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
            Answer
          </p>
          <div
            className="mt-4 max-h-[42vh] overflow-y-auto pr-2 text-left text-slate-100"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="whitespace-pre-wrap text-base leading-7">
              {showFull ? card.answer : card.summary || card.answer}
            </p>
            {card.answer !== card.summary && card.summary && (
              <button
                type="button"
                className="mt-4 text-sm font-medium text-amber-300 hover:text-amber-200"
                onClick={(event) => {
                  event.stopPropagation()
                  setShowFull((value) => !value)
                }}
              >
                {showFull ? 'Show summary' : 'Show full notes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
