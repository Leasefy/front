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
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination'
import { useOrdenDeLaTabla } from '@/lib/hooks/use-orden-de-la-tabla'
import { EncabezadoOrdenable } from '@/components/ui/encabezado-ordenable'

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

/**
 * Identidad estable para el caso `breachWindows === null`: el hook de paginado
 * memoiza `pageItems` sobre la lista y un `[]` nuevo por render lo invalidaría.
 */
const SIN_VENTANAS: BreachWindow[] = []

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

  // Cada incumplimiento de SLA agrega una ventana: la lista crece con el
  // tiempo y no tiene tope, así que se pagina.
  // Nico 28-10: «que todas las tablas tengan lo de ordenamiento general y por columnas». Antes de paginar.
  const { ordenadas, orden, ordenarPor } = useOrdenDeLaTabla(
    breachWindows ?? SIN_VENTANAS,
    {
      inicio: (w) => w.startedAt,
      // La que sigue en curso es la más reciente: al ordenar por fin va con las últimas.
      fin: (w) => w.endedAt ?? '9999-12-31',
      duracion: (w) => w.durationMinutes,
      p95: (w) => w.maxP95LatencyMs,
      errores: (w) => w.maxErrorRate,
    },
    { primero: { inicio: 'desc', fin: 'desc', duracion: 'desc', p95: 'desc', errores: 'desc' } },
  )
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(ordenadas, { resetKey: `${orden?.campo ?? ''}|${orden?.sentido ?? ''}` })

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="mb-3 font-mono text-label uppercase tracking-mono-label text-fg-muted">
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
        <>
          <div className="overflow-x-auto">
            <Table className="min-w-full divide-y divide-border">
              <TableHeader className="bg-surface-muted/60">
                <TableRow>
                  <EncabezadoOrdenable campo="inicio" orden={orden} onOrdenar={ordenarPor} className="px-3 py-2 text-left">
                    {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.start')}
                  </EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="fin" orden={orden} onOrdenar={ordenarPor} className="px-3 py-2 text-left">
                    {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.end')}
                  </EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="duracion" orden={orden} onOrdenar={ordenarPor} className="px-3 py-2 text-right" alineacion="derecha">
                    {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.duration')}
                  </EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="p95" orden={orden} onOrdenar={ordenarPor} className="px-3 py-2 text-right" alineacion="derecha">
                    {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.maxP95')}
                  </EncabezadoOrdenable>
                  <EncabezadoOrdenable campo="errores" orden={orden} onOrdenar={ordenarPor} className="px-3 py-2 text-right" alineacion="derecha">
                    {t('inmobiliaria.ai.cotizador.aseguradoras.carrier.sla.breachWindows.cols.maxErrorRate')}
                  </EncabezadoOrdenable>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {pageItems.map((w, idx) => (
                  <TableRow key={idx} className="hover:bg-surface-muted/50 transition-colors">
                    <TableCell className="px-3 py-2.5 text-sm text-fg-muted whitespace-nowrap">
                      {formatDate(w.startedAt)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap">
                      {w.endedAt ? (
                        <span className="text-fg-muted">{formatDate(w.endedAt)}</span>
                      ) : (
                        <span className="text-warning text-caption font-medium">
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

          {/* `-mx-5 px-5` para que la línea del pie corte de lado a lado la
              tarjeta, que ya trae su propio `p-5`. */}
          {shouldPaginate && (
            <div className="-mx-5 mt-3 border-t border-border px-5 pt-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
