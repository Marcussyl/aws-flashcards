'use client'

import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'

type AnimatedNumberProps = {
  value: number
  ready: boolean
}

export function AnimatedNumber({ value, ready }: AnimatedNumberProps) {
  const reduce = useReducedMotion()
  const motionValue = useMotionValue(0)
  const text = useTransform(motionValue, (latest) => String(Math.round(latest)))

  useEffect(() => {
    if (!ready) {
      motionValue.set(0)
      return
    }
    if (reduce) {
      motionValue.set(value)
      return
    }
    const controls = animate(motionValue, value, {
      duration: 0.55,
      ease: 'easeOut',
    })
    return () => controls.stop()
  }, [motionValue, ready, reduce, value])

  if (!ready) {
    return '—'
  }

  return <motion.span>{text}</motion.span>
}
