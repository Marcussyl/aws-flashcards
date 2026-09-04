'use client'

import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { useIsClient } from '@/lib/use-is-client'

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
  dy: number
  color: string
  emoji?: string
  size: number
}

function seededRandom(seed: number) {
  let next = seed % 2147483647
  if (next <= 0) {
    next += 2147483646
  }
  return () => {
    next = (next * 16807) % 2147483647
    return (next - 1) / 2147483646
  }
}

function createPieces(burstId: number, kind: BurstKind, reduce: boolean): Piece[] {
  const isKnown = kind === 'known'
  const colors = isKnown ? KNOWN_COLORS : LEARNING_COLORS
  const emojis = isKnown ? KNOWN_EMOJIS : LEARNING_EMOJIS
  const count = reduce ? 0 : isKnown ? 28 : 16
  const random = seededRandom(burstId * 97 + (isKnown ? 11 : 23))
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: isKnown ? 12 + random() * 76 : 28 + random() * 44,
    top: isKnown ? '18%' : '58%',
    delay: random() * 0.12,
    duration: (isKnown ? 0.85 : 0.7) + random() * 0.4,
    dx: (random() - 0.5) * (isKnown ? 220 : 160),
    dy: isKnown ? 280 + random() * 220 : -(180 + random() * 160),
    color: colors[id % colors.length],
    emoji: id % 5 === 0 ? emojis[id % emojis.length] : undefined,
    size: 6 + random() * 8,
  }))
}

export function CelebrateBurst({
  burstId,
  kind,
}: {
  burstId: number
  kind: BurstKind
}) {
  const isClient = useIsClient()
  const reduce = Boolean(useReducedMotion())

  if (!isClient || !burstId) {
    return null
  }

  const isKnown = kind === 'known'
  const pieces = createPieces(burstId, kind, reduce)

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {!isKnown && !reduce ? (
        <>
          <motion.span
            key={`ring-a-${burstId}`}
            className="absolute left-1/2 top-[48%] size-12 rounded-full border-2 border-rose-400/70"
            initial={{ opacity: 0.8, scale: 0.4, x: '-50%', y: '-50%' }}
            animate={{ opacity: 0, scale: 7 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
          />
          <motion.span
            key={`ring-b-${burstId}`}
            className="absolute left-1/2 top-[48%] size-12 rounded-full border-2 border-rose-400/70"
            initial={{ opacity: 0.8, scale: 0.4, x: '-50%', y: '-50%' }}
            animate={{ opacity: 0, scale: 7 }}
            transition={{ duration: 0.85, ease: 'easeOut', delay: 0.12 }}
          />
        </>
      ) : null}
      {pieces.map((piece) => (
        <motion.span
          key={`${burstId}-${piece.id}`}
          className="absolute"
          style={{
            left: `${piece.left}%`,
            top: piece.top,
            background: piece.emoji ? 'transparent' : piece.color,
            width: piece.emoji ? 'auto' : piece.size,
            height: piece.emoji ? 'auto' : piece.size * 0.6,
            fontSize: piece.emoji ? 18 : undefined,
            borderRadius: isKnown ? 2 : 999,
          }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0.7 }}
          animate={{
            opacity: 0,
            x: piece.dx,
            y: piece.dy,
            rotate: isKnown ? 540 : 0,
            scale: 1.05,
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: isKnown ? 'easeIn' : 'easeOut',
          }}
        >
          {piece.emoji}
        </motion.span>
      ))}
      <motion.p
        key={`label-${burstId}`}
        className="absolute left-1/2 top-[36%] m-0 text-3xl font-bold"
        style={{
          color: isKnown ? '#fbbf24' : '#fda4af',
          textShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        }}
        initial={{ opacity: 0, scale: 0.5, x: '-50%' }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.12, 1, 1] }}
        transition={{ duration: 0.9, times: [0, 0.25, 0.7, 1] }}
      >
        {isKnown ? 'Nice!' : 'Keep going!'}
      </motion.p>
    </div>,
    document.body,
  )
}
