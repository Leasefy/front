'use client'

/**
 * CarrierSlaBreachWindows.tsx — Phase 35 plan 35-08 (Task 3)
 *
 * Table of SLA breach windows: start, end, duration, max P95 latency, max error rate.
 * "endedAt = null" means the breach is ongoing (amber "En curso" indicator).
 */

import { useI18n } from '@/lib/i18n'

// =============================================================================
// Types
// =============================================================================

interface BreachWindow {
  startedAt: string
  endedAt: string | null
  durationMinutes: number | null
  maxP95LatencyMs: number
  maxErrorRate: number
}

interface CarrierSlaBreachWindowsProps {
  breachWindows: BreachWindow[] | null
  isLoading?: boolean
}

// =============================================================================
// Helpers
// =============================================================================

function formatDuration(minutes: number | null): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// =============================================================================
// Component
// =============================================================================

export function CarrierSlaBreachWindows({
  breachWindows,
  isLoading = false,
}: CarrierSlaBreachWindowsProps) {
  const { t } = useI18n()

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
      <p className="text-xs font-mono uppercase tracking-wide text-neutral-500 mb-3">
        {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.title')}
      </p>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!breachWindows || breachWindows.length === 0) && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-6">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.empty')}
        </p>
      )}

      {!isLoading && breachWindows && breachWindows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left">
                  {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.start')}
                </th>
                <th className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wide text-left">
                  {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.end')}
                </th>
                <th className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wide text-right">
                  {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.duration')}
                </th>
                <th className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wide text-right">
                  {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.maxP95')}
                </th>
                <th className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wide text-right">
                  {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.maxErrorRate')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {breachWindows.map((w, idx) => (
                <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-3 py-2.5 text-sm text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                    {formatDate(w.startedAt)}
                  </td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                    {w.endedAt ? (
                      <span className="text-neutral-600 dark:text-neutral-300">{formatDate(w.endedAt)}</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
                        {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.ongoing')}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-neutral-600 dark:text-neutral-300 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatDuration(w.durationMinutes)}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-neutral-600 dark:text-neutral-300 text-right font-mono tabular-nums whitespace-nowrap">
                    {w.maxP95LatencyMs}ms
                  </td>
                  <td className="px-3 py-2.5 text-sm text-neutral-600 dark:text-neutral-300 text-right font-mono tabular-nums whitespace-nowrap">
                    {(w.maxErrorRate * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
