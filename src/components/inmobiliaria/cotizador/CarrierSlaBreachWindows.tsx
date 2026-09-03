'use client'

/**
 * CarrierSlaBreachWindows.tsx — Phase 35 plan 35-08 (Task 3)
 *
 * Table of SLA breach windows: start, end, duration, max P95 latency, max error rate.
 * "endedAt = null" means the breach is ongoing (amber "En curso" indicator).
 */

import { useI18n } from '@/lib/i18n'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

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
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted mb-3">
        {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.title')}
      </p>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded bg-surface-muted animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!breachWindows || breachWindows.length === 0) && (
        <p className="text-sm text-fg-muted text-center py-6">
          {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.empty')}
        </p>
      )}

      {!isLoading && breachWindows && breachWindows.length > 0 && (
        <div className="overflow-x-auto">
          <Table className="min-w-full divide-y divide-border">
            <TableHeader className="bg-surface-muted/60">
              <TableRow>
                <TableHead className="px-3 py-2 text-left">
                  {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.start')}
                </TableHead>
                <TableHead className="px-3 py-2 text-left">
                  {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.end')}
                </TableHead>
                <TableHead className="px-3 py-2 text-right">
                  {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.duration')}
                </TableHead>
                <TableHead className="px-3 py-2 text-right">
                  {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.maxP95')}
                </TableHead>
                <TableHead className="px-3 py-2 text-right">
                  {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.maxErrorRate')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {breachWindows.map((w, idx) => (
                <TableRow key={idx} className="hover:bg-surface-muted/50 transition-colors">
                  <TableCell className="px-3 py-2.5 text-sm text-fg-muted whitespace-nowrap">
                    {formatDate(w.startedAt)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap">
                    {w.endedAt ? (
                      <span className="text-fg-muted">{formatDate(w.endedAt)}</span>
                    ) : (
                      <span className="text-warning text-xs font-medium">
                        {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.ongoing')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-fg-muted text-right font-mono tabular-nums whitespace-nowrap">
                    {formatDuration(w.durationMinutes)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-fg-muted text-right font-mono tabular-nums whitespace-nowrap">
                    {w.maxP95LatencyMs}ms
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-fg-muted text-right font-mono tabular-nums whitespace-nowrap">
                    {(w.maxErrorRate * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
