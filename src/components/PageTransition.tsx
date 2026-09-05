'use client'

import { motion, useReducedMotion } from 'motion/react'
import { pageTransition } from '@/lib/motion'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className="flex h-full min-h-0 flex-1 flex-col"
      initial={false}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}
