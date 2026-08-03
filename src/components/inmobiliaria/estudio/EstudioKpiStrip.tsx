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

  if (isLoading && items.length === 0) {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="h-3 w-20 rounded bg-surface-muted animate-pulse" />
            <div className="mt-3 h-6 w-16 rounded bg-surface-muted animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)} data-testid="estudio-kpi-strip">
      {items.map((k) => (
        <div
          key={k.id}
          className="rounded-xl border border-border bg-card p-4"
        >
          <p className="text-xs font-medium text-fg-muted truncate">{k.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-fg tabular-nums">
            {fmt(k)}
          </p>
        </div>
      ))}
    </div>
  )
}
