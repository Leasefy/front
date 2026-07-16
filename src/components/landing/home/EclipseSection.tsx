'use client'

import { useRef } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'
import { useSectionScroll } from '@/components/landing/motion/useSectionScroll'

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * The "eclipse": a plain `var(--night)` dot — NO gradient, locked per
 * HANDOFF's "reglas de oro" (a full-color orb was tried and the user
 * explicitly rejected it) — that grows and settles into a full dark panel
 * as the section scrolls through view. The ring's glow fades out BEFORE
 * full coverage (`nfu`), so it never leaves a dirty dark-on-dark glow
 * behind; ported algebraically from the standalone's `update()`:
 *
 *   nfu = max(clamp01((coverage - 0.62) / 0.33), clamp01(settle * 1.15))
 *
 * `coverage` mirrors the standalone's `br` (dot growth toward full
 * viewport coverage); `settle` mirrors `pe` (settling into the panel's
 * final rounded footprint). Both are section-local `useTransform`s over
 * `useSectionScroll`'s `scrollYProgress` — no global scroll registry
 * (ADR-3), no shared mutable scope across instances (HANDOFF: "no `var`
 * repeating the outer scope in `update()`" — every value here is a
 * `useTransform` derived per mount, not a module-level variable).
 */
export function EclipseSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useSectionScroll(sectionRef)

  const coverage = useTransform(scrollYProgress, [0.15, 0.6], [0, 1])
  const settle = useTransform(scrollYProgress, [0.6, 0.9], [0, 1])

  const nfu = useTransform([coverage, settle], (values) => {
    const [coverageValue, settleValue] = values as number[]
    return Math.max(clamp01((coverageValue - 0.62) / 0.33), clamp01(settleValue * 1.15))
  })

  const scale = useTransform(coverage, [0, 1], [0.08, 1])
  const borderRadius = useTransform(settle, [0, 1], [999, 28])
  const panelOpacity = useTransform(settle, [0.35, 1], [0, 1])
  const boxShadow = useTransform(nfu, (value) => {
    const ringOpacity = 1 - value
    return `0 0 0 2px rgba(26,64,255,${(0.35 * ringOpacity).toFixed(3)}), 0 0 90px 24px rgba(26,64,255,${(0.16 * ringOpacity).toFixed(3)})`
  })

  return (
    <section ref={sectionRef} className="landing-eclipse" data-testid="eclipse-section">
      <motion.div
        className="landing-eclipse__orb"
        data-testid="eclipse-orb"
        aria-hidden="true"
        style={{
          // Locked: flat var(--night), never a gradient.
          background: 'var(--night)',
          scale,
          borderRadius,
          boxShadow: boxShadow as unknown as MotionValue<string>,
        }}
      />
      <motion.div className="landing-eclipse__panel" data-testid="eclipse-panel" style={{ opacity: panelOpacity }}>
        <h2>La noche en que tu operación se puso en piloto automático</h2>
        <p>
          Cuando el sol se pone sobre la última tarea manual del día, Leasefy sigue trabajando:
          agentes AI que califican, concilian y avisan mientras tu equipo descansa.
        </p>
      </motion.div>
    </section>
  )
}
