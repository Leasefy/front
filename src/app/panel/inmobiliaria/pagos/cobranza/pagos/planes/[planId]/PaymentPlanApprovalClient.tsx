'use client'

/**
 * PaymentPlanApprovalClient — Phase 32 plan 32-08 (COBR-UI-06, XR-05).
 *
 * Operator approval surface for a single AI-proposed payment plan:
 *  - Header: debtor name + masked cédula + link to debtor detail (D-08 PII).
 *  - Comparison panel: AI-proposed vs agency.maxDiscount.
 *  - Hard-block banner when proposed.discount > agency.maxDiscount (D-32).
 *  - Aprobar / Rechazar / Modificar buttons — gated on canAccess('cobranza','approve').
 *  - Inline Rechazar form: canned 6-reason dropdown + optional 500-char comment.
 *  - Inline Modificar form: range slider hard-capped at agency.maxDiscount.
 *  - Realtime: cartera_payments channel triggers a single refetch on every event.
 *  - 🔴 «El inquilino aceptó» (03-10-2026, Nico S5 Q4, contra la recomendada):
 *    el panel TAMBIÉN exige la aprobación de la inmobiliaria para aceptar en
 *    nombre del inquilino. Sin aprobar, la pantalla lo explica y ofrece
 *    «Aprobar primero»; si el micro igual responde 409 `ACUERDO_SIN_APROBAR`
 *    (otra persona, otra pestaña), se dice lo mismo con la frase del servidor.
 */

import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CrossFade, Presence } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Button, Input } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Slider, NumberInput } from '@leasefy/cadence'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { mensajeDeLaAccion } from '@/lib/hooks/cobranza/mensaje-de-la-accion'
import {
  CODIGO_ACUERDO_SIN_APROBAR,
  usePaymentPlanApproval,
  type RejectReasonSlug,
} from '@/lib/hooks/cobranza/use-payment-plan-approval'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { usePaymentsFunnelRealtime } from '@/lib/hooks/cobranza/use-payments-funnel-realtime'
import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista'
import { plataEnPantalla } from '@/lib/plata/escribir-plata'
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia'

void React

const REJECT_REASONS: RejectReasonSlug[] = [
  'discount_too_high',
  'debtor_history_poor',
  'wrong_cuota_count',
  'policy_violation',
  'out_of_scope',
  'other',
]

const copFormat = plataEnPantalla('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function formatCop(value: number | null | undefined): string {
  if (value == null) return '—'
  return copFormat.format(value)
}

/** Hoy en Bogotá (`AAAA-MM-DD`): con `toISOString`, desde las 7 p. m. ya era mañana. */
function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

const fechaDelDia = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * «3 de noviembre de 2026» de un `AAAA-MM-DD` (la cuota vence ese DÍA, sin
 * hora). Antes la tabla mostraba el ISO crudo «2026-11-03T00:00:00.000Z».
 */
export function diaParaMostrar(dia: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dia)
  if (!m) return dia || '—'
  return fechaDelDia.format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))))
}

interface Props {
  planId: string
}

export default function PaymentPlanApprovalClient({ planId }: Props) {
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()
  const canApprove = canAccess('cobranza', 'approve')

  const {
    plan,
    isLoading,
    error,
    isMaxDiscountExceeded,
    refetch,
    approvePlan,
    rejectPlan,
    modifyPlan,
    acceptPlan,
  } = usePaymentPlanApproval({ planId, canApprove })
  // Realtime — single refetch on each cartera_payments event for this plan.
  const onUpdate = useCallback(() => {
    void refetch()
  }, [refetch])
  usePaymentsFunnelRealtime({ planId, onUpdate, onReconnect: onUpdate })

  // ── Inline-form state ─────────────────────────────────────────────────────
  const [rechazarOpen, setRechazarOpen] = useState<boolean>(false)
  const [modificarOpen, setModificarOpen] = useState<boolean>(false)
  const [rejectReason, setRejectReason] = useState<RejectReasonSlug | ''>('')
  const [rejectComment, setRejectComment] = useState<string>('')
  const [modDiscount, setModDiscount] = useState<number>(0)
  const [modCuotas, setModCuotas] = useState<number>(1)
  const [modMonto, setModMonto] = useState<number>(0)
  const [modFecha, setModFecha] = useState<string>(todayIso())
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [wompiLink, setWompiLink] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  /** La frase del 409 `ACUERDO_SIN_APROBAR` cuando el servidor dijo que no. */
  const [sinAprobarDelServidor, setSinAprobarDelServidor] = useState<string | null>(null)
  const [aceptando, setAceptando] = useState<boolean>(false)

  // Sync wompiLink from plan (in case refetch picks up another operator's approve).
  useEffect(() => {
    if (plan?.wompiLink) setWompiLink(plan.wompiLink)
  }, [plan?.wompiLink])

  const envMissing = !process.env.NEXT_PUBLIC_AGENT_URL

  // ── Early returns ─────────────────────────────────────────────────────────

  if (envMissing) {
    return (
      <div className="p-4 lg:p-8">
        <div className="rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          {t('inmobiliaria.ai.cobranza.planes.envMissing')}
        </div>
      </div>
    )
  }

  // Phase 38-05a: PageSkeleton primitive (detail variant). data-testid kept on
  // wrapper so existing test selectors (e.g. plan-skeleton) still resolve.
  if (isLoading && !plan) {
    return (
      <div data-testid="plan-skeleton">
        <PageSkeleton variant="detail" />
      </div>
    )
  }

  if (error && !plan) {
    return (
      <div className="p-4 lg:p-8">
        <div className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {t('inmobiliaria.ai.cobranza.planes.loadError')}
        </div>
      </div>
    )
  }

  if (!plan) return null

  const maxDiscount = plan.agency.maxDiscount
  // Por decidir = ofrecido y SIN la aprobación de la inmobiliaria. Aprobado, ni
  // aprobar otra vez ni rechazar ni modificar: el micro responde 409 a las tres
  // (QA-IA-B, 04-10-2026: los tres botones seguían prendidos).
  const isPending =
    (plan.status === 'offered' || plan.status === 'pending') && !plan.operatorApprovedAt
  const esPagoUnico = plan.proposed.cuotas === 0 && plan.proposed.totalDueCop > 0

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openModificar = (): void => {
    setActionError(null)
    setModDiscount(Math.min(plan.proposed.discount, maxDiscount))
    setModCuotas(plan.proposed.cuotas || 1)
    setModMonto(plan.proposed.montoPorCuota || 0)
    setModFecha(plan.proposed.fechaPrimerPago || todayIso())
    setRechazarOpen(false)
    setModificarOpen(true)
  }

  const openRechazar = (): void => {
    setActionError(null)
    setModificarOpen(false)
    setRechazarOpen(true)
  }

  const handleAprobar = async (): Promise<void> => {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await approvePlan()
      if ('error' in res) {
        setActionError(
          mensajeDeLaAccion(res, { porDefecto: 'No pudimos aprobar el plan.', accion: 'aprobar el plan' }),
        )
      } else {
        setWompiLink(res.wompiLink)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleRechazarSubmit = async (): Promise<void> => {
    if (!rejectReason) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await rejectPlan({
        reject_reason: rejectReason,
        reject_comment: rejectComment || undefined,
      })
      if ('error' in res) {
        setActionError(
          mensajeDeLaAccion(res, { porDefecto: 'No pudimos rechazar el plan.', accion: 'rechazar el plan' }),
        )
      } else {
        setRechazarOpen(false)
        setRejectReason('')
        setRejectComment('')
        setToast(t('inmobiliaria.ai.cobranza.planes.rechazarForm.success'))
      }
    } catch {
      // El hook sólo tira si el motivo falta o no es de la lista (en inglés,
      // para el programador): a la persona se le dice qué hacer.
      setActionError('Elige un motivo de rechazo de la lista.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleModificarSubmit = async (): Promise<void> => {
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await modifyPlan({
        discount: modDiscount,
        cuotas: modCuotas,
        montoPorCuota: modMonto,
        fechaPrimerPago: modFecha,
      })
      if ('error' in res) {
        // DUPLICATE_PLAN_RISK = the counter-offer was created but the original
        // could not be rejected, so two plans may be active. Show a clear,
        // localized warning and pull canonical server state.
        setActionError(
          res.code === 'DUPLICATE_PLAN_RISK'
            ? t('inmobiliaria.ai.cobranza.planes.modificarForm.duplicateRisk')
            : mensajeDeLaAccion(res, {
                porDefecto: 'No pudimos enviar la contraoferta.',
                accion: 'enviar la contraoferta',
              }),
        )
        void refetch()
      } else {
        setModificarOpen(false)
        setToast(t('inmobiliaria.ai.cobranza.planes.modificarForm.success'))
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Aprobar disabled reason for the tooltip.
  const aprobarDisabled =
    isMaxDiscountExceeded || !canApprove || actionLoading || !isPending
  const aprobarDisabledTitle = isMaxDiscountExceeded
    ? t('inmobiliaria.ai.cobranza.planes.aprobarDisabledBanner')
    : !canApprove
    ? t('inmobiliaria.ai.cobranza.planes.aprobarDisabledPerm')
    : ''

  const actionsDisabled = !canApprove || !isPending || actionLoading

  // 🔴 Aprobado = la marca del servidor (`operatorApprovedAt`; el hook la pone
  // al aprobar acá y la quita si el servidor responde que no). El enlace de
  // Wompi NO sirve de señal: la oferta ya trae uno antes de aprobar.
  const estaAprobado = Boolean(plan.operatorApprovedAt)
  // Espera la aceptación del inquilino: ofrecido (aprobado o no). `approved` es
  // el estado local justo después de aprobar acá (el servidor sigue diciendo
  // `offered` con la marca de aprobación).
  const esperaAceptacion =
    plan.status === 'offered' || plan.status === 'pending' || plan.status === 'approved'
  const puedeRegistrarAceptacion = esperaAceptacion && estaAprobado && !sinAprobarDelServidor
  /*
   * 🔴 N-44 (QA-PAGOS-95 r3): un plan que ya no está por decidir (aprobado,
   * vigente, cumplido, rechazado…) no ofrece «Aprobar · Rechazar · Modificar»
   * apagados: dice en qué quedó. Antes el plan VIGENTE de Tomás seguía con los
   * tres botones.
   */
  const estadoDelPlan =
    plan.status === 'active'
      ? t('inmobiliaria.ai.cobranza.planes.estado.vigente')
      : plan.status === 'completed'
        ? t('inmobiliaria.ai.cobranza.planes.estado.cumplido')
        : plan.status === 'rejected'
          ? t('inmobiliaria.ai.cobranza.planes.estado.rechazado')
          : plan.status === 'cancelled'
            ? t('inmobiliaria.ai.cobranza.planes.estado.cancelado')
            : plan.status === 'defaulted'
              ? t('inmobiliaria.ai.cobranza.planes.estado.incumplido')
              : plan.status === 'counter_offered'
                ? t('inmobiliaria.ai.cobranza.planes.estado.contraoferta')
                : estaAprobado
                  ? t('inmobiliaria.ai.cobranza.planes.estado.aprobado')
                  : null

  const handleAceptar = async (): Promise<void> => {
    setAceptando(true)
    setActionError(null)
    try {
      const res = await acceptPlan()
      if ('error' in res) {
        if (res.code === CODIGO_ACUERDO_SIN_APROBAR) {
          setSinAprobarDelServidor(
            mensajeParaLaPersona(res.fallo, {
              porDefecto: t('inmobiliaria.ai.cobranza.planes.aceptacion.sinAprobar'),
              accion: 'registrar la aceptación',
            }),
          )
        } else {
          setActionError(
            mensajeDeLaAccion(res, {
              porDefecto: 'No pudimos registrar la aceptación.',
              accion: 'registrar la aceptación',
            }),
          )
        }
      } else {
        setToast(t('inmobiliaria.ai.cobranza.planes.aceptacion.registrado'))
      }
    } finally {
      setAceptando(false)
    }
  }

  const handleAprobarPrimero = async (): Promise<void> => {
    setSinAprobarDelServidor(null)
    await handleAprobar()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <VolverALaLista
        href="/panel/inmobiliaria/pagos/cobranza/pagos"
        label={t('inmobiliaria.ai.volverA.pagos')}
      />

      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h2 text-fg">
            {t('inmobiliaria.ai.cobranza.planes.title')}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-fg-muted">
            <span className="font-medium text-fg">
              {plan.debtor.nombreMasked || '—'}
            </span>
            <span>·</span>
            <Mask field="cedula" value={plan.debtor.cedulaMasked} />
          </div>
        </div>
        <Button asChild variant="outline" size="sm" hideArrow>
          <Link href={`/panel/inmobiliaria/pagos/cobranza/deudores/${plan.debtor.id}`}>
            {t('inmobiliaria.ai.cobranza.planes.verDeudor')} →
          </Link>
        </Button>
      </header>

      {/* Comparison panel */}
      <section className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="overflow-x-auto overscroll-contain">
        <Table className="w-full text-sm">
          <TableHeader className="bg-surface-muted">
            <TableRow>
              <TableHead>{t('inmobiliaria.ai.cobranza.planes.comparisonHeader.campo')}</TableHead>
              <TableHead>{t('inmobiliaria.ai.cobranza.planes.comparisonHeader.propuesto')}</TableHead>
              <TableHead>{t('inmobiliaria.ai.cobranza.planes.comparisonHeader.limite')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="px-4 py-3 text-fg-muted">
                {t('inmobiliaria.ai.cobranza.planes.comparison.descuento')}
              </TableCell>
              <TableCell
                className={`px-4 py-3 font-medium ${
                  isMaxDiscountExceeded
                    ? 'text-danger'
                    : 'text-fg'
                }`}
              >
                {plan.proposed.discount}%
              </TableCell>
              <TableCell className="px-4 py-3 text-fg-muted">
                {maxDiscount}%
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-fg-muted">
                {t('inmobiliaria.ai.cobranza.planes.comparison.cuotas')}
              </TableCell>
              <TableCell className="px-4 py-3 font-medium text-fg">
                {/* Un acuerdo de pago único no trae cuotas: «0 cuotas · $0 por
                    cuota» parecía un acuerdo vacío (PRUEBAS-PAGOS, 03-10-2026). */}
                {esPagoUnico ? t('inmobiliaria.ai.cobranza.planes.comparison.pagoUnico') : plan.proposed.cuotas}
              </TableCell>
              <TableCell className="px-4 py-3 text-fg-muted">—</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-fg-muted">
                {t('inmobiliaria.ai.cobranza.planes.comparison.monto')}
              </TableCell>
              <TableCell className="px-4 py-3 font-medium text-fg">
                {formatCop(esPagoUnico ? plan.proposed.totalDueCop : plan.proposed.montoPorCuota)}
              </TableCell>
              <TableCell className="px-4 py-3 text-fg-muted">—</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-fg-muted">
                {t('inmobiliaria.ai.cobranza.planes.comparison.fecha')}
              </TableCell>
              <TableCell className="px-4 py-3 font-medium text-fg">
                {plan.proposed.fechaPrimerPago ? diaParaMostrar(plan.proposed.fechaPrimerPago) : '—'}
              </TableCell>
              <TableCell className="px-4 py-3 text-fg-muted">—</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </div>
      </section>

      {/* Hard-block banner */}
      {isMaxDiscountExceeded && (
        <div
          data-testid="max-discount-banner"
          className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <div className="font-medium">
            {t('inmobiliaria.ai.cobranza.planes.maxDiscountBanner', {
              max: maxDiscount,
            })}
          </div>
          <Link
            href="/panel/inmobiliaria/configuracion/agencia"
            className="mt-2 inline-block text-sm font-medium underline underline-offset-4 hover:opacity-80"
          >
            {t('inmobiliaria.ai.cobranza.planes.configLink')} →
          </Link>
        </div>
      )}

      {/* Action buttons: sólo mientras está por decidir (N-44). */}
      {!isPending && estadoDelPlan && (
        <p role="status" data-testid="plan-estado" className="text-sm text-fg">
          {estadoDelPlan}
        </p>
      )}
      {isPending && (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="approval-aprobar-plan"
          onClick={() => void handleAprobar()}
          disabled={aprobarDisabled}
          hideArrow
          title={aprobarDisabledTitle || undefined}
        >
          {t('inmobiliaria.ai.cobranza.planes.aprobar')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-testid="approval-rechazar-plan"
          onClick={openRechazar}
          disabled={actionsDisabled}
          hideArrow
          title={!canApprove ? t('inmobiliaria.ai.cobranza.planes.aprobarDisabledPerm') : undefined}
        >
          {t('inmobiliaria.ai.cobranza.planes.rechazar')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-testid="approval-modificar-plan"
          onClick={openModificar}
          disabled={actionsDisabled}
          hideArrow
          title={!canApprove ? t('inmobiliaria.ai.cobranza.planes.aprobarDisabledPerm') : undefined}
        >
          {t('inmobiliaria.ai.cobranza.planes.modificar')}
        </Button>
      </div>
      )}

      {/* «El inquilino aceptó» — sólo con el plan aprobado (Nico, S5 Q4) */}
      {/* «Primero apruébalo» ⇄ «Registrar que lo aceptó»: el uno se va y el
          otro entra con el `CrossFade` del sistema (antes, `AnimatePresence
          mode="wait"` con su propia receta). */}
      {canApprove && esperaAceptacion && (
        <CrossFade swapKey={puedeRegistrarAceptacion ? 'registrar-aceptacion' : 'aprobar-primero'}>
          {puedeRegistrarAceptacion ? (
            <section
              data-testid="plan-registrar-aceptacion"
              className="space-y-2 rounded-md border border-border bg-surface p-4"
            >
              <div className="text-sm font-medium text-fg">
                {t('inmobiliaria.ai.cobranza.planes.aceptacion.titulo')}
              </div>
              <p className="text-sm text-fg-muted">
                {t('inmobiliaria.ai.cobranza.planes.aceptacion.ayuda')}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="plan-registrar-aceptacion-boton"
                onClick={() => void handleAceptar()}
                disabled={aceptando || actionLoading}
                isLoading={aceptando}
                hideArrow
              >
                {t('inmobiliaria.ai.cobranza.planes.aceptacion.registrar')}
              </Button>
            </section>
          ) : (
            <section
              role="status"
              data-testid="plan-sin-aprobar"
              className="space-y-2 rounded-md border border-warning/30 bg-warning-soft p-4"
            >
              <div className="text-sm font-medium text-warning">
                {t('inmobiliaria.ai.cobranza.planes.aceptacion.sinAprobarTitulo')}
              </div>
              <p className="text-sm text-fg">
                {sinAprobarDelServidor ?? t('inmobiliaria.ai.cobranza.planes.aceptacion.sinAprobar')}
              </p>
              <Button
                type="button"
                size="sm"
                data-testid="plan-aprobar-primero"
                onClick={() => void handleAprobarPrimero()}
                disabled={aprobarDisabled}
                isLoading={actionLoading}
                title={aprobarDisabledTitle || undefined}
                hideArrow
              >
                {t('inmobiliaria.ai.cobranza.planes.aceptacion.aprobarPrimero')}
              </Button>
            </section>
          )}
        </CrossFade>
      )}

      {/* El error y el «listo» de una acción entran y salen con `Presence`. */}
      <Presence
        show={Boolean(actionError)}
        role="alert"
        data-testid="plan-accion-error"
        className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
      >
          {actionError}
      </Presence>

      <Presence
        show={Boolean(toast)}
        className="rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success"
      >
          {toast}
      </Presence>

      {/* Wompi link panel — populated after approve success.
          🔴 PRUEBAS-PAGOS (03-10-2026): sólo con el plan APROBADO. La oferta
          ya trae su enlace antes de aprobar, y la tarjeta verde «Plan
          aprobado» salía debajo de «Primero apruébalo» en un plan sin aprobar. */}
      {wompiLink && estaAprobado && (
        <section className="rounded-md border border-success/30 bg-success-soft p-4">
          <div className="text-sm font-medium text-success">
            {t('inmobiliaria.ai.cobranza.planes.wompiLinkTitle')}
          </div>
          <a
            href={wompiLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block break-all text-sm font-medium text-success underline underline-offset-4 hover:opacity-80"
          >
            {t('inmobiliaria.ai.cobranza.planes.wompiLinkLabel')} →
          </a>
        </section>
      )}

      {/* Rechazar inline form */}
      {rechazarOpen && (
        <section className="space-y-3 rounded-md border border-border bg-surface p-4">
          <div className="space-y-1">
            <span className="block text-sm font-medium text-fg-muted">
              {t('inmobiliaria.ai.cobranza.planes.rechazarForm.reasonLabel')}
            </span>
            <Select
              value={rejectReason || undefined}
              onValueChange={(v) => setRejectReason(v as RejectReasonSlug)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t('inmobiliaria.ai.cobranza.planes.rechazarForm.reasonPlaceholder')}
                />
              </SelectTrigger>
              <SelectContent>
                {REJECT_REASONS.map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {t(`inmobiliaria.ai.cobranza.planes.rechazarForm.reasons.${slug}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value.slice(0, 500))}
            maxLength={500}
            rows={3}
            placeholder={t('inmobiliaria.ai.cobranza.planes.rechazarForm.commentPlaceholder')}
            className="block w-full"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleRechazarSubmit()}
              disabled={!rejectReason || actionLoading}
              isLoading={actionLoading}
              hideArrow
            >
              {t('inmobiliaria.ai.cobranza.planes.rechazarForm.submit')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setRechazarOpen(false)
                setRejectReason('')
                setRejectComment('')
              }}
              hideArrow
            >
              {t('inmobiliaria.ai.cobranza.planes.rechazarForm.cancel')}
            </Button>
          </div>
        </section>
      )}

      {/* Modificar inline form */}
      {modificarOpen && (
        <section className="space-y-3 rounded-md border border-border bg-surface p-4">
          <div>
            <label className="block text-sm font-medium text-fg-muted">
              {t('inmobiliaria.ai.cobranza.planes.modificarForm.descuento')}{' '}
              <span className="ml-1 text-fg-muted">
                {modDiscount}%
              </span>
            </label>
            <Slider
              min={0}
              max={maxDiscount}
              step={1}
              value={[modDiscount]}
              onValueChange={([v]) =>
                setModDiscount(Math.min(maxDiscount, v))
              }
              className="mt-2"
              aria-label={t('inmobiliaria.ai.cobranza.planes.modificarForm.descuento')}
            />
            <div className="mt-1 flex justify-between text-xs text-fg-muted">
              <span>0%</span>
              <span>{maxDiscount}%</span>
            </div>
          </div>
          <label className="block text-sm font-medium text-fg-muted">
            {t('inmobiliaria.ai.cobranza.planes.modificarForm.cuotas')}
            <NumberInput
              min={1}
              max={24}
              grouping={false}
              value={modCuotas}
              onChange={(v) => setModCuotas(Math.max(1, Number.isNaN(v) ? 1 : v))}
              className="mt-1 block w-full"
            />
          </label>
          <label className="block text-sm font-medium text-fg-muted">
            {t('inmobiliaria.ai.cobranza.planes.modificarForm.monto')}
            <NumberInput
              min={1}
              value={modMonto}
              onChange={(v) => setModMonto(Math.max(1, Number.isNaN(v) ? 1 : v))}
              className="mt-1 block w-full"
            />
          </label>
          <label className="block text-sm font-medium text-fg-muted">
            {t('inmobiliaria.ai.cobranza.planes.modificarForm.fecha')}
            <CampoDeDia
              id="payment-plan-approval-client-fecha-1"
              value={modFecha}
              onChange={(v) => setModFecha(v)}
              min={todayIso()}
              className="mt-1 block w-full"
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleModificarSubmit()}
              disabled={actionLoading}
              isLoading={actionLoading}
              hideArrow
            >
              {t('inmobiliaria.ai.cobranza.planes.modificarForm.submit')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setModificarOpen(false)}
              hideArrow
            >
              {t('inmobiliaria.ai.cobranza.planes.modificarForm.cancel')}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
