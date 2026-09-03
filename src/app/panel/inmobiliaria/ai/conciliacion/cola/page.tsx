'use client'

/**
 * /ai/conciliacion/cola — "Por revisar": the Conciliación human review queue.
 *
 * Wired to the real Build C reconciliation endpoints (NOT the work-items adapter
 * — bulk-confirm operates on ReconciliationMatch ids that the unified queue does
 * not surface):
 *
 *   GET  /api/agency/{id}/conciliacion/queue?caseType=…   (list, filtered)
 *   POST /api/agency/{id}/conciliacion/queue/bulk-confirm  (batch confirm)
 *   POST /api/agency/{id}/conciliacion/queue/{matchId}/confirm  (single)
 *
 * Operator experience:
 *   (1) Filter by exception taxonomy (7 caseTypes) via a Chip filter row.
 *   (2) Multi-select high-confidence suggested matches + "Confirmar seleccionados"
 *       (bulk-confirm) with an explicit human confirm step (T-323) + result toast.
 *
 * FAIL-SOFT (regla de oro): the Build C backend may not be deployed → the queue
 * GET can 404. Every fetch degrades to the existing EmptyState / empty list,
 * never breaks. A confirm action that fails toasts honestly and leaves the row.
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Bank, CheckCircle, ShieldCheck } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Chip } from '@leasefy/cadence'
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

// ── Exception taxonomy (the 7 caseTypes, closed set) ─────────────────────────
// Spanish literal labels (contract §9 — ES-first, no new t() keys).

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

// ── Formatting ───────────────────────────────────────────────────────────────

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

/** A suggested match at/above the server high-confidence floor → bulk-eligible. */
function isBulkEligible(item: ConciliacionQueueItem): boolean {
  return item.status === 'suggested' && item.confidenceScore >= BULK_CONFIRM_HIGH_CONFIDENCE_FLOOR
}

// ── Row ──────────────────────────────────────────────────────────────────────

function QueueRow({
  item,
  checked,
  onToggle,
}: {
  item: ConciliacionQueueItem
  checked: boolean
  onToggle: (id: string) => void
}) {
  const eligible = isBulkEligible(item)
  const pct = Math.round((item.confidenceScore ?? 0) * 100)
  const casoLabel = item.caseType ? (CASE_TYPE_LABEL[item.caseType] ?? item.caseType) : null

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
      data-testid={`conciliacion-row-${item.id}`}
    >
      {/* Select — only high-confidence suggested matches can be bulk-confirmed */}
      <div className="pt-0.5">
        {eligible ? (
          <Checkbox
            checked={checked}
            onCheckedChange={() => onToggle(item.id)}
            aria-label="Seleccionar para confirmar"
          />
        ) : (
          <Checkbox checked={false} disabled aria-label="No elegible para confirmación masiva" />
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-fg truncate">
            {item.movement.description?.trim() || item.domain || 'Movimiento sin descripción'}
          </p>
          {casoLabel && (
            <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-fg-muted">
              {casoLabel}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-fg-muted tabular-nums">
          <span className="font-medium text-fg">{fmtCop(item.movement.amountCop)}</span>
          {item.matchedAmountCop !== item.movement.amountCop && (
            <span>Cruzado: {fmtCop(item.matchedAmountCop)}</span>
          )}
          <span>{fmtDate(item.movement.valueDate)}</span>
          {item.movement.reference && <span className="truncate">Ref: {item.movement.reference}</span>}
        </div>
      </div>

      {/* Confidence */}
      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-semibold tabular-nums ${eligible ? 'text-success' : 'text-fg-muted'}`}
        >
          {pct}%
        </p>
        <p className="text-[11px] text-fg-muted">confianza</p>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

function ConciliacionCola() {
  const { t } = useI18n()

  const [caseFilter, setCaseFilter] = useState<CaseTypeFilter>('todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // T-323: confirm-before-commit gate. The bulk action requires a SECOND explicit
  // human click; the first click arms the confirmation, the second executes.
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)

  const queueFilters = useMemo(
    () => ({
      status: 'suggested' as const,
      ...(caseFilter !== 'todos' ? { caseType: caseFilter } : {}),
      pageSize: 100,
    }),
    [caseFilter],
  )

  const { items, total, isLoading, error, refetch } = useConciliacionQueue(queueFilters)
  const { bulkConfirmByIds } = useConciliacionBulk()

  const eligibleItems = useMemo(() => items.filter(isBulkEligible), [items])
  const eligibleIds = useMemo(() => eligibleItems.map((i) => i.id), [eligibleItems])

  // Only count selections that still exist + are still eligible (post-refetch safety).
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

    // Summary: {confirmados / fallidos}.
    if (result.fallidos.length === 0) {
      toast.success(
        result.confirmados === 1
          ? '1 cruce confirmado.'
          : `${result.confirmados} cruces confirmados.`,
      )
    } else {
      toast.warning(
        `${result.confirmados} confirmados · ${result.fallidos.length} con error.`,
      )
    }
    clearSelection()
    await refetch()
  }

  const isEmpty = !isLoading && items.length === 0

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.ai.workspace.pages.conciliacion.colaTitle')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {t('inmobiliaria.ai.workspace.pages.conciliacion.colaDesc')}
          </p>
        </div>

        {/* Pending KPI */}
        <div className="shrink-0 rounded-lg border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-fg tabular-nums">
            {isLoading ? '—' : total}
          </p>
          <p className="text-xs text-fg-muted">
            {t('inmobiliaria.ai.workspace.pages.comun.enCola')}
          </p>
        </div>
      </header>

      {/* CaseType filter — single-select Chip row (one taxonomy at a time) */}
      <div
        className="flex flex-wrap items-center gap-2"
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

      {/* Bulk toolbar — appears when there are bulk-eligible matches */}
      {!isLoading && !error && eligibleIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-fg">
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
                <span className="text-xs text-fg-muted">
                  ¿Confirmar {selectedEligible.length}?
                </span>
                <Button variant="secondary" size="sm" hideArrow onClick={() => setArmed(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  hideArrow
                  isLoading={busy}
                  onClick={() => void runBulkConfirm()}
                >
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

      {/* List / states */}
      {isLoading ? (
        <div className="space-y-2" data-testid="conciliacion-cola-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-surface-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        /*
          Acá el error se pintaba como «no hay nada», con un comentario que lo
          defendía: «fail-soft, nunca un muro de error que bloquee al operador».
          La intención es correcta —no se bloquea— pero el texto afirmaba algo
          falso: no es que no haya, es que no pudimos preguntar. En un módulo
          que mueve plata, eso hace cerrar el día creyendo que no quedaba nada.

          Se conserva el no-bloqueo y se cambia lo que dice, con reintento.
        */
        <EmptyState
          icon={Bank}
          title="No pudimos consultar la cola"
          description="No es que no haya nada por revisar: no pudimos preguntarle al servicio. Vuelve a intentarlo."
          action={{ label: 'Reintentar', onClick: () => void refetch() }}
        />
      ) : isEmpty ? (
        caseFilter === 'todos' ? (
          <EmptyState
            icon={CheckCircle}
            title={t('inmobiliaria.ai.workspace.pages.conciliacion.colaTitle')}
            description={t('inmobiliaria.ai.workspace.pages.conciliacion.colaEmptyHint')}
            action={{
              label: t('inmobiliaria.ai.workspace.pages.conciliacion.accionTitle'),
              href: '/panel/inmobiliaria/ai/conciliacion/movimientos',
            }}
          />
        ) : (
          // Filtered-empty: no href action — the Chip row above lets the operator
          // switch filters (honest, no broken link action).
          <EmptyState
            icon={CheckCircle}
            title="Sin casos de este tipo"
            description="No hay cruces pendientes con este tipo de caso. Prueba otro filtro."
          />
        )
      ) : (
        <div className="space-y-2" data-testid="conciliacion-cola">
          {items.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              checked={selected.has(item.id)}
              onToggle={toggleOne}
            />
          ))}
        </div>
      )}
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
