'use client'

import type { RefObject } from 'react'
import { useMotionValue, useReducedMotion, useScroll, type MotionValue } from 'framer-motion'

interface SectionScroll {
  scrollYProgress: MotionValue<number>
}

/**
 * Thin wrapper over framer-motion's `useScroll`, shared by every
 * scroll-scrubbed landing section (shader hero, eclipse orb, finance
 * equation). Each section owns its own instance — there is no global
 * scroll registry (ADR-3: Lenis drives native scroll, framer reads it
 * directly).
 *
 * Reduced-motion users get a frozen MotionValue pinned at the section's
 * final state (1) instead of a live scroll-driven value.
 */
export function useSectionScroll(target: RefObject<HTMLElement>): SectionScroll {
  const prefersReducedMotion = useReducedMotion()
  const frozenProgress = useMotionValue(1)
  const { scrollYProgress } = useScroll({
    target,
    offset: ['start end', 'end start'],
  })

  if (prefersReducedMotion) {
    return { scrollYProgress: frozenProgress }
  }

  return { scrollYProgress }
}
