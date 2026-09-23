'use client'

/**
 * El anillo de un proceso: cuánto va (si se sabe), girando (si no), o el
 * ícono de cómo terminó. Lo usan la fila del centro y el botón del header.
 */

import { CheckCircle, Prohibit, WarningCircle } from '@phosphor-icons/react'

import type { EstadoDeProceso } from '@/lib/api/procesos.types'
import { cn } from '@/lib/utils'

const RADIO = 9
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

export function AnilloDeAvance({
  estado,
  porcentaje,
  tamano = 22,
  className,
}: {
  estado: EstadoDeProceso
  porcentaje: number | null
  tamano?: number
  className?: string
}) {
  if (estado === 'TERMINADO') {
    return <CheckCircle weight="fill" className={cn('text-success', className)} style={{ width: tamano, height: tamano }} aria-hidden="true" />
  }
  if (estado === 'FALLO') {
    return <WarningCircle weight="fill" className={cn('text-danger', className)} style={{ width: tamano, height: tamano }} aria-hidden="true" />
  }
  if (estado === 'CANCELADO') {
    return <Prohibit className={cn('text-fg-subtle', className)} style={{ width: tamano, height: tamano }} aria-hidden="true" />
  }
  const sabido = porcentaje != null
  const trazo = sabido ? CIRCUNFERENCIA * (1 - Math.min(100, Math.max(0, porcentaje)) / 100) : CIRCUNFERENCIA * 0.72
  return (
    <svg
      viewBox="0 0 22 22"
      width={tamano}
      height={tamano}
      className={cn(!sabido && 'motion-safe:animate-spin', className)}
      aria-hidden="true"
      data-testid="anillo-de-avance"
    >
      <circle cx="11" cy="11" r={RADIO} fill="none" strokeWidth="2.5" className="stroke-border" />
      <circle
        cx="11"
        cy="11"
        r={RADIO}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={cn(estado === 'EN_COLA' ? 'stroke-fg-subtle' : 'stroke-primary', 'transition-[stroke-dashoffset] duration-500')}
        strokeDasharray={CIRCUNFERENCIA}
        strokeDashoffset={trazo}
        transform="rotate(-90 11 11)"
      />
    </svg>
  )
}
