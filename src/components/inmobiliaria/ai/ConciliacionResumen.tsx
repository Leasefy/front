'use client'

/**
 * ConciliacionResumen — surfaces the REAL server-side conciliación summary
 * (GET …/conciliacion/summary) inside the Sala + Analítica pages.
 *
 * - Totales (movimientos · conciliados · en cola · monto conciliado) + tasa.
 * - Taxonomía de excepciones (parciales · duplicados · diferencias de monto ·
 *   fuera de fecha · sin identificar).
 *
 * FAIL-SOFT: the backend route may not be deployed (404) or DB may be in stub
 * mode. When `data` is null this component renders NOTHING — the host page keeps
 * its existing fallback (EmptyState / zeros). It never shows an error banner of
 * its own; the host owns the page-level empty/error states.
 */

import type { ConciliacionSummaryResponse } from '@/lib/hooks/conciliacion/use-conciliacion-summary'

const numberFormatter = new Intl.NumberFormat('es-CO')
const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** tasa_conciliacion is already 0–100 (one decimal) or null. */
function formatTasa(tasa: number | null): string {
  if (tasa === null) return '—'
  return `${numberFormatter.format(tasa)} %`
}

export interface ConciliacionResumenProps {
  data: ConciliacionSummaryResponse | null
  isLoading?: boolean
  /** Optional loading skeleton (off by default — host already shows its own). */
  showSkeleton?: boolean
}

export function ConciliacionResumen({ data, isLoading, showSkeleton }: ConciliacionResumenProps) {
  if (isLoading && showSkeleton) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="conciliacion-resumen-loading">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  // FAIL-SOFT: no summary → render nothing, host keeps its fallback.
  if (!data) return null

  const { totals, taxonomy, tasa_conciliacion } = data

  const totalCards: { id: string; label: string; value: string }[] = [
    { id: 'movimientos', label: 'Movimientos', value: numberFormatter.format(totals.movimientos) },
    { id: 'conciliados', label: 'Conciliados', value: numberFormatter.format(totals.conciliados) },
    { id: 'en_cola', label: 'En cola', value: numberFormatter.format(totals.en_cola) },
    { id: 'tasa', label: 'Tasa de conciliación', value: formatTasa(tasa_conciliacion) },
  ]

  const taxonomyItems: { id: string; label: string; value: number }[] = [
    { id: 'parciales', label: 'Parciales', value: taxonomy.parciales },
    { id: 'duplicados', label: 'Duplicados', value: taxonomy.duplicados },
    { id: 'diferencias_monto', label: 'Diferencias de monto', value: taxonomy.diferencias_monto },
    { id: 'fuera_de_fecha', label: 'Fuera de fecha', value: taxonomy.fuera_de_fecha },
    { id: 'sin_identificar', label: 'Sin identificar', value: taxonomy.sin_identificar },
  ]

  const taxonomyTotal = taxonomyItems.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-6" data-testid="conciliacion-resumen">
      {/* Totales + tasa */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="conciliacion-resumen-totales">
        {totalCards.map((card) => (
          <div
            key={card.id}
            className="rounded-xl border border-border bg-card p-4"
            data-testid={`conciliacion-total-${card.id}`}
          >
            <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
            <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Monto conciliado */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground leading-tight">Monto conciliado</p>
        <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">
          {copFormatter.format(totals.monto_conciliado_cop)}
        </p>
      </div>

      {/* Taxonomía de excepciones */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3" data-testid="conciliacion-taxonomia">
        <h2 className="text-sm font-semibold text-foreground">Excepciones por tipo</h2>
        {taxonomyTotal === 0 ? (
          <p className="text-xs text-muted-foreground">Sin excepciones por revisar.</p>
        ) : (
          <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {taxonomyItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg bg-muted/50 px-3 py-2.5"
                data-testid={`conciliacion-taxonomia-${item.id}`}
              >
                <dt className="text-[11px] text-muted-foreground leading-tight">{item.label}</dt>
                <dd className="text-lg font-semibold text-foreground mt-0.5 tabular-nums">
                  {numberFormatter.format(item.value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  )
}
