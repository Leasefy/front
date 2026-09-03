'use client'

/**
 * /ai/conciliacion/liquidaciones — "Liquidaciones a propietario".
 *
 * Bandeja de las liquidaciones que la inmobiliaria debe al propietario por
 * periodo. Cada liquidación es STATE (canon − comisión − otros = neto); aquí
 * NUNCA se mueve dinero. El desembolso/dispersión real es de pagos.
 *
 * Wired a los endpoints reales de Build C (verificados contra
 * conciliacion-settlements.ts):
 *   GET  /api/agency/{id}/conciliacion/settlements?status=…
 *   POST /api/agency/{id}/conciliacion/settlements/generate
 *   POST /api/agency/{id}/conciliacion/settlements/{id}/approve   (T-323)
 *
 * Operador:
 *   (1) Filtra por estado (Chip): todos · borrador · pendiente · aprobado · pagado.
 *   (2) "Generar liquidación" → diálogo con cifras reales (canon, comisión,
 *       otros) → POST generate (crea un borrador) + refetch.
 *   (3) "Aprobar" por fila → confirmación HUMANA explícita (T-323, AlertDialog)
 *       → POST approve (borrador/pendiente → aprobado) + refetch. El PAGO real
 *       NO se hace aquí.
 *
 * FAIL-SOFT (regla de oro): el backend Build C puede no estar desplegado → la
 * lista degrada a su EmptyState (lista vacía), nunca rompe. Las acciones que
 * fallan avisan con un toast honesto y dejan la fila intacta.
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Receipt, ShieldCheck } from '@phosphor-icons/react'

import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui'
import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { EmptyState } from '@/components/ui/empty-state'
import { Chip } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'
import {
  useConciliacionSettlements,
  type ConciliacionSettlement,
  type SettlementStatus,
} from '@/lib/hooks/conciliacion/use-conciliacion-settlements'

// ── Estado de liquidación (set cerrado) ──────────────────────────────────────

type StatusFilter = SettlementStatus | 'todos'

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'todos', label: 'Todas' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'pendiente_aprobacion', label: 'Pendiente' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'pagado', label: 'Pagado' },
]

const STATUS_LABEL: Record<SettlementStatus, string> = {
  borrador: 'Borrador',
  pendiente_aprobacion: 'Pendiente de aprobación',
  aprobado: 'Aprobado',
  pagado: 'Pagado',
}

/** Clases del pill de estado (tokens del DS, cero hex). */
const STATUS_PILL: Record<SettlementStatus, string> = {
  borrador: 'bg-surface-muted text-fg-muted',
  pendiente_aprobacion: 'bg-warning/10 text-warning',
  aprobado: 'bg-success/10 text-success',
  pagado: 'bg-info/10 text-info',
}

// ── Formato ──────────────────────────────────────────────────────────────────

function fmtCop(val: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val)
}

/** Solo borrador o pendiente se pueden aprobar (T-323; pagado es de pagos). */
function isApprovable(s: SettlementStatus): boolean {
  return s === 'borrador' || s === 'pendiente_aprobacion'
}

// ── Tarjeta de liquidación ───────────────────────────────────────────────────

function SettlementCard({
  item,
  onApprove,
  busy,
}: {
  item: ConciliacionSettlement
  onApprove: (item: ConciliacionSettlement) => void
  busy: boolean
}) {
  const approvable = isApprovable(item.status)

  return (
    <div
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid={`liquidacion-row-${item.id}`}
    >
      {/* Identidad: propietario + periodo + estado */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-fg truncate">
            {item.ownerName?.trim() || 'Propietario sin nombre'}
          </p>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_PILL[item.status]}`}
          >
            {STATUS_LABEL[item.status]}
          </span>
        </div>
        <p className="text-xs text-fg-muted">Periodo: {item.period}</p>
      </div>

      {/* Cifras: canon − comisión (− otros) = neto */}
      <div className="shrink-0 text-right tabular-nums">
        <div className="flex flex-wrap items-baseline justify-end gap-x-2 text-xs text-fg-muted">
          <span>{fmtCop(item.grossCop)}</span>
          <span aria-hidden="true">−</span>
          <span>{fmtCop(item.commissionCop)} comisión</span>
          {item.otherDeductionsCop > 0 && (
            <>
              <span aria-hidden="true">−</span>
              <span>{fmtCop(item.otherDeductionsCop)} otros</span>
            </>
          )}
          <span aria-hidden="true">=</span>
        </div>
        <p className="text-base font-semibold text-fg">{fmtCop(item.netCop)}</p>
        <p className="text-[11px] text-fg-muted">neto al propietario</p>
      </div>

      {/* Acción: aprobar (T-323). El PAGO real no se hace aquí. */}
      <div className="shrink-0">
        {approvable ? (
          <Button
            size="sm"
            variant="secondary"
            hideArrow
            disabled={busy}
            onClick={() => onApprove(item)}
            data-testid={`liquidacion-aprobar-${item.id}`}
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            Aprobar
          </Button>
        ) : (
          <span className="text-xs text-fg-muted">
            {item.status === 'aprobado' ? 'Aprobada' : 'Pagada'}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Diálogo: generar liquidación ─────────────────────────────────────────────

interface GenerateFormState {
  ownerName: string
  period: string
  grossCop: string
  commissionCop: string
  otherDeductionsCop: string
}

const EMPTY_FORM: GenerateFormState = {
  ownerName: '',
  period: '',
  grossCop: '',
  commissionCop: '',
  otherDeductionsCop: '',
}

function toIntCop(raw: string): number {
  const n = Math.trunc(Number(raw))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

// ── Página ───────────────────────────────────────────────────────────────────

function ConciliacionLiquidaciones() {
  const { t } = useI18n()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [busy, setBusy] = useState(false)

  // Generar (diálogo de formulario)
  const [genOpen, setGenOpen] = useState(false)
  const [form, setForm] = useState<GenerateFormState>(EMPTY_FORM)

  // Aprobar (confirmación humana, T-323)
  const [toApprove, setToApprove] = useState<ConciliacionSettlement | null>(null)

  const filters = useMemo(
    () => ({
      ...(statusFilter !== 'todos' ? { status: statusFilter } : {}),
      pageSize: 100,
    }),
    [statusFilter],
  )

  const { items, total, isLoading, error, refetch, generateSettlement, approveSettlement } =
    useConciliacionSettlements(filters)

  const previewNet = useMemo(
    () => toIntCop(form.grossCop) - toIntCop(form.commissionCop) - toIntCop(form.otherDeductionsCop),
    [form.grossCop, form.commissionCop, form.otherDeductionsCop],
  )

  const canGenerate =
    form.period.trim().length > 0 && form.grossCop.trim().length > 0 && !busy

  function resetForm() {
    setForm(EMPTY_FORM)
  }

  async function handleGenerate() {
    if (!canGenerate) return
    setBusy(true)
    const result = await generateSettlement({
      period: form.period.trim(),
      grossCop: toIntCop(form.grossCop),
      commissionCop: toIntCop(form.commissionCop),
      otherDeductionsCop: toIntCop(form.otherDeductionsCop),
      ...(form.ownerName.trim() ? { ownerName: form.ownerName.trim() } : {}),
    })
    setBusy(false)

    if (!result.ok) {
      toast.error(
        result.error === 'not_configured'
          ? 'No se pudo generar: servicio no configurado.'
          : `No se pudo generar la liquidación (${result.error ?? 'error'}).`,
      )
      return
    }
    toast.success('Liquidación generada como borrador.')
    setGenOpen(false)
    resetForm()
    await refetch()
  }

  async function handleApprove() {
    const item = toApprove
    if (!item) return
    setBusy(true)
    // T-323: borrador/pendiente → aprobado (avance directo a aprobado tras el
    // click humano explícito de confirmación). El pago real es de pagos.
    const result = await approveSettlement(item.id, 'aprobado')
    setBusy(false)
    setToApprove(null)

    if (!result.ok) {
      toast.error(
        result.error === 'not_configured'
          ? 'No se pudo aprobar: servicio no configurado.'
          : `No se pudo aprobar la liquidación (${result.error ?? 'error'}).`,
      )
      return
    }
    toast.success('Liquidación aprobada.')
    await refetch()
  }

  const isEmpty = !isLoading && items.length === 0

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Liquidaciones a propietario
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            Lo que la inmobiliaria debe a cada propietario por periodo: canon recaudado menos
            comisión y otros descuentos. Aquí solo se registra y aprueba — el pago real lo hace
            pagos.
          </p>
        </div>

        {/* Acción principal: generar + KPI total */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
            <p className="text-2xl font-semibold text-fg tabular-nums">
              {isLoading ? '—' : total}
            </p>
            <p className="text-xs text-fg-muted">en bandeja</p>
          </div>
          <Button
            hideArrow
            onClick={() => {
              resetForm()
              setGenOpen(true)
            }}
            data-testid="liquidacion-generar-cta"
          >
            <Receipt className="size-4" aria-hidden="true" />
            Generar liquidación
          </Button>
        </div>
      </header>

      {/* Filtro por estado — Chip row (un estado a la vez) */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filtrar por estado"
      >
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value}
            selected={statusFilter === f.value}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      {/* Lista / estados */}
      {isLoading ? (
        <div className="space-y-2" data-testid="liquidaciones-loading">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg border border-border bg-surface-muted animate-pulse"
            />
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
          icon={Receipt}
          title="No pudimos consultar las liquidaciones"
          description="No es que no haya: no pudimos preguntarle al servicio. Vuelve a intentarlo."
        />
      ) : isEmpty ? (
        statusFilter === 'todos' ? (
          <EmptyState
            icon={Receipt}
            title="Sin liquidaciones"
            description="Aún no hay liquidaciones a propietario. Genera la primera con las cifras del periodo."
          />
        ) : (
          <EmptyState
            icon={Receipt}
            title="Sin liquidaciones en este estado"
            description="No hay liquidaciones con este estado. Prueba otro filtro."
          />
        )
      ) : (
        <div className="space-y-2" data-testid="liquidaciones-list">
          {items.map((item) => (
            <SettlementCard key={item.id} item={item} onApprove={setToApprove} busy={busy} />
          ))}
        </div>
      )}

      {/* Diálogo: generar liquidación (borrador) */}
      <Dialog open={genOpen} onOpenChange={(o) => { if (!busy) setGenOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar liquidación</DialogTitle>
            <DialogDescription>
              Crea un borrador con las cifras reales del periodo. El neto se calcula como canon
              menos comisión y otros descuentos. No mueve dinero.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="liq-owner">Propietario (opcional)</Label>
              <Input
                id="liq-owner"
                value={form.ownerName}
                onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                placeholder="Nombre del propietario"
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="liq-period">Periodo</Label>
              <Input
                id="liq-period"
                value={form.period}
                onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                placeholder="Ej: 2026-06 o Junio 2026"
                disabled={busy}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="liq-gross">Canon recaudado (COP)</Label>
                <Input
                  id="liq-gross"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.grossCop}
                  onChange={(e) => setForm((f) => ({ ...f, grossCop: e.target.value }))}
                  placeholder="0"
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="liq-commission">Comisión (COP)</Label>
                <Input
                  id="liq-commission"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.commissionCop}
                  onChange={(e) => setForm((f) => ({ ...f, commissionCop: e.target.value }))}
                  placeholder="0"
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="liq-other">Otros descuentos (COP)</Label>
                <Input
                  id="liq-other"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.otherDeductionsCop}
                  onChange={(e) => setForm((f) => ({ ...f, otherDeductionsCop: e.target.value }))}
                  placeholder="0"
                  disabled={busy}
                />
              </div>
            </div>

            {/* Vista previa del neto (canon − comisión − otros) */}
            <div className="rounded-lg bg-surface-muted px-3 py-2 text-sm tabular-nums">
              <span className="text-fg-muted">Neto al propietario: </span>
              <span className="font-semibold text-fg">{fmtCop(previewNet)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              hideArrow
              onClick={() => setGenOpen(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button hideArrow isLoading={busy} disabled={!canGenerate} onClick={() => void handleGenerate()}>
              Generar borrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación humana de "Aprobar" (T-323) */}
      <AlertDialog open={toApprove !== null} onOpenChange={(o) => { if (!o && !busy) setToApprove(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar liquidación?</AlertDialogTitle>
            <AlertDialogDescription>
              {toApprove ? (
                <>
                  Vas a aprobar la liquidación de{' '}
                  <strong>{toApprove.ownerName?.trim() || 'el propietario'}</strong> por el periodo{' '}
                  <strong>{toApprove.period}</strong>, con un neto de{' '}
                  <strong>{fmtCop(toApprove.netCop)}</strong>. Esto autoriza el monto — no mueve ni
                  desembolsa dinero (el pago real lo hace pagos).
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleApprove()} disabled={busy}>
              Sí, aprobar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ConciliacionLiquidacionesPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionLiquidaciones />
    </PageGuard>
  )
}
