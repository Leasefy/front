'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Appear, motionStagger } from '@leasefy/cadence'

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
 *
 * Movimiento (03-10-2026): es el `Appear inView` de Cadence —sube 24 px
 * (`lg`, el mismo viaje que los revelados de la home) en `reveal` (500 ms)
 * con la curva de entrada—. El `delay` que llega (los llamadores pasan
 * «índice × 0,1») se topa en `motionStagger.max`: la tarjeta 20 del blog ya
 * no espera 1,6 s.
 */
/** `false` en el servidor y mientras React hidrata; `true` después (y en un montaje en el cliente). */
const sinSuscripcion = () => () => {}
function useYaHidrato(): boolean {
  return useSyncExternalStore(sinSuscripcion, () => true, () => false)
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const prefersReducedMotion = useReducedMotion()
  // Hidratación (MOV-VERIFICA 03-10-2026): el servidor no sabe de movimiento
  // reducido y pinta el `Appear` (opacidad 0). Si el cliente pintara el `div`
  // pelado ya al hidratar, React no corrige el `style` del servidor y la
  // tarjeta queda invisible para siempre. Por eso el `div` final llega recién
  // después de hidratar.
  const yaHidrato = useYaHidrato()

  if (prefersReducedMotion && yaHidrato) {
    return <div className={className}>{children}</div>
  }

  return (
    <Appear
      inView
      distance="lg"
      duration="reveal"
      delay={Math.min(delay, motionStagger.max)}
      className={className}
    >
      {children}
    </Appear>
  )
}
