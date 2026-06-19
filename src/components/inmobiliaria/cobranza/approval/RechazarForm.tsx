'use client'

/**
 * RechazarForm — Phase 32 plan 32-09 (COBR-UI-07 / COBR-UI-08 / XR-05).
 *
 * Shared inline Rechazar form used by:
 *  - PaymentPlanApprovalClient (32-08, decisionType='payment_plan')
 *  - SiniestroApprovalClient   (32-09, decisionType='siniestro')
 *  - CartaApprovalClient       (32-09, decisionType='carta')
 *
 * Contract:
 *  - Canned-reason dropdown (6 slugs) — Confirmar disabled until selected.
 *  - Optional free-text textarea, maxLength 500 (HTML + runtime slice).
 *  - i18n keys under inmobiliaria.ai.cobranza.approval.rechazarForm.*.
 *  - Caller controls visibility (no modal wrapper).
 */

import * as React from 'react'
import { useState } from 'react'

import { useI18n } from '@/lib/i18n'

void React

export type RejectReasonSlug =
  | 'discount_too_high'
  | 'debtor_history_poor'
  | 'wrong_cuota_count'
  | 'policy_violation'
  | 'out_of_scope'
  | 'other'

export const REJECT_REASONS: ReadonlyArray<RejectReasonSlug> = [
  'discount_too_high',
  'debtor_history_poor',
  'wrong_cuota_count',
  'policy_violation',
  'out_of_scope',
  'other',
]

export type RechazarDecisionType = 'siniestro' | 'carta' | 'payment_plan'

export interface RechazarFormProps {
  /** Discriminates which approval surface this form is rendering inside. */
  decisionType: RechazarDecisionType
  onSubmit: (data: { reject_reason: RejectReasonSlug; reject_comment?: string }) => void
  onCancel: () => void
  isSubmitting?: boolean
}

const MAX_COMMENT = 500

export function RechazarForm({
  decisionType,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: RechazarFormProps): React.ReactElement {
  // decisionType is reserved for future per-surface tweaks (e.g. reason set
  // tailored per surface). Currently the 6-slug list is shared; we still
  // accept the prop so callers must pass a discriminator (compile-time guard).
  void decisionType

  const { t } = useI18n()
  const [reason, setReason] = useState<RejectReasonSlug | ''>('')
  const [comment, setComment] = useState<string>('')

  const trimmed = comment.trim()
  const remaining = MAX_COMMENT - comment.length
  const canSubmit = reason !== '' && !isSubmitting

  const handleSubmit = (): void => {
    if (!reason) return
    if (comment.length > MAX_COMMENT) return
    onSubmit({
      reject_reason: reason,
      reject_comment: trimmed.length > 0 ? trimmed : undefined,
    })
  }

  return (
    <section
      data-testid="rechazar-form"
      className="space-y-3 rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
        {t('inmobiliaria.ai.cobranza.approval.rechazarForm.reasonLabel')}
        <select
          data-testid="rechazar-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as RejectReasonSlug | '')}
          className="mt-1 block w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        >
          <option value="">
            {t('inmobiliaria.ai.cobranza.approval.rechazarForm.reasonPlaceholder')}
          </option>
          {REJECT_REASONS.map((slug) => (
            <option key={slug} value={slug}>
              {t(`inmobiliaria.ai.cobranza.approval.rechazarForm.reason.${slug}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
        {t('inmobiliaria.ai.cobranza.approval.rechazarForm.commentLabel')}
        <textarea
          data-testid="rechazar-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          maxLength={MAX_COMMENT}
          rows={3}
          className="mt-1 block w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
        <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.ai.cobranza.approval.rechazarForm.charsRemaining', {
            remaining,
          })}
        </span>
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          data-testid="rechazar-confirm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center rounded-sm bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger disabled:cursor-not-allowed disabled:bg-neutral-300 dark:disabled:bg-neutral-700"
        >
          {t('inmobiliaria.ai.cobranza.approval.rechazarForm.confirm')}
        </button>
        <button
          type="button"
          data-testid="rechazar-cancel"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex items-center rounded-sm border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
        >
          {t('inmobiliaria.ai.cobranza.approval.rechazarForm.cancel')}
        </button>
      </div>
    </section>
  )
}

export default RechazarForm
