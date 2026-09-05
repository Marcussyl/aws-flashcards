'use client'

import { motion, useReducedMotion } from 'motion/react'

export function AmbientBackdrop() {
  const reduce = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl"
        animate={reduce ? undefined : { x: [0, 18, 0], y: [0, 14, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-16 top-24 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl"
        animate={reduce ? undefined : { x: [0, -16, 0], y: [0, 20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-56 w-80 rounded-full bg-violet-500/10 blur-3xl"
        animate={reduce ? undefined : { x: [0, 12, 0], y: [0, -10, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_42%)]" />
    </div>
  )
}
