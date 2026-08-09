'use client'

/**
 * /ai/cobranza/disputas — "Disputas" (visión #12).
 *
 * El nombre es UNO SOLO en toda la superficie: el nav decía «Disputas» y la
 * pantalla «Controversias». Se unificó en «disputa» (2026-08-09).
 *
 * Lista las disputas que un deudor levantó sobre su saldo/cargo:
 * {deudor (id enmascarado), motivo, monto disputado, estado open/in_review/resolved
 * con tono token, acción}. Filtro por estado con SegmentedControl.
 *
 * FUENTE: GET /api/agency/:id/cobranza/disputes (useDisputes). Backend NUEVO; aún
 * sin desplegar (Victor aplica migración + deploy). FAIL-SOFT: 404/empty/error →
 * <EmptyState> honesto; nunca rompe ni muestra error feo. El endpoint ya degrada a
 * 200 con lista vacía si la tabla no está migrada.
 *
 * Acciones (T-323 — confirmación HUMANA explícita, nunca auto-ejecuta):
 *   - "Abrir disputa": modal que registra una disputa (POST /disputes). NO
 *     pausa la cobranza automáticamente; solo deja constancia + escalación humana.
 *   - "Resolver": modal HUMANO-only (POST /disputes/:id/resolve) con outcome
 *     (procedente|improcedente|parcial) + nota obligatoria. NO reactiva cobranza
 *     automáticamente; el backend devuelve una recomendación sobre la que decide
 *     un humano.
 *
 * Estilo: contrato DS 2026-06-16 — PageGuard module="cobranza", MigaDePan, h1
 * text-2xl, UN solo primary CTA, SegmentedControl, tonos por token, cero hex.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  CheckCircle,
  Scales,
  ShieldWarning,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAuth } from '@/lib/auth'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button, Input } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SegmentedControl,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@leasefy/cadence'
import {
  useDisputes,
  type CobranzaDispute,
  type DisputeOutcome,
  type DisputeStatus,
} from '@/lib/hooks/cobranza/use-disputes'
import { DisputaCard } from '@/components/inmobiliaria/cobranza/DisputaCard'
import {
  DebtorPicker,
  type PickedDebtor,
} from '@/components/inmobiliaria/cobranza/DebtorPicker'

const BASE = '/panel/inmobiliaria/ai/cobranza'
const DEUDORES_HREF = `${BASE}/deudores`

const REASON_MIN = 1
const REASON_MAX = 2000
const NOTE_MIN = 1
const NOTE_MAX = 2000

// ── Filtro por estado (SegmentedControl) ─────────────────────────────────────

type EstadoFiltro = 'todas' | DisputeStatus

const FILTRO_OPCIONES: { value: EstadoFiltro; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'open', label: 'Abiertas' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'resolved', label: 'Resueltas' },
]

const OUTCOME_OPCIONES: { value: DisputeOutcome; label: string }[] = [
  { value: 'procedente', label: 'Procedente — la disputa tiene fundamento' },
  { value: 'improcedente', label: 'Improcedente — la disputa no procede' },
  { value: 'parcial', label: 'Parcial — procede en parte' },
]

// ── Modal: Abrir disputa (POST /disputes) ────────────────────────────────────

interface AbrirDisputaModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (body: {
    debtorId: string
    reason: string
    disputedAmount?: number
  }) => Promise<{ ok: boolean; status: number; persisted: boolean }>
}

function AbrirDisputaModal({ isOpen, onClose, onSubmit }: AbrirDisputaModalProps) {
  const [debtor, setDebtor] = useState<PickedDebtor | null>(null)
  const [reason, setReason] = useState('')
  const [monto, setMonto] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // El deudor se ELIGE de la cartera; el UUID nunca lo escribe una persona.
  const debtorIdOk = debtor !== null
  const reasonLen = reason.trim().length
  const reasonOk = reasonLen >= REASON_MIN && reasonLen <= REASON_MAX
  const montoTrim = monto.trim()
  const montoNum = montoTrim === '' ? undefined : Number(montoTrim)
  const montoOk =
    montoNum === undefined || (Number.isFinite(montoNum) && montoNum >= 0)
  const canSubmit = debtorIdOk && reasonOk && montoOk && !submitting

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !debtor) return
    setSubmitting(true)
    setSubmitError(null)
    const res = await onSubmit({
      debtorId: debtor.id,
      reason: reason.trim(),
      ...(montoNum !== undefined ? { disputedAmount: montoNum } : {}),
    })
    setSubmitting(false)
    if (res.ok) {
      setDebtor(null)
      setReason('')
      setMonto('')
      onClose()
    } else if (res.status === 403) {
      setSubmitError('No tienes permiso para abrir disputas.')
    } else if (res.status === 404) {
      setSubmitError('No se encontró el deudor con ese identificador.')
    } else if (res.status === 0) {
      setSubmitError(
        'No se pudo registrar la disputa. El servicio aún no está disponible.',
      )
    } else {
      setSubmitError(`No se pudo registrar la disputa (error ${res.status}).`)
    }
  }, [canSubmit, onSubmit, debtor, reason, montoNum, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Abrir una disputa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-fg-muted leading-relaxed">
            Registrar una disputa deja constancia y la pone en la cola de
            revisión humana. No pausa la cobranza automáticamente.
          </p>

          {/* Deudor — se elige de la cartera, nunca se escribe un UUID */}
          <div className="space-y-1.5">
            <label
              htmlFor="disputa-debtor"
              className="block text-xs font-medium uppercase tracking-wide text-fg-muted"
            >
              Deudor <span className="text-danger">*</span>
            </label>
            <DebtorPicker
              inputId="disputa-debtor"
              value={debtor}
              onChange={setDebtor}
            />
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <label
              htmlFor="disputa-reason"
              className="block text-xs font-medium uppercase tracking-wide text-fg-muted"
            >
              Motivo de la disputa <span className="text-danger">*</span>
            </label>
            <Textarea
              id="disputa-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={REASON_MAX + 50}
              placeholder="Describe qué disputa el deudor (saldo, cargo, etc.)."
              className="leading-relaxed"
            />
            <div className="flex items-center justify-end text-xs text-fg-muted tabular-nums">
              {reasonLen} / {REASON_MAX}
            </div>
          </div>

          {/* Monto disputado (opcional) */}
          <div className="space-y-1.5">
            <label
              htmlFor="disputa-monto"
              className="block text-xs font-medium uppercase tracking-wide text-fg-muted"
            >
              Monto en disputa (opcional)
            </label>
            <Input
              id="disputa-monto"
              inputMode="numeric"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="COP"
              className="tabular-nums"
            />
            {!montoOk && (
              <p className="text-xs text-danger">
                El monto debe ser un número mayor o igual a cero.
              </p>
            )}
          </div>

          {submitError && <p className="text-xs text-danger">{submitError}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            hideArrow
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            data-testid="disputa-abrir-submit"
          >
            {submitting ? 'Registrando…' : 'Registrar disputa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal: Resolver disputa (POST /disputes/:id/resolve) — HUMANO, T-323 ──────

interface ResolverDisputaModalProps {
  dispute: CobranzaDispute | null
  onClose: () => void
  onResolve: (
    id: string,
    body: { outcome: DisputeOutcome; resolutionNote: string },
  ) => Promise<{ ok: boolean; status: number; recommendation: string | null }>
}

function ResolverDisputaModal({
  dispute,
  onClose,
  onResolve,
}: ResolverDisputaModalProps) {
  const [outcome, setOutcome] = useState<DisputeOutcome | ''>('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const noteLen = note.trim().length
  const noteOk = noteLen >= NOTE_MIN && noteLen <= NOTE_MAX
  const canSubmit = dispute !== null && outcome !== '' && noteOk && !submitting

  const handleSubmit = useCallback(async () => {
    if (!dispute || outcome === '') return
    setSubmitting(true)
    setSubmitError(null)
    const res = await onResolve(dispute.id, {
      outcome,
      resolutionNote: note.trim(),
    })
    setSubmitting(false)
    if (res.ok) {
      setOutcome('')
      setNote('')
      onClose()
    } else if (res.status === 403) {
      setSubmitError('No tienes permiso para resolver disputas.')
    } else if (res.status === 404) {
      setSubmitError('La disputa ya no existe.')
    } else if (res.status === 409) {
      setSubmitError('La disputa ya fue resuelta.')
    } else if (res.status === 0) {
      setSubmitError(
        'No se pudo resolver la disputa. El servicio aún no está disponible.',
      )
    } else {
      setSubmitError(`No se pudo resolver la disputa (error ${res.status}).`)
    }
  }, [dispute, outcome, note, onResolve, onClose])

  return (
    <Dialog open={dispute !== null} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resolver disputa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-fg-muted leading-relaxed">
            Resolver una disputa es una decisión humana. No reactiva la
            cobranza automáticamente: el agente solo entregará una recomendación.
          </p>

          {/* Resultado (outcome) */}
          <div className="space-y-1.5">
            <label
              htmlFor="resolver-outcome"
              className="block text-xs font-medium uppercase tracking-wide text-fg-muted"
            >
              Resultado <span className="text-danger">*</span>
            </label>
            <Select
              value={outcome || undefined}
              onValueChange={(v) => setOutcome(v as DisputeOutcome)}
            >
              <SelectTrigger id="resolver-outcome">
                <SelectValue placeholder="Elige un resultado" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPCIONES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nota de resolución */}
          <div className="space-y-1.5">
            <label
              htmlFor="resolver-note"
              className="block text-xs font-medium uppercase tracking-wide text-fg-muted"
            >
              Nota de resolución <span className="text-danger">*</span>
            </label>
            <Textarea
              id="resolver-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={NOTE_MAX + 50}
              placeholder="Justifica la decisión y los próximos pasos."
              className="leading-relaxed"
            />
            <div className="flex items-center justify-end text-xs text-fg-muted tabular-nums">
              {noteLen} / {NOTE_MAX}
            </div>
          </div>

          {submitError && <p className="text-xs text-danger">{submitError}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            hideArrow
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            data-testid="disputa-resolver-submit"
          >
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
            {submitting ? 'Resolviendo…' : 'Resolver disputa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Contenido ────────────────────────────────────────────────────────────────

function DisputasContent() {
  const { user: authUser } = useAuth()

  // Filtro server-side por estado (el endpoint soporta ?status).
  const [filtro, setFiltro] = useState<EstadoFiltro>('todas')
  const { disputes, isLoading, error, refetch, openDispute, resolveDispute } =
    useDisputes(filtro === 'todas' ? {} : { status: filtro })

  useAutoRefresh(refetch)

  /** Falló la carga y no tenemos nada que mostrar: no sabemos si hay o no. */
  const hayError = error !== null && disputes.length === 0

  const [abrirOpen, setAbrirOpen] = useState(false)
  const [resolviendo, setResolviendo] = useState<CobranzaDispute | null>(null)

  const counts = useMemo(() => {
    const c = { open: 0, in_review: 0, resolved: 0 }
    for (const d of disputes) {
      if (d.status === 'open') c.open += 1
      else if (d.status === 'in_review') c.in_review += 1
      else if (d.status === 'resolved') c.resolved += 1
    }
    return c
  }, [disputes])

  // ── Mutaciones cableadas (refetch tras éxito) ─────────────────────────────
  const handleOpenDispute = useCallback(
    async (body: {
      debtorId: string
      reason: string
      disputedAmount?: number
    }) => {
      const res = await openDispute(body)
      if (res.ok) void refetch()
      return {
        ok: res.ok,
        status: res.status,
        persisted: res.data?.persisted ?? false,
      }
    },
    [openDispute, refetch],
  )

  const handleResolveDispute = useCallback(
    async (
      id: string,
      body: { outcome: DisputeOutcome; resolutionNote: string },
    ) => {
      // T-323: la resolución exige el userId del operador humano.
      const resolvedByUserId = authUser?.id ?? ''
      const res = await resolveDispute(id, { ...body, resolvedByUserId })
      if (res.ok) void refetch()
      return {
        ok: res.ok,
        status: res.status,
        recommendation: res.data?.recommendation ?? null,
      }
    },
    [resolveDispute, refetch, authUser?.id],
  )

  // ── Header (compartido) ────────────────────────────────────────────────────
  const header = (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Disputas
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          Las disputas que los deudores levantaron sobre su saldo o un cargo. Abrir
          o resolver una disputa es una decisión humana: el agente nunca pausa
          ni reactiva la cobranza por su cuenta.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          hideArrow
          onClick={() => setAbrirOpen(true)}
          data-testid="disputa-abrir"
        >
          Abrir disputa
        </Button>
      </div>
    </header>
  )

  // ── Primer load ────────────────────────────────────────────────────────────
  if (isLoading && disputes.length === 0 && !error) {
    return (
      <main className="p-6 lg:p-8 space-y-6">
        {header}
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" variant="default" />
        </div>
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {header}

      {/* Error de carga (no destructivo — la pantalla sigue usable).
          Cuando falla, ABAJO no puede decirse «no hay disputas»: no
          sabemos si hay o no. Se dice que no pudimos cargarlas y se ofrece
          reintentar. */}
      {hayError && (
        <div
          role="alert"
          className="rounded-xl bg-danger-soft border border-danger/30 p-3 text-sm text-danger flex items-center justify-between gap-3 flex-wrap"
        >
          <span className="flex items-center gap-2">
            <ShieldWarning
              className="w-4 h-4 shrink-0"
              weight="fill"
              aria-hidden="true"
            />
            No pudimos cargar las disputas. {error}
          </span>
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={() => void refetch()}
            className="shrink-0"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Filtro por estado — selector excluyente (SegmentedControl) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SegmentedControl<EstadoFiltro>
          options={FILTRO_OPCIONES}
          value={filtro}
          onChange={setFiltro}
          aria-label="Filtrar disputas por estado"
        />
        {disputes.length > 0 && (
          <span className="text-xs text-fg-muted tabular-nums">
            {counts.open} abiertas · {counts.in_review} en revisión ·{' '}
            {counts.resolved} resueltas
          </span>
        )}
      </div>

      {/* Lista o EmptyState. El vacío SÓLO se afirma cuando la carga salió
          bien; si falló, arriba ya se dijo que no pudimos cargarlas. */}
      {disputes.length === 0 && hayError ? null : disputes.length === 0 ? (
        <EmptyState
          icon={Scales}
          title={
            filtro === 'todas'
              ? 'No hay disputas registradas'
              : 'Sin disputas en este estado'
          }
          description={
            filtro === 'todas'
              ? 'Cuando un deudor dispute su saldo o un cargo, podrás abrir una disputa aquí y resolverla con un resultado y una nota. El detalle de cada deudor también muestra sus disputas.'
              : 'Ajusta el filtro para ver otras disputas, o abre una nueva.'
          }
          primaryCta={
            filtro === 'todas'
              ? { label: 'Ir a deudores', href: DEUDORES_HREF }
              : undefined
          }
        />
      ) : (
        <ul className="space-y-3 max-w-3xl" aria-label="Disputas">
          {disputes.map((dispute) => (
            <DisputaCard
              key={dispute.id}
              dispute={dispute}
              onResolve={setResolviendo}
            />
          ))}
        </ul>
      )}

      {/* Modales (T-323 — confirmación humana explícita) */}
      <AbrirDisputaModal
        isOpen={abrirOpen}
        onClose={() => setAbrirOpen(false)}
        onSubmit={handleOpenDispute}
      />
      <ResolverDisputaModal
        dispute={resolviendo}
        onClose={() => setResolviendo(null)}
        onResolve={handleResolveDispute}
      />
    </main>
  )
}

export default function DisputasPage() {
  return (
    <PageGuard module="cobranza">
      <DisputasContent />
    </PageGuard>
  )
}
