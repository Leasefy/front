'use client'

/**
 * /conciliacion/cola — «Por revisar»: la cola humana de la conciliación.
 *
 * Cableada a los endpoints reales de Build C (NO al adaptador de work-items —
 * el bulk-confirm opera sobre ids de ReconciliationMatch que la cola unificada
 * no expone):
 *
 *   GET  /api/agency/{id}/conciliacion/queue?caseType=…        (lista, filtrada)
 *   POST /api/agency/{id}/conciliacion/queue/bulk-confirm      (lote)
 *   POST /api/agency/{id}/conciliacion/queue/{matchId}/confirm (aprobar una)
 *   POST /api/agency/{id}/conciliacion/queue/{matchId}/reject  (rechazar una)
 *
 * ── Qué cambió y por qué (Nico, 2026-09-03) ─────────────────────────────────
 * Esto eran tarjetas apiladas con un KPI suelto «0 Pendientes» al lado del
 * título: ni se leía como las demás listas del panel ni tenía paginación. Ahora
 * es la tabla estándar —filtros dentro de la misma tarjeta, vacío dentro del
 * cuerpo para que los encabezados sigan a la vista, pie con paginación— y el
 * KPI suelto se fue: el pie de la tabla ya dice cuántos hay, y la Sala también.
 *
 * FAIL-SOFT (regla de oro): el backend puede no estar desplegado → el GET puede
 * fallar. Se muestra el fallo con reintento, nunca un «no hay nada» que sería
 * mentira sobre plata. Una acción que falla avisa por toast y deja la fila.
 */

import { useMemo, useState } from 'react'
import { toast } from '@/components/ui/toast'
import { CheckCircle, ShieldCheck, XCircle } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { Chip } from '@leasefy/cadence'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import {
  useConciliacionQueue,
  type ConciliacionQueueItem,
  type ConciliacionCaseType,
} from '@/lib/hooks/conciliacion/use-conciliacion-queue'
import {
  useConciliacionBulk,
  BULK_CONFIRM_HIGH_CONFIDENCE_FLOOR,
} from '@/lib/hooks/conciliacion/use-conciliacion-bulk'

// ── Taxonomía de excepciones (los 7 caseTypes, set cerrado) ──────────────────
// Copy en español literal (contrato §9 — ES-first, sin keys t() nuevas).

type CaseTypeFilter = ConciliacionCaseType | 'todos'

const CASE_TYPE_FILTERS: ReadonlyArray<{ value: CaseTypeFilter; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'parcial', label: 'Pago parcial' },
  { value: 'duplicado', label: 'Duplicado' },
  { value: 'diferencia_monto', label: 'Diferencia de monto' },
  { value: 'fuera_de_fecha', label: 'Fuera de fecha' },
  { value: 'sin_identificar', label: 'Sin identificar' },
  { value: 'multiple', label: 'Múltiple' },
  { value: 'comision', label: 'Comisión' },
]

const CASE_TYPE_LABEL: Record<string, string> = {
  parcial: 'Pago parcial',
  duplicado: 'Duplicado',
  diferencia_monto: 'Diferencia de monto',
  fuera_de_fecha: 'Fuera de fecha',
  sin_identificar: 'Sin identificar',
  multiple: 'Múltiple',
  comision: 'Comisión',
}

/** Tono del badge por tipo de caso (tokens del DS, cero hex). */
const CASE_TYPE_PILL: Record<string, string> = {
  parcial: 'bg-warning/10 text-warning',
  duplicado: 'bg-surface-muted text-fg-muted',
  diferencia_monto: 'bg-danger/10 text-danger',
  fuera_de_fecha: 'bg-surface-muted text-fg-muted',
  sin_identificar: 'bg-surface-muted text-fg-muted',
  multiple: 'bg-warning/10 text-warning',
  comision: 'bg-surface-muted text-fg-muted',
}

const COLUMNAS = [
  'Fecha',
  'Movimiento',
  'Monto',
  'Tipo',
  'Sugerencia del agente',
  'Acciones',
] as const

// ── Formato ──────────────────────────────────────────────────────────────────

function fmtCop(val: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

/** Un cruce sugerido en o por encima del piso de alta confianza → va al lote. */
function isBulkEligible(item: ConciliacionQueueItem): boolean {
  return item.status === 'suggested' && item.confidenceScore >= BULK_CONFIRM_HIGH_CONFIDENCE_FLOOR
}

// ── Página ───────────────────────────────────────────────────────────────────

function ConciliacionCola() {
  const { t } = useI18n()

  const [caseFilter, setCaseFilter] = useState<CaseTypeFilter>('todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // T-323: confirmar-antes-de-aplicar. El lote pide un SEGUNDO clic humano: el
  // primero arma la confirmación, el segundo ejecuta.
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  /** Fila con una acción en vuelo (aprobar / rechazar). */
  const [busyRow, setBusyRow] = useState<string | null>(null)
  /** Fila cuyo rechazo está pidiendo motivo. */
  const [rechazando, setRechazando] = useState<ConciliacionQueueItem | null>(null)
  const [motivo, setMotivo] = useState('')

  const queueFilters = useMemo(
    () => ({
      status: 'suggested' as const,
      ...(caseFilter !== 'todos' ? { caseType: caseFilter } : {}),
      pageSize: 100,
    }),
    [caseFilter],
  )

  const { items, isLoading, error, refetch, confirmMatch, rejectMatch } =
    useConciliacionQueue(queueFilters)
  const { bulkConfirmByIds } = useConciliacionBulk()

  // El recorte es de presentación: el filtro ya viajó al backend, así que el
  // `resetKey` es el propio filtro — cambiarlo vuelve a la página 1.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(items, { resetKey: caseFilter })

  const eligibleItems = useMemo(() => items.filter(isBulkEligible), [items])
  const eligibleIds = useMemo(() => eligibleItems.map((i) => i.id), [eligibleItems])

  // Sólo cuentan las selecciones que siguen existiendo y siendo elegibles
  // (seguridad post-refetch).
  const selectedEligible = useMemo(
    () => eligibleIds.filter((id) => selected.has(id)),
    [eligibleIds, selected],
  )
  const allEligibleSelected = eligibleIds.length > 0 && selectedEligible.length === eligibleIds.length
  const someEligibleSelected = selectedEligible.length > 0 && !allEligibleSelected

  function toggleOne(id: string) {
    setArmed(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setArmed(false)
    setSelected((prev) => {
      if (eligibleIds.every((id) => prev.has(id))) return new Set()
      return new Set(eligibleIds)
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setArmed(false)
  }

  async function runBulkConfirm() {
    const ids = selectedEligible
    if (ids.length === 0) return
    setBusy(true)
    const result = await bulkConfirmByIds(ids)
    setBusy(false)
    setArmed(false)

    if (!result.ok) {
      toast.error(
        result.error === 'not_configured'
          ? 'No se pudo confirmar: servicio no configurado.'
          : `No se pudo confirmar la selección (${result.error ?? 'error'}).`,
      )
      return
    }

    if (result.fallidos.length === 0) {
      toast.success(
        result.confirmados === 1 ? '1 cruce confirmado.' : `${result.confirmados} cruces confirmados.`,
      )
    } else {
      toast.warning(`${result.confirmados} confirmados · ${result.fallidos.length} con error.`)
    }
    clearSelection()
    await refetch()
  }

  /** Aprobar una fila — el hook recarga la cola al terminar. */
  async function aprobar(item: ConciliacionQueueItem) {
    setBusyRow(item.id)
    const res = await confirmMatch(item.id)
    setBusyRow(null)
    if (res.ok) toast.success('Cruce aprobado.')
    else toast.error(`No se pudo aprobar el cruce (${res.error ?? 'error'}).`)
  }

  /** Rechazar pide motivo: el backend lo exige y queda en la auditoría. */
  async function rechazar() {
    const item = rechazando
    const razon = motivo.trim()
    if (!item || razon.length < 5) return
    setBusyRow(item.id)
    const res = await rejectMatch(item.id, razon)
    setBusyRow(null)
    setRechazando(null)
    setMotivo('')
    if (res.ok) toast.success('Cruce rechazado.')
    else toast.error(`No se pudo rechazar el cruce (${res.error ?? 'error'}).`)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Encabezado — el conteo lo dice el pie de la tabla, no un KPI suelto. */}
      <header className="space-y-2">
        <h1 className="text-h2 text-fg">
          {t('inmobiliaria.ai.workspace.pages.conciliacion.colaTitle')}
        </h1>
        <p className="text-body text-fg-muted max-w-2xl">
          {t('inmobiliaria.ai.workspace.pages.conciliacion.colaDesc')}
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* Filtros — dentro de la tarjeta, encima de la tabla. */}
        <div
          className="flex flex-wrap items-center gap-2 border-b border-border p-4"
          role="group"
          aria-label="Filtrar por tipo de caso"
        >
          {CASE_TYPE_FILTERS.map((f) => (
            <Chip
              key={f.value}
              selected={caseFilter === f.value}
              onClick={() => {
                setCaseFilter(f.value)
                clearSelection()
              }}
            >
              {f.label}
            </Chip>
          ))}
        </div>

        {/* Lote de alta confianza — sólo aparece si hay cruces elegibles. */}
        {!isLoading && !error && eligibleIds.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-border bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-body-sm text-fg">
              <Checkbox
                checked={allEligibleSelected}
                indeterminate={someEligibleSelected}
                onCheckedChange={toggleAll}
                aria-label="Seleccionar todos los cruces de alta confianza"
              />
              <span>
                {selectedEligible.length > 0
                  ? `${selectedEligible.length} seleccionado${selectedEligible.length === 1 ? '' : 's'} de ${eligibleIds.length} de alta confianza`
                  : `Seleccionar los ${eligibleIds.length} de alta confianza (≥${Math.round(BULK_CONFIRM_HIGH_CONFIDENCE_FLOOR * 100)}%)`}
              </span>
            </label>

            <div className="flex items-center gap-2">
              {selectedEligible.length > 0 && !armed && (
                <Button variant="ghost" size="sm" hideArrow onClick={clearSelection} disabled={busy}>
                  Limpiar
                </Button>
              )}
              {armed ? (
                <>
                  <span className="text-caption text-fg-muted">¿Confirmar {selectedEligible.length}?</span>
                  <Button variant="secondary" size="sm" hideArrow onClick={() => setArmed(false)} disabled={busy}>
                    Cancelar
                  </Button>
                  <Button size="sm" hideArrow isLoading={busy} onClick={() => void runBulkConfirm()}>
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Sí, confirmar
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  hideArrow
                  disabled={selectedEligible.length === 0 || busy}
                  onClick={() => setArmed(true)}
                >
                  <CheckCircle className="size-4" aria-hidden="true" />
                  Confirmar seleccionados
                  {selectedEligible.length > 0 ? ` (${selectedEligible.length})` : ''}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Carga y fallo por fuera del cuerpo; el vacío va DENTRO, para que los
            encabezados de la tabla se sigan viendo. */}
        <EstadoDeDatos
          cargando={isLoading}
          error={error}
          queEs="la cola de conciliación"
          onReintentar={() => void refetch()}
          esqueleto={
            <div className="flex items-center justify-center py-16" data-testid="conciliacion-cola-loading">
              <Spinner />
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" aria-label="Seleccionar" />
                {COLUMNAS.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNAS.length + 1} className="p-0">
                    <SinDatos
                      hayFiltros={caseFilter !== 'todos'}
                      queSon="casos"
                      icono={CheckCircle}
                      titulo="Nada por revisar"
                      descripcion={t('inmobiliaria.ai.workspace.pages.conciliacion.colaEmptyHint')}
                      crear={{
                        label: t('inmobiliaria.ai.workspace.pages.conciliacion.accionTitle'),
                        href: '/panel/inmobiliaria/conciliacion/movimientos',
                      }}
                      onLimpiarFiltros={() => {
                        setCaseFilter('todos')
                        clearSelection()
                      }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((item) => {
                  const elegible = isBulkEligible(item)
                  const pct = Math.round((item.confidenceScore ?? 0) * 100)
                  const caso = item.caseType ?? null
                  const filaOcupada = busyRow === item.id
                  return (
                    <TableRow
                      key={item.id}
                      className={cn(filaOcupada && 'opacity-60')}
                      data-testid={`conciliacion-row-${item.id}`}
                    >
                      <TableCell className="w-10">
                        <Checkbox
                          checked={elegible && selected.has(item.id)}
                          disabled={!elegible}
                          onCheckedChange={() => toggleOne(item.id)}
                          aria-label={
                            elegible
                              ? 'Seleccionar para confirmar'
                              : 'No elegible para confirmación masiva'
                          }
                        />
                      </TableCell>

                      <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                        {fmtDate(item.movement.valueDate)}
                      </TableCell>

                      <TableCell className="max-w-[280px]">
                        <p className="truncate font-medium text-fg">
                          {item.movement.description?.trim() || 'Movimiento sin descripción'}
                        </p>
                        {item.movement.reference && (
                          <p className="truncate text-caption text-fg-muted">
                            Ref. {item.movement.reference}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap tabular-nums text-fg">
                        {fmtCop(item.movement.amountCop)}
                        {item.matchedAmountCop !== item.movement.amountCop && (
                          <span className="block text-caption text-fg-muted">
                            Cruzado: {fmtCop(item.matchedAmountCop)}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {caso ? (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
                              CASE_TYPE_PILL[caso] ?? 'bg-surface-muted text-fg-muted',
                            )}
                          >
                            {CASE_TYPE_LABEL[caso] ?? caso}
                          </span>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </TableCell>

                      {/* Lo que propone el agente: contra qué contrato cruzó y
                          con cuánta confianza. El backend no devuelve el cobro
                          ni el inmueble, así que no se enlaza lo que no hay. */}
                      <TableCell className="max-w-[220px]">
                        <p className="truncate text-fg" title={item.domain}>
                          {item.domain || 'Sin cruce sugerido'}
                        </p>
                        <p
                          className={cn(
                            'text-caption tabular-nums',
                            elegible ? 'text-success' : 'text-fg-muted',
                          )}
                        >
                          {pct}% de confianza
                        </p>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            hideArrow
                            disabled={filaOcupada || busy}
                            onClick={() => void aprobar(item)}
                            aria-label={`Aprobar el cruce de ${item.movement.description ?? item.domain}`}
                          >
                            <CheckCircle className="size-4" aria-hidden="true" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            hideArrow
                            disabled={filaOcupada || busy}
                            onClick={() => {
                              setRechazando(item)
                              setMotivo('')
                            }}
                            aria-label={`Rechazar el cruce de ${item.movement.description ?? item.domain}`}
                          >
                            <XCircle className="size-4" aria-hidden="true" />
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
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
        </EstadoDeDatos>
      </section>

      {/* Rechazar pide motivo (obligatorio en el backend, queda en auditoría). */}
      <Dialog
        open={rechazando !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setRechazando(null)
            setMotivo('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar el cruce</DialogTitle>
            <DialogDescription>
              {rechazando
                ? `«${rechazando.movement.description?.trim() || 'Movimiento sin descripción'}». `
                : ''}
              El movimiento vuelve a quedar sin identificar y el motivo queda registrado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-6 py-4">
            <Textarea
              id="motivo-rechazo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="No es el pago de ese contrato."
              rows={3}
              maxLength={300}
              aria-label="Motivo del rechazo"
            />
            <p className="text-caption text-fg-muted">Entre 5 y 300 caracteres.</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              hideArrow
              onClick={() => {
                setRechazando(null)
                setMotivo('')
              }}
            >
              Cancelar
            </Button>
            <Button
              hideArrow
              variant="destructive"
              disabled={motivo.trim().length < 5 || busyRow !== null}
              onClick={() => void rechazar()}
              data-testid="conciliacion-confirmar-rechazo"
            >
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ConciliacionColaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionCola />
    </PageGuard>
  )
}
