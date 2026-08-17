'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

export type BurstKind = 'known' | 'learning'

const KNOWN_COLORS = ['#fbbf24', '#34d399', '#38bdf8', '#f97316', '#f8fafc', '#f472b6']
const KNOWN_EMOJIS = ['🎉', '⚡', '✨', '🎊']
const LEARNING_COLORS = ['#fda4af', '#fb7185', '#fbbf24', '#38bdf8', '#c4b5fd']
const LEARNING_EMOJIS = ['📚', '💪', '🔁', '✏️', '✨']

type Piece = {
  id: number
  left: number
  top: string
  delay: number
  duration: number
  dx: number
  color: string
  emoji?: string
  size: number
}

export function CelebrateBurst({
  burstId,
  kind,
}: {
  burstId: number
  kind: BurstKind
}) {
  const [mounted, setMounted] = useState(false)
  const pieces = useMemo<Piece[]>(() => {
    if (!burstId) {
      return []
    }
    const isKnown = kind === 'known'
    const colors = isKnown ? KNOWN_COLORS : LEARNING_COLORS
    const emojis = isKnown ? KNOWN_EMOJIS : LEARNING_EMOJIS
    return Array.from({ length: isKnown ? 32 : 18 }, (_, id) => ({
      id,
      left: isKnown ? 12 + Math.random() * 76 : 28 + Math.random() * 44,
      top: isKnown ? '18%' : '58%',
      delay: Math.random() * 0.12,
      duration: (isKnown ? 0.9 : 0.75) + Math.random() * 0.45,
      dx: (Math.random() - 0.5) * (isKnown ? 220 : 160),
      color: colors[id % colors.length],
      emoji: id % 5 === 0 ? emojis[id % emojis.length] : undefined,
      size: 6 + Math.random() * 8,
    }))
  }, [burstId, kind])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !burstId) {
    return null
  }

  const isKnown = kind === 'known'

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {!isKnown ? (
        <>
          <span key={`ring-a-${burstId}`} className="learning-ring" />
          <span key={`ring-b-${burstId}`} className="learning-ring learning-ring-delay" />
        </>
      ) : null}
      {pieces.map((piece) => (
        <span
          key={`${burstId}-${piece.id}`}
          className={isKnown ? 'celebrate-piece' : 'learning-piece'}
          style={{
            left: `${piece.left}%`,
            top: piece.top,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ['--dx' as string]: `${piece.dx}px`,
            background: piece.emoji ? 'transparent' : piece.color,
            width: piece.emoji ? 'auto' : piece.size,
            height: piece.emoji ? 'auto' : piece.size * 0.6,
            fontSize: piece.emoji ? 18 : undefined,
          }}
        >
          {piece.emoji}
        </span>
      ))}
      <p
        key={`label-${burstId}`}
        className={isKnown ? 'celebrate-label' : 'learning-label'}
      >
        {isKnown ? 'Nice!' : 'Keep going!'}
      </p>
    </div>,
    document.body,
  )
}
