'use client'

/**
 * /ai/cobranza/disputas — "Disputas" (visión #12).
 *
 * El nombre es UNO SOLO en toda la superficie: el nav decía «Disputas» y la
 * pantalla «Controversias». Se unificó en «disputa» (2026-08-09).
 *
 * DISPOSICIÓN — maestro-detalle. Antes era una columna de tarjetas con
 * `max-w-3xl` y casi media pantalla vacía a la derecha. Una disputa es texto
 * largo que hay que leer entero para decidir, así que la lista sólo trae lo
 * necesario para ELEGIR (quién, estado, monto, antigüedad) y el panel derecho
 * trae lo que hay que LEER y HACER. La resolución dejó de ser un modal: se
 * abría encima del motivo, justo el texto sobre el que había que decidir.
 *
 * Acciones (T-323 — confirmación HUMANA explícita, nunca auto-ejecuta):
 *   - "Abrir disputa": modal que registra una disputa (POST /disputes). NO
 *     pausa la cobranza; sólo deja constancia + escalación humana.
 *   - "Resolver": en el panel (POST /disputes/:id/resolve) con resultado +
 *     nota obligatoria. NO reactiva cobranza; el backend devuelve una
 *     recomendación sobre la que decide una persona.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Scales, ShieldWarning } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useAuth } from '@/lib/auth'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button, Input } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  SegmentedControl,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Card,
} from '@leasefy/cadence'
import {
  useDisputes,
  type CobranzaDispute,
  type DisputeOutcome,
  type DisputeStatus,
} from '@/lib/hooks/cobranza/use-disputes'
import { DisputasList } from '@/components/inmobiliaria/cobranza/DisputasList'
import { DisputaDetailPanel } from '@/components/inmobiliaria/cobranza/DisputaDetailPanel'
import {
  DebtorPicker,
  type PickedDebtor,
} from '@/components/inmobiliaria/cobranza/DebtorPicker'

const BASE = '/panel/inmobiliaria/cobros/cobranza'
const DEUDORES_HREF = `${BASE}/deudores`

const REASON_MIN = 1
const REASON_MAX = 2000

/**
 * Alto de la cabecera del panel + las secciones de Cobros + las pestañas de
 * Cobranza, para el sticky. Las dos barras publican su alto en variables CSS
 * (`BarraDePestanas`); la de secciones vale 0 si no se dibuja.
 *
 * ⚠️ Los espacios alrededor del `+` NO son opcionales: en `style` inline
 * `calc(4rem+3rem)` es CSS inválido y el navegador lo descarta en silencio.
 * (En una clase de Tailwind se puede escribir pegado porque Tailwind
 * normaliza el `calc` al generar el CSS; acá no hay quien lo haga.)
 */
const TOPE = 'calc(4rem + var(--secciones-h, 0px) + var(--workspace-nav-h, 3rem))'

// ── Filtro por estado (SegmentedControl) ─────────────────────────────────────

type EstadoFiltro = 'todas' | DisputeStatus

const FILTRO_OPCIONES: { value: EstadoFiltro; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'open', label: 'Abiertas' },
  { value: 'in_review', label: 'En revisión' },
  { value: 'resolved', label: 'Resueltas' },
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

// ── Contenido ────────────────────────────────────────────────────────────────

function DisputasContent() {
  const { user: authUser } = useAuth()

  // Filtro server-side por estado (el endpoint soporta ?status).
  const [filtro, setFiltro] = useState<EstadoFiltro>('todas')
  const { disputes, isLoading, error, refetch, openDispute, resolveDispute } =
    useDisputes(filtro === 'todas' ? {} : { status: filtro })

  useAutoRefresh(refetch)

  const [abrirOpen, setAbrirOpen] = useState(false)
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null)
  /** En móvil no caben las dos columnas: se muestra una u otra. */
  const [verDetalleEnMovil, setVerDetalleEnMovil] = useState(false)

  /** Falló la carga y no tenemos nada: no sabemos si hay o no. */
  const hayError = error !== null && disputes.length === 0

  const seleccionada = useMemo(
    () => disputes.find((d) => d.id === seleccionadaId) ?? null,
    [disputes, seleccionadaId],
  )

  // Auto-selección: al cargar, al cambiar de filtro, o si la elegida ya no
  // está en la lista. Sin esto el panel derecho arrancaría vacío siempre.
  useEffect(() => {
    if (disputes.length === 0) {
      setSeleccionadaId(null)
      return
    }
    if (!disputes.some((d) => d.id === seleccionadaId)) {
      setSeleccionadaId(disputes[0].id)
    }
  }, [disputes, seleccionadaId])

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
      if (res.ok) {
        // Saltar a la disputa recién creada: es lo que la persona acaba de
        // hacer, no tiene por qué buscarla en la lista.
        if (res.data?.dispute?.id) setSeleccionadaId(res.data.dispute.id)
        void refetch()
      }
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

  const elegir = useCallback((d: CobranzaDispute) => {
    setSeleccionadaId(d.id)
    setVerDetalleEnMovil(true)
  }, [])

  // ── Header (compartido) ────────────────────────────────────────────────────
  const header = (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Disputas
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          Las disputas que los deudores levantaron sobre su saldo o un cargo.
          Abrir o resolver una disputa es una decisión humana: el agente nunca
          pausa ni reactiva la cobranza por su cuenta.
        </p>
      </div>
      <Button
        size="sm"
        hideArrow
        onClick={() => setAbrirOpen(true)}
        data-testid="disputa-abrir"
        className="shrink-0"
      >
        Abrir disputa
      </Button>
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

      {/* Error de carga. Cuando falla, ABAJO no puede decirse «no hay
          disputas»: no sabemos si hay o no. */}
      {hayError && (
        <div
          role="alert"
          className="rounded-lg bg-danger-soft border border-danger/30 p-3 text-sm text-danger flex items-center justify-between gap-3 flex-wrap"
        >
          <span className="flex items-center gap-2">
            <ShieldWarning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
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

      {/* Filtro por estado + conteo */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SegmentedControl<EstadoFiltro>
          options={FILTRO_OPCIONES}
          value={filtro}
          onChange={(v) => {
            setFiltro(v)
            setVerDetalleEnMovil(false)
          }}
          aria-label="Filtrar disputas por estado"
        />
        {disputes.length > 0 && (
          <span className="text-xs text-fg-muted tabular-nums">
            {counts.open} abiertas · {counts.in_review} en revisión ·{' '}
            {counts.resolved} resueltas
          </span>
        )}
      </div>

      {hayError ? null : disputes.length === 0 ? (
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
        /* Maestro-detalle: la lista elige, el panel muestra y resuelve. */
        <div className="lg:grid lg:grid-cols-[22rem_1fr] lg:gap-5 lg:items-start">
          {/* Lista — se oculta en móvil cuando hay un detalle abierto */}
          <Card
            className={`overflow-hidden lg:sticky ${verDetalleEnMovil ? 'hidden lg:block' : ''}`}
            style={{ top: TOPE }}
          >
            {/* `data-lenis-prevent`: Lenis escucha la rueda en `window`, así
                que sin esto la lista no scrollea dentro de su propia caja. */}
            <div
              data-lenis-prevent
              className="lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto"
            >
              <DisputasList
                disputes={disputes}
                selectedId={seleccionadaId}
                onSelect={elegir}
              />
            </div>
          </Card>

          {/* Detalle — en móvil reemplaza a la lista */}
          <Card
            className={`overflow-hidden mt-4 lg:mt-0 ${verDetalleEnMovil ? '' : 'hidden lg:block'}`}
          >
            <div className="lg:hidden border-b border-border p-3">
              <Button
                variant="ghost"
                size="sm"
                hideArrow
                onClick={() => setVerDetalleEnMovil(false)}
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Volver a la lista
              </Button>
            </div>
            <DisputaDetailPanel
              dispute={seleccionada}
              onResolve={handleResolveDispute}
            />
          </Card>
        </div>
      )}

      {/* Alta — sigue siendo modal: es una creación, no una lectura */}
      <AbrirDisputaModal
        isOpen={abrirOpen}
        onClose={() => setAbrirOpen(false)}
        onSubmit={handleOpenDispute}
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
