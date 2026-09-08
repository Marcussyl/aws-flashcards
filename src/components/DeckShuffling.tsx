'use client'

import { motion, useReducedMotion } from 'motion/react'
import { IconLayers, IconShuffle } from '@/components/icons'

type DeckShufflingProps = {
  badge?: string
  title?: string
  subtitle?: string
  footer?: string
}

export function DeckShuffling({
  badge = 'Loading topic',
  title = 'Shuffling deck',
  subtitle = 'Lining up cards so you can dive in.',
  footer = 'Preparing…',
}: DeckShufflingProps) {
  const reduce = useReducedMotion()

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-lg flex-1 flex-col items-center justify-center px-2 text-center"
      aria-busy="true"
      aria-label={title}
    >
      <div className="relative h-[9.5rem] w-[7.5rem]" aria-hidden="true">
        <motion.span
          className="absolute inset-0 rounded-[1.15rem] border border-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
          style={{ background: 'linear-gradient(180deg, #1e293b, #0f172a)' }}
          initial={{ rotate: -10, x: -12, y: 8 }}
          animate={reduce ? undefined : { y: [8, 0, 8] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          className="absolute inset-0 rounded-[1.15rem] border border-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
          style={{ background: 'linear-gradient(180deg, #1d4ed8, #0f172a)' }}
          initial={{ rotate: 8, x: 14, y: 6 }}
          animate={reduce ? undefined : { y: [6, -2, 6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
        />
        <motion.span
          className="absolute inset-0 flex items-center justify-center rounded-[1.15rem] border border-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
          style={{
            background:
              'radial-gradient(circle at top right, color-mix(in oklab, var(--accent) 28%, transparent), transparent 40%), linear-gradient(180deg, #0f172a, #111827)',
          }}
          animate={reduce ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        >
          <IconLayers className="h-8 w-8 text-accent" />
        </motion.span>
      </div>
      <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
        <IconShuffle className="h-3.5 w-3.5" />
        {badge}
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{subtitle}</p>
      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex size-2 animate-pulse rounded-full bg-accent" />
        {footer}
      </div>
    </div>
  )
}