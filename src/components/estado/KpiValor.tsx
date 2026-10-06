'use client'

/**
 * El número de un tile de resumen, con los cuatro estados adentro.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 * Los tiles de Agenda, Inmuebles, Inquilinos y Pipeline se pintaban FUERA del
 * `EstadoDeDatos` de su tabla: con el back caído la tabla decía «no se pudo
 * cargar» y, un renglón arriba, los tiles afirmaban «0 visitas · 0 firmas ·
 * $0». Un cero es un dato; «no sé» no es cero. Y mientras carga, un «0» que
 * después salta a «37» enseña a desconfiar de la pantalla.
 *
 *   cargando → un hueco del mismo alto (no un 0 que después cambia)
 *   falló    → «—» con «No se pudo traer» para el lector de pantalla y el tooltip
 *   ok       → el valor
 *
 * Va DENTRO del tile existente (en su prop `value`), para no rehacer los
 * tiles de cada pantalla: cada una ya tiene su propio diseño.
 *
 * Movimiento (sistema de Cadence): cuando el valor llega DESPUÉS de cargar
 * (o de fallar), entra con un fundido y, si es un número, cuenta desde 0 con
 * `AnimatedNumber` (`reveal`, 500 ms); si después cambia, cuenta desde el
 * anterior. Lo que ya estaba al montarse no se anima. El texto final es el
 * mismo que antes (sin separador de miles agregado). Con movimiento reducido
 * salta al valor.
 */

import { useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AnimatedNumber, enterTransition, usePrefersReducedMotion } from '@leasefy/cadence'
import { cn } from '@/lib/utils'

export interface KpiValorProps {
  cargando: boolean
  /** El error entero (o cualquier cosa verdadera) si la carga falló. */
  fallo?: unknown
  children: ReactNode
  className?: string
}

export const KPI_SIN_DATO = '—'

/** Escribe un paso del conteo con los mismos decimales que el valor final. */
function formatoComoElValor(valor: number): (n: number) => string {
  const decimales = Math.min((String(valor).split('.')[1] ?? '').length, 6)
  return (n) => n.toFixed(decimales)
}

export function KpiValor({ cargando, fallo, children, className }: KpiValorProps) {
  const reducido = usePrefersReducedMotion()
  const estado = cargando ? 'cargando' : fallo ? 'fallo' : 'ok'
  const primerEstado = useRef(estado)
  const yaCambio = useRef(false)
  if (estado !== primerEstado.current) yaCambio.current = true
  const entra = yaCambio.current
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: enterTransition(reducido) }
    : { initial: false as const }

  if (cargando) {
    return (
      <span
        className={cn('inline-block h-[1em] w-12 animate-pulse rounded bg-surface-muted align-middle', className)}
        data-testid="kpi-valor"
        data-estado="cargando"
        aria-busy="true"
        aria-label="Cargando"
      />
    )
  }
  if (fallo) {
    return (
      <motion.span
        key="fallo"
        {...entra}
        className={cn('text-fg-subtle', className)}
        data-testid="kpi-valor"
        data-estado="fallo"
        title="No se pudo traer este dato"
      >
        <span aria-hidden="true">{KPI_SIN_DATO}</span>
        <span className="sr-only">No se pudo traer este dato</span>
      </motion.span>
    )
  }
  const esCifra = typeof children === 'number' && Number.isFinite(children)
  return (
    <motion.span key="ok" {...entra} className={className} data-testid="kpi-valor" data-estado="ok">
      {esCifra ? (
        <AnimatedNumber
          value={children}
          from={yaCambio.current ? 0 : undefined}
          format={formatoComoElValor(children)}
        />
      ) : (
        children
      )}
    </motion.span>
  )
}
