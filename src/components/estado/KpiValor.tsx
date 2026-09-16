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
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface KpiValorProps {
  cargando: boolean
  /** El error entero (o cualquier cosa verdadera) si la carga falló. */
  fallo?: unknown
  children: ReactNode
  className?: string
}

export const KPI_SIN_DATO = '—'

export function KpiValor({ cargando, fallo, children, className }: KpiValorProps) {
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
      <span
        className={cn('text-fg-subtle', className)}
        data-testid="kpi-valor"
        data-estado="fallo"
        title="No se pudo traer este dato"
      >
        <span aria-hidden="true">{KPI_SIN_DATO}</span>
        <span className="sr-only">No se pudo traer este dato</span>
      </span>
    )
  }
  return (
    <span className={className} data-testid="kpi-valor" data-estado="ok">
      {children}
    </span>
  )
}
