'use client'

/**
 * ReportReveal.tsx — el reveal en scroll de las tarjetas del panel.
 *
 * Extiende `src/components/landing/motion/Reveal.tsx` (mismo `whileInView`,
 * misma curva `[0.16,1,0.3,1]`) con lo que el panel necesita y la landing no:
 *   · `data-reveal` para que `report-print.css` lo neutralice — en papel no hay
 *     scroll y una tarjeta «todavía no vista» saldría en blanco;
 *   · `delay` en pasos de 60 ms para el stagger dentro de una fila del bento;
 *   · desplazamiento corto (16 px) y 0.5 s: la referencia es un panel, no una
 *     landing; el motion está pero no se hace notar.
 *
 * Reduced-motion: el MARCADO es el mismo en servidor y cliente (si no, la
 * hidratación deja el `opacity:0` del servidor pegado y el contenido no aparece
 * nunca — medido); lo que cambia es la transición, que pasa a duración 0. Además
 * `ReportMotionConfig` (`reducedMotion="user"`) hace instantáneos los transforms.
 */

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export const REVEAL_EASE = [0.16, 1, 0.3, 1] as const

interface ReportRevealProps {
  children: ReactNode
  className?: string
  /** Índice dentro de la fila: cada paso suma 60 ms. */
  order?: number
  /** Etiqueta HTML del envoltorio (por defecto `div`). */
  as?: 'div' | 'li'
}

export function ReportReveal({ children, className, order = 0, as = 'div' }: ReportRevealProps) {
  const reduced = useReducedMotion()
  const MotionTag = as === 'li' ? motion.li : motion.div

  return (
    <MotionTag
      className={className}
      data-reveal=""
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.5, delay: order * 0.06, ease: [...REVEAL_EASE] }
      }
    >
      {children}
    </MotionTag>
  )
}
