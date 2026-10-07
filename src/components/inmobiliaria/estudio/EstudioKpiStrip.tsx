'use client'

/**
 * EstudioKpiStrip — estudio de inquilino (overview/Sala).
 *
 * Espejo de CobranzaKpiStrip: tira de KPIs sobre el AgentOverviewResponse.kpis
 * (OverviewKpi[] {id,label,value,format}). format: number | percent (fracción 0..1) | cop.
 */

import type { OverviewKpi } from '@/lib/api/agent-workspace'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { AnimatedNumber, CrossFade, Stagger, StaggerItem } from '@leasefy/cadence'

export interface EstudioKpiStripProps {
  kpis: OverviewKpi[] | null | undefined
  isLoading?: boolean
  className?: string
}

export function EstudioKpiStrip({ kpis, isLoading, className }: EstudioKpiStripProps) {
  const { formatCurrency } = useI18n()

  const fmt = (k: OverviewKpi): string => {
    if (k.format === 'cop') return formatCurrency(k.value)
    if (k.format === 'percent') return `${Math.round(k.value * 100)}%`
    return k.value.toLocaleString('es-CO')
  }

  const items = kpis ?? []

  // Movimiento: esqueleto → cifras en un `CrossFade` (el mismo nodo en las dos
  // ramas); las tarjetas entran escalonadas y cada cifra cuenta desde 0.
  if (isLoading && items.length === 0) {
    return (
      <CrossFade swapKey="cargando">
      <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="h-3 w-20 rounded bg-surface-muted animate-pulse" />
            <div className="mt-3 h-6 w-16 rounded bg-surface-muted animate-pulse" />
          </div>
        ))}
      </div>
      </CrossFade>
    )
  }

  if (items.length === 0) return null

  return (
    <CrossFade swapKey="cifras">
    <Stagger className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)} data-testid="estudio-kpi-strip">
      {items.map((k) => (
        <StaggerItem
          key={k.id}
          className="rounded-lg border border-border bg-card p-4"
        >
          <p className="text-xs font-medium text-fg-muted truncate">{k.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-fg tabular-nums">
            <AnimatedNumber value={k.value} from={0} format={(n) => fmt({ ...k, value: n })} />
          </p>
        </StaggerItem>
      ))}
    </Stagger>
    </CrossFade>
  )
}
