'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Delay in seconds before the reveal transition starts. */
  delay?: number
}

/**
 * Scroll-in reveal wrapper shared by every landing section. Replaces the
 * standalone port's `ppMark()`/`ppReveal()` geometry system with
 * framer-motion's `whileInView`, triggered once per element.
 *
 * Reduced-motion users get the final visual state immediately with no
 * transition wrapper — content is never hidden behind motion.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
