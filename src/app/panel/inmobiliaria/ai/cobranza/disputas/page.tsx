'use client'

/**
 * /ai/cobranza/disputas — "Controversias / Disputas" (visión #12).
 *
 * Lista las disputas (controversias) que un deudor levantó sobre su saldo/cargo:
 * {deudor (id enmascarado), motivo, monto disputado, estado open/in_review/resolved
 * con tono token, acción}. Filtro por estado con SegmentedControl.
 *
 * FUENTE: GET /api/agency/:id/cobranza/disputes (useDisputes). Backend NUEVO; aún
 * sin desplegar (Victor aplica migración + deploy). FAIL-SOFT: 404/empty/error →
 * <EmptyState> honesto; nunca rompe ni muestra error feo. El endpoint ya degrada a
 * 200 con lista vacía si la tabla no está migrada.
 *
 * Acciones (T-323 — confirmación HUMANA explícita, nunca auto-ejecuta):
 *   - "Abrir disputa": modal que registra una controversia (POST /disputes). NO
 *     pausa la cobranza automáticamente; solo deja constancia + escalación humana.
 *   - "Resolver": modal HUMANO-only (POST /disputes/:id/resolve) con outcome
 *     (procedente|improcedente|parcial) + nota obligatoria. NO reactiva cobranza
 *     automáticamente; el backend devuelve una recomendación sobre la que decide
 *     un humano.
 *
 * Estilo: contrato DS 2026-06-16 — PageGuard module="cobranza", MigaDePan, h1
 * text-2xl, UN solo primary CTA, SegmentedControl, tonos por token, cero hex.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowClockwise,
  CheckCircle,
  Scales,
  ShieldWarning,
  X,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button } from '@/components/ui'
import { SegmentedControl } from '@leasefy/ui'
import {
  useDisputes,
  type CobranzaDispute,
  type DisputeOutcome,
  type DisputeStatus,
} from '@/lib/hooks/cobranza/use-disputes'
import { DisputaCard } from '@/components/inmobiliaria/cobranza/DisputaCard'

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
  { value: 'procedente', label: 'Procedente — la controversia tiene fundamento' },
  { value: 'improcedente', label: 'Improcedente — la controversia no procede' },
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
  const [debtorId, setDebtorId] = useState('')
  const [reason, setReason] = useState('')
  const [monto, setMonto] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // UUID v4-ish — el backend exige z.string().uuid() para debtorId.
  const debtorIdOk = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    debtorId.trim(),
  )
  const reasonLen = reason.trim().length
  const reasonOk = reasonLen >= REASON_MIN && reasonLen <= REASON_MAX
  const montoTrim = monto.trim()
  const montoNum = montoTrim === '' ? undefined : Number(montoTrim)
  const montoOk =
    montoNum === undefined || (Number.isFinite(montoNum) && montoNum >= 0)
  const canSubmit = debtorIdOk && reasonOk && montoOk && !submitting

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    const res = await onSubmit({
      debtorId: debtorId.trim(),
      reason: reason.trim(),
      ...(montoNum !== undefined ? { disputedAmount: montoNum } : {}),
    })
    setSubmitting(false)
    if (res.ok) {
      setDebtorId('')
      setReason('')
      setMonto('')
      onClose()
    } else if (res.status === 403) {
      setSubmitError('No tienes permiso para abrir controversias.')
    } else if (res.status === 404) {
      setSubmitError('No se encontró el deudor con ese identificador.')
    } else if (res.status === 0) {
      setSubmitError(
        'No se pudo registrar la controversia. El servicio aún no está disponible.',
      )
    } else {
      setSubmitError(`No se pudo registrar la controversia (error ${res.status}).`)
    }
  }, [canSubmit, onSubmit, debtorId, reason, montoNum, onClose])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="abrir-disputa-title"
        className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4"
      >
        <div className="bg-card text-fg rounded-t-xl md:rounded-xl w-full md:max-w-lg max-h-[90vh] flex flex-col">
          <div className="flex-none flex items-center justify-between border-b border-border px-5 py-4">
            <h2 id="abrir-disputa-title" className="text-base font-semibold text-fg">
              Abrir una controversia
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-md p-1 hover:bg-surface-muted transition"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <p className="text-xs text-fg-muted leading-relaxed">
              Registrar una controversia deja constancia y la pone en la cola de
              revisión humana. No pausa la cobranza automáticamente.
            </p>

            {/* Identificador del deudor */}
            <div className="space-y-1.5">
              <label
                htmlFor="disputa-debtor"
                className="block text-xs font-medium uppercase tracking-wide text-fg-muted"
              >
                Identificador del deudor <span className="text-danger">*</span>
              </label>
              <input
                id="disputa-debtor"
                value={debtorId}
                onChange={(e) => setDebtorId(e.target.value)}
                placeholder="UUID del deudor"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {debtorId.trim() !== '' && !debtorIdOk && (
                <p className="text-xs text-danger">
                  El identificador del deudor debe ser un UUID válido.
                </p>
              )}
              <p className="text-xs text-fg-muted">
                Lo encuentras en el detalle de cada deudor.
              </p>
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
              <label
                htmlFor="disputa-reason"
                className="block text-xs font-medium uppercase tracking-wide text-fg-muted"
              >
                Motivo de la controversia <span className="text-danger">*</span>
              </label>
              <textarea
                id="disputa-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={REASON_MAX + 50}
                placeholder="Describe qué disputa el deudor (saldo, cargo, etc.)."
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
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
              <input
                id="disputa-monto"
                inputMode="numeric"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="COP"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {!montoOk && (
                <p className="text-xs text-danger">
                  El monto debe ser un número mayor o igual a cero.
                </p>
              )}
            </div>

            {submitError && <p className="text-xs text-danger">{submitError}</p>}
          </div>

          <div className="flex-none flex items-center justify-end gap-2 border-t border-border px-5 py-3">
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
              {submitting ? 'Registrando…' : 'Registrar controversia'}
            </Button>
          </div>
        </div>
      </div>
    </>
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
      setSubmitError('No tienes permiso para resolver controversias.')
    } else if (res.status === 404) {
      setSubmitError('La controversia ya no existe.')
    } else if (res.status === 409) {
      setSubmitError('La controversia ya fue resuelta.')
    } else if (res.status === 0) {
      setSubmitError(
        'No se pudo resolver la controversia. El servicio aún no está disponible.',
      )
    } else {
      setSubmitError(`No se pudo resolver la controversia (error ${res.status}).`)
    }
  }, [dispute, outcome, note, onResolve, onClose])

  if (!dispute) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolver-disputa-title"
        className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4"
      >
        <div className="bg-card text-fg rounded-t-xl md:rounded-xl w-full md:max-w-lg max-h-[90vh] flex flex-col">
          <div className="flex-none flex items-center justify-between border-b border-border px-5 py-4">
            <h2
              id="resolver-disputa-title"
              className="text-base font-semibold text-fg"
            >
              Resolver controversia
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-md p-1 hover:bg-surface-muted transition"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <p className="text-xs text-fg-muted leading-relaxed">
              Resolver una controversia es una decisión humana. No reactiva la
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
              <select
                id="resolver-outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as DisputeOutcome)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="" disabled>
                  Elige un resultado
                </option>
                {OUTCOME_OPCIONES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Nota de resolución */}
            <div className="space-y-1.5">
              <label
                htmlFor="resolver-note"
                className="block text-xs font-medium uppercase tracking-wide text-fg-muted"
              >
                Nota de resolución <span className="text-danger">*</span>
              </label>
              <textarea
                id="resolver-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={NOTE_MAX + 50}
                placeholder="Justifica la decisión y los próximos pasos."
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center justify-end text-xs text-fg-muted tabular-nums">
                {noteLen} / {NOTE_MAX}
              </div>
            </div>

            {submitError && <p className="text-xs text-danger">{submitError}</p>}
          </div>

          <div className="flex-none flex items-center justify-end gap-2 border-t border-border px-5 py-3">
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
              {submitting ? 'Resolviendo…' : 'Resolver controversia'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Contenido ────────────────────────────────────────────────────────────────

function DisputasContent() {
  const { t, locale } = useI18n()
  const { user: authUser } = useAuth()
  const isEs = locale.startsWith('es')

  // Filtro server-side por estado (el endpoint soporta ?status).
  const [filtro, setFiltro] = useState<EstadoFiltro>('todas')
  const { disputes, isLoading, error, refetch, openDispute, resolveDispute } =
    useDisputes(filtro === 'todas' ? {} : { status: filtro })

  const [abrirOpen, setAbrirOpen] = useState(false)
  const [resolviendo, setResolviendo] = useState<CobranzaDispute | null>(null)
  // Montaje del portal — los modales usan createPortal a document.body.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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
        <MigaDePan
          backHref={BASE}
          icon={Scales}
          className="mb-2"
          crumbs={[
            { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
            { label: t('inmobiliaria.ai.cobranza.overview.title'), href: BASE },
            { label: 'Controversias' },
          ]}
        />
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Controversias
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          Las disputas que los deudores levantaron sobre su saldo o un cargo. Abrir
          o resolver una controversia es una decisión humana: el agente nunca pausa
          ni reactiva la cobranza por su cuenta.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => void refetch()}
          aria-label={isEs ? 'Actualizar' : 'Refresh'}
        >
          <ArrowClockwise className="w-3.5 h-3.5" aria-hidden="true" />
          {isEs ? 'Actualizar' : 'Refresh'}
        </Button>
        <Button
          size="sm"
          hideArrow
          onClick={() => setAbrirOpen(true)}
          data-testid="disputa-abrir"
        >
          Abrir controversia
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
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {header}

      {/* Error de carga (no destructivo — la pantalla sigue usable) */}
      {error && disputes.length === 0 && (
        <div
          role="alert"
          className="rounded-xl bg-danger-soft border border-danger/30 p-3 text-sm text-danger flex items-center gap-2"
        >
          <ShieldWarning
            className="w-4 h-4 shrink-0"
            weight="fill"
            aria-hidden="true"
          />
          <span>No se pudo cargar las controversias. {error}</span>
        </div>
      )}

      {/* Filtro por estado — selector excluyente (SegmentedControl) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SegmentedControl<EstadoFiltro>
          options={FILTRO_OPCIONES}
          value={filtro}
          onChange={setFiltro}
          aria-label="Filtrar controversias por estado"
        />
        {disputes.length > 0 && (
          <span className="text-xs text-fg-muted tabular-nums">
            {counts.open} abiertas · {counts.in_review} en revisión ·{' '}
            {counts.resolved} resueltas
          </span>
        )}
      </div>

      {/* Lista o EmptyState (fallback fail-soft) */}
      {disputes.length === 0 ? (
        <EmptyState
          icon={Scales}
          title={
            filtro === 'todas'
              ? 'No hay controversias registradas'
              : 'Sin controversias en este estado'
          }
          description={
            filtro === 'todas'
              ? 'Cuando un deudor dispute su saldo o un cargo, podrás abrir una controversia aquí y resolverla con un resultado y una nota. El detalle de cada deudor también muestra sus controversias.'
              : 'Ajusta el filtro para ver otras controversias, o abre una nueva.'
          }
          primaryCta={
            filtro === 'todas'
              ? { label: 'Ir a deudores', href: DEUDORES_HREF }
              : undefined
          }
        />
      ) : (
        <ul className="space-y-3 max-w-3xl" aria-label="Controversias">
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
      {mounted &&
        createPortal(
          <AbrirDisputaModal
            isOpen={abrirOpen}
            onClose={() => setAbrirOpen(false)}
            onSubmit={handleOpenDispute}
          />,
          document.body,
        )}
      {mounted &&
        createPortal(
          <ResolverDisputaModal
            dispute={resolviendo}
            onClose={() => setResolviendo(null)}
            onResolve={handleResolveDispute}
          />,
          document.body,
        )}
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
