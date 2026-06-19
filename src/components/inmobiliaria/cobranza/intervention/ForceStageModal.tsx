'use client'

/**
 * ForceStageModal — Phase 31 plan 31-09 (D-31-02, admin-only).
 *
 * POSTs to /api/agency/:agencyId/cobranza/debtors/:debtorId/force-stage.
 * Admin defense-in-depth: parent CTA gates on admin role + cobranza:force-stage;
 * this modal re-checks `canAccess('cobranza','force-stage')` and renders the
 * "Acceso denegado" state if false. Confirm uses amber accent.
 */

import * as React from 'react'
import { useEffect, useState } from 'react'

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { CARTERA_STAGES, type CarteraStage } from '@/lib/cartera'

void React

interface ForceStageModalProps {
  open: boolean
  onClose: () => void
  debtorId: string
  debtorName: string
  currentStage: CarteraStage
  onSuccess: () => void
}

export function ForceStageModal({
  open,
  onClose,
  debtorId,
  currentStage,
  onSuccess,
}: ForceStageModalProps) {
  const { t } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const perms = usePermissionsContextSafe()
  const allowed = perms?.canAccess('cobranza', 'force-stage') ?? false

  const initialTarget = CARTERA_STAGES.find((s) => s !== currentStage) ?? 'S0'

  const [target, setTarget] = useState<CarteraStage>(initialTarget)
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTarget(initialTarget)
      setReason('')
      setError(null)
    }
  }, [open, initialTarget])

  if (!open) return null

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  const envMissing = !agentUrl || !agencyId

  const handleSubmit = async () => {
    setError(null)
    if (envMissing) {
      setError(t('inmobiliaria.ai.cobranza.detail.acciones.envMissing'))
      return
    }
    if (reason.trim().length < 10) {
      setError('Min 10 characters')
      return
    }
    setSubmitting(true)
    try {
      const res = await globalThis.fetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/force-stage`,
        {
          method: 'POST',
          headers: agentAuthHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({ target_stage: target, reason: reason.trim() }),
        },
      )
      if (!res.ok) {
        setError(`${res.status}`)
        return
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('inmobiliaria.ai.cobranza.detail.acciones.genericError'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-stage-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl p-6">
        <h2
          id="force-stage-title"
          className="text-base font-semibold text-neutral-900 dark:text-white"
        >
          {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.modalTitle')}
        </h2>

        {!allowed ? (
          <p className="mt-3 text-sm text-[#C4503B] dark:text-[#E0664D]">
            {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.accessDenied')}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.modalDescription')}
            </p>
            {envMissing ? (
              <p className="mt-3 text-sm text-[#B7791F] dark:text-[#D2992F]">
                {t('inmobiliaria.ai.cobranza.detail.acciones.envMissing')}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.targetLabel')}
                  </span>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value as CarteraStage)}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
                  >
                    {CARTERA_STAGES.filter((s) => s !== currentStage).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.reasonLabel')}
                  </span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    minLength={10}
                    placeholder={t(
                      'inmobiliaria.ai.cobranza.detail.acciones.forceStage.reasonPlaceholder',
                    )}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
                  />
                </label>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="mt-3 text-xs text-[#C4503B] dark:text-[#E0664D]">{error}</p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium rounded-sm border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {t('inmobiliaria.ai.cobranza.detail.pii.modalCancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || envMissing || !allowed}
            className="px-3 py-1.5 text-sm font-medium rounded-sm bg-[#B7791F] text-white hover:bg-[#B7791F] disabled:opacity-50"
          >
            {submitting
              ? t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.confirming')
              : t('inmobiliaria.ai.cobranza.detail.acciones.forceStage.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
