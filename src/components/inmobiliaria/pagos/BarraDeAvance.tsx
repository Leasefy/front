'use client'

import { motion } from 'framer-motion'
import { motionDuration, motionEase } from '@leasefy/cadence'

import { cn } from '@/lib/utils'

export interface BarraDeAvanceProps {
  /** Cuánto se llena: el `anchoDeBarra(…)` de siempre ('43.6%') o un número de 0 a 100. */
  ancho: string | number
  /** El color (y el redondeo) del relleno. El riel lo pone quien la usa, con `overflow-hidden`. */
  className?: string
  /**
   * ¿Crece desde cero al montarse? Por defecto sí: la barra llega con la cifra
   * que acaba de cargar (como `KpiValor`). Después, cada cambio corre desde
   * donde estaba.
   */
  desdeCero?: boolean
  'data-testid'?: string
}

/**
 * El relleno de una barra de avance de Pagos (tasa de recaudo, dispersiones
 * giradas, la comisión sobre el canon) — movimiento ola 2, 03-10-2026.
 *
 * Antes las barras animaban el `width` (y las compactas tenían `transition-all`
 * sobre el ancho): cada cuadro recalculaba el layout. Ahora el relleno ocupa el
 * riel entero y se corre con `translateX` (sólo `transform`), con la curva de
 * entrada y la duración de los revelados. El extremo derecho conserva su
 * redondeo: no se estira como con `scaleX`. Con movimiento reducido, el
 * `MotionProvider` del layout la deja en su lugar sin desplazarla.
 */
export function BarraDeAvance({ ancho, className, desdeCero = true, ...rest }: BarraDeAvanceProps) {
  const numero = typeof ancho === 'number' ? ancho : Number.parseFloat(ancho)
  const lleno = Number.isFinite(numero) ? Math.min(100, Math.max(0, numero)) : 0
  return (
    <motion.div
      initial={desdeCero ? { x: '-100%' } : false}
      animate={{ x: `${lleno - 100}%` }}
      transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
      className={cn('h-full w-full rounded-full', className)}
      data-lleno={lleno}
      {...rest}
    />
  )
}
