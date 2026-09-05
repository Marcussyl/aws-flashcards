'use client'

import type { Transition, Variants } from 'motion/react'

export const easeOutExpo: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const fadeUp: Variants = {
  hidden: { opacity: 1, y: 0 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: easeOutExpo },
  },
}

export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.05 },
  },
}

export const tapSpring: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 30,
}

export const layoutSpring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
}

export const pageTransition: Transition = {
  duration: 0.22,
  ease: easeOutExpo,
}

export const cardSwipe = {
  enter: (dir: number) => ({
    x: dir * 48,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    y: 0,
    rotate: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir: number) => ({
    x: dir * -56,
    opacity: 0,
    scale: 0.98,
  }),
}

export const cardExitKnown = {
  y: -36,
  opacity: 0,
  scale: 0.94,
}

export const cardExitLearning = {
  x: -36,
  rotate: -4,
  opacity: 0,
}
