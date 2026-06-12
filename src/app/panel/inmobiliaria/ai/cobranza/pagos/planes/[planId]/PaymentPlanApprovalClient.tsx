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
 */

import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

import { useI18n } from '@/lib/i18n'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import {
  usePaymentPlanApproval,
  type RejectReasonSlug,
} from '@/lib/hooks/cobranza/use-payment-plan-approval'
import { usePaymentsFunnelRealtime } from '@/lib/hooks/cobranza/use-payments-funnel-realtime'

void React

const REJECT_REASONS: RejectReasonSlug[] = [
  'discount_too_high',
  'debtor_history_poor',
  'wrong_cuota_count',
  'policy_violation',
  'out_of_scope',
  'other',
]

const copFormat = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function formatCop(value: number | null | undefined): string {
  if (value == null) return '—'
  return copFormat.format(value)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
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

  // Sync wompiLink from plan (in case refetch picks up another operator's approve).
  useEffect(() => {
    if (plan?.wompiLink) setWompiLink(plan.wompiLink)
  }, [plan?.wompiLink])

  const envMissing = !process.env.NEXT_PUBLIC_AGENT_URL

  // ── Early returns ─────────────────────────────────────────────────────────

  if (envMissing) {
    return (
      <div className="p-4 lg:p-8">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
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
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200">
          {t('inmobiliaria.ai.cobranza.planes.loadError')}
        </div>
      </div>
    )
  }

  if (!plan) return null

  const maxDiscount = plan.agency.maxDiscount
  const isPending = plan.status === 'offered' || plan.status === 'pending'

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
        setActionError(res.error)
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
        setActionError(res.error)
      } else {
        setRechazarOpen(false)
        setRejectReason('')
        setRejectComment('')
        setToast(t('inmobiliaria.ai.cobranza.planes.rechazarForm.success'))
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'reject failed')
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
          res.error.startsWith('DUPLICATE_PLAN_RISK')
            ? t('inmobiliaria.ai.cobranza.planes.modificarForm.duplicateRisk')
            : res.error,
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {t('inmobiliaria.ai.cobranza.planes.title')}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              {plan.debtor.nombreMasked || '—'}
            </span>
            <span>·</span>
            <Mask field="cedula" value={plan.debtor.cedulaMasked} />
          </div>
        </div>
        <Link
          href={`/panel/inmobiliaria/ai/cobranza/deudores/${plan.debtor.id}`}
          className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-violet-400 hover:text-violet-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-violet-500"
        >
          {t('inmobiliaria.ai.cobranza.planes.verDeudor')} →
        </Link>
      </header>

      {/* Comparison panel */}
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-medium uppercase text-neutral-500 dark:bg-neutral-950/50 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2">
                {t('inmobiliaria.ai.cobranza.planes.comparisonHeader.campo')}
              </th>
              <th className="px-4 py-2">
                {t('inmobiliaria.ai.cobranza.planes.comparisonHeader.propuesto')}
              </th>
              <th className="px-4 py-2">
                {t('inmobiliaria.ai.cobranza.planes.comparisonHeader.limite')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            <tr>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                {t('inmobiliaria.ai.cobranza.planes.comparison.descuento')}
              </td>
              <td
                className={`px-4 py-3 font-medium ${
                  isMaxDiscountExceeded
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-neutral-900 dark:text-neutral-100'
                }`}
              >
                {plan.proposed.discount}%
              </td>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                {maxDiscount}%
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                {t('inmobiliaria.ai.cobranza.planes.comparison.cuotas')}
              </td>
              <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                {plan.proposed.cuotas}
              </td>
              <td className="px-4 py-3 text-neutral-500">—</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                {t('inmobiliaria.ai.cobranza.planes.comparison.monto')}
              </td>
              <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                {formatCop(plan.proposed.montoPorCuota)}
              </td>
              <td className="px-4 py-3 text-neutral-500">—</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                {t('inmobiliaria.ai.cobranza.planes.comparison.fecha')}
              </td>
              <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                {plan.proposed.fechaPrimerPago || '—'}
              </td>
              <td className="px-4 py-3 text-neutral-500">—</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Hard-block banner */}
      {isMaxDiscountExceeded && (
        <div
          data-testid="max-discount-banner"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200"
        >
          <div className="font-medium">
            {t('inmobiliaria.ai.cobranza.planes.maxDiscountBanner', {
              max: maxDiscount,
            })}
          </div>
          <Link
            href="/panel/inmobiliaria/configuracion/agencia"
            className="mt-2 inline-block text-sm font-medium underline hover:text-red-900 dark:hover:text-red-100"
          >
            {t('inmobiliaria.ai.cobranza.planes.configLink')} →
          </Link>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="approval-aprobar-plan"
          onClick={() => void handleAprobar()}
          disabled={aprobarDisabled}
          title={aprobarDisabledTitle || undefined}
          className="inline-flex items-center rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-neutral-300 dark:disabled:bg-neutral-700"
        >
          {t('inmobiliaria.ai.cobranza.planes.aprobar')}
        </button>
        <button
          type="button"
          data-testid="approval-rechazar-plan"
          onClick={openRechazar}
          disabled={actionsDisabled}
          title={!canApprove ? t('inmobiliaria.ai.cobranza.planes.aprobarDisabledPerm') : undefined}
          className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:border-red-400 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
        >
          {t('inmobiliaria.ai.cobranza.planes.rechazar')}
        </button>
        <button
          type="button"
          data-testid="approval-modificar-plan"
          onClick={openModificar}
          disabled={actionsDisabled}
          title={!canApprove ? t('inmobiliaria.ai.cobranza.planes.aprobarDisabledPerm') : undefined}
          className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:border-violet-400 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
        >
          {t('inmobiliaria.ai.cobranza.planes.modificar')}
        </button>
      </div>

      {actionError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200">
          {actionError}
        </div>
      )}

      {toast && (
        <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-700 dark:bg-green-950/30 dark:text-green-200">
          {toast}
        </div>
      )}

      {/* Wompi link panel — populated after approve success */}
      {wompiLink && (
        <section className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-950/30">
          <div className="text-sm font-medium text-green-900 dark:text-green-100">
            {t('inmobiliaria.ai.cobranza.planes.wompiLinkTitle')}
          </div>
          <a
            href={wompiLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block break-all text-sm font-medium text-green-800 underline hover:text-green-900 dark:text-green-200 dark:hover:text-green-100"
          >
            {t('inmobiliaria.ai.cobranza.planes.wompiLinkLabel')} →
          </a>
        </section>
      )}

      {/* Rechazar inline form */}
      {rechazarOpen && (
        <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {t('inmobiliaria.ai.cobranza.planes.rechazarForm.reasonLabel')}
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value as RejectReasonSlug | '')}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            >
              <option value="">
                {t('inmobiliaria.ai.cobranza.planes.rechazarForm.reasonPlaceholder')}
              </option>
              {REJECT_REASONS.map((slug) => (
                <option key={slug} value={slug}>
                  {t(`inmobiliaria.ai.cobranza.planes.rechazarForm.reasons.${slug}`)}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value.slice(0, 500))}
            maxLength={500}
            rows={3}
            placeholder={t('inmobiliaria.ai.cobranza.planes.rechazarForm.commentPlaceholder')}
            className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleRechazarSubmit()}
              disabled={!rejectReason || actionLoading}
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-300 dark:disabled:bg-neutral-700"
            >
              {t('inmobiliaria.ai.cobranza.planes.rechazarForm.submit')}
            </button>
            <button
              type="button"
              onClick={() => {
                setRechazarOpen(false)
                setRejectReason('')
                setRejectComment('')
              }}
              className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            >
              {t('inmobiliaria.ai.cobranza.planes.rechazarForm.cancel')}
            </button>
          </div>
        </section>
      )}

      {/* Modificar inline form */}
      {modificarOpen && (
        <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
              {t('inmobiliaria.ai.cobranza.planes.modificarForm.descuento')}{' '}
              <span className="ml-1 text-violet-700 dark:text-violet-400">
                {modDiscount}%
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={maxDiscount}
              step={1}
              value={modDiscount}
              onChange={(e) =>
                setModDiscount(Math.min(maxDiscount, Number(e.target.value)))
              }
              className="mt-2 block w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-neutral-500">
              <span>0%</span>
              <span>{maxDiscount}%</span>
            </div>
          </div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {t('inmobiliaria.ai.cobranza.planes.modificarForm.cuotas')}
            <input
              type="number"
              min={1}
              max={24}
              value={modCuotas}
              onChange={(e) => setModCuotas(Math.max(1, Number(e.target.value)))}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {t('inmobiliaria.ai.cobranza.planes.modificarForm.monto')}
            <input
              type="number"
              min={1}
              value={modMonto}
              onChange={(e) => setModMonto(Math.max(1, Number(e.target.value)))}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {t('inmobiliaria.ai.cobranza.planes.modificarForm.fecha')}
            <input
              type="date"
              min={todayIso()}
              value={modFecha}
              onChange={(e) => setModFecha(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleModificarSubmit()}
              disabled={actionLoading}
              className="inline-flex items-center rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-neutral-300 dark:disabled:bg-neutral-700"
            >
              {t('inmobiliaria.ai.cobranza.planes.modificarForm.submit')}
            </button>
            <button
              type="button"
              onClick={() => setModificarOpen(false)}
              className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            >
              {t('inmobiliaria.ai.cobranza.planes.modificarForm.cancel')}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
