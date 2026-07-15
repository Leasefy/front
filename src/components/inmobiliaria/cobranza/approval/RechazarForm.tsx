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
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
      className="space-y-3 rounded-md border border-border bg-surface p-4"
    >
      <div className="space-y-1">
        <span className="block text-sm font-medium text-fg-muted">
          {t('inmobiliaria.ai.cobranza.approval.rechazarForm.reasonLabel')}
        </span>
        <Select
          value={reason || undefined}
          onValueChange={(v) => setReason(v as RejectReasonSlug)}
        >
          <SelectTrigger data-testid="rechazar-reason" className="w-full">
            <SelectValue
              placeholder={t('inmobiliaria.ai.cobranza.approval.rechazarForm.reasonPlaceholder')}
            />
          </SelectTrigger>
          <SelectContent>
            {REJECT_REASONS.map((slug) => (
              <SelectItem key={slug} value={slug}>
                {t(`inmobiliaria.ai.cobranza.approval.rechazarForm.reason.${slug}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="block text-sm font-medium text-fg-muted">
        {t('inmobiliaria.ai.cobranza.approval.rechazarForm.commentLabel')}
        <Textarea
          data-testid="rechazar-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          maxLength={MAX_COMMENT}
          rows={3}
          className="mt-1 block w-full"
        />
        <span className="mt-1 block text-xs text-fg-subtle">
          {t('inmobiliaria.ai.cobranza.approval.rechazarForm.charsRemaining', {
            remaining,
          })}
        </span>
      </label>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          hideArrow
          data-testid="rechazar-confirm"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {t('inmobiliaria.ai.cobranza.approval.rechazarForm.confirm')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          hideArrow
          data-testid="rechazar-cancel"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('inmobiliaria.ai.cobranza.approval.rechazarForm.cancel')}
        </Button>
      </div>
    </section>
  )
}

export default RechazarForm
