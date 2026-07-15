'use client'

import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Checkbox } from '@/components/ui/checkbox'
import type { OnboardingSessionPolicyRequest } from '@/lib/api/generated/agency'
import {
  PAYMENT_PLAN_OPTIONS,
  POLICY_STEP_DEFAULT_VALUES,
  policyStepSchema,
  toPolicyRequest,
  type PolicyStepFormValues,
} from './policy-step-schema'

export interface PolicyStepFormProps {
  isSubmitting: boolean
  onSubmit: (body: OnboardingSessionPolicyRequest) => unknown
  /**
   * Session-level `error.kind === 'validation'` message from the hook (same
   * contract as `AgencyStepForm`'s `submitError` — the backend re-validates
   * and can reject a payload the client-side zod schema accepted).
   */
  submitError?: string | null
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-danger">{message}</p>
}

/**
 * Form for the wizard's `policy` step — INTENTIONALLY MINIMAL. Only exposes
 * the 2 fields the agent applies a default for at `/complete`
 * (`allowedPaymentPlans`, `negotiationMaxAttempts`); see policy-step-schema.ts.
 */
export function PolicyStepForm({ isSubmitting, onSubmit, submitError }: PolicyStepFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<PolicyStepFormValues>({ defaultValues: POLICY_STEP_DEFAULT_VALUES })

  const submit = handleSubmit(async (values) => {
    const parsed = policyStepSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path.join('.') as FieldPath<PolicyStepFormValues>, { message: issue.message })
      }
      return
    }
    await onSubmit(toPolicyRequest(parsed.data))
  })

  return (
    <form noValidate onSubmit={submit} className="space-y-5" data-testid="policy-step-form">
      <p className="text-body-sm text-fg-muted">
        Este es un primer ajuste, opcional, de tu política de cobranza. El resto lo configurás
        después en el panel de tu agencia.
      </p>

      <div>
        <span className="block text-sm font-medium text-fg mb-2">Planes de pago (meses)</span>
        <Controller
          control={control}
          name="allowedPaymentPlans"
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-3" role="group" aria-label="Planes de pago">
              {PAYMENT_PLAN_OPTIONS.map((months) => {
                const checked = field.value.includes(months)
                return (
                  <label
                    key={months}
                    htmlFor={`allowedPaymentPlans-${months}`}
                    className="flex items-center gap-2 text-sm text-fg cursor-pointer"
                  >
                    <Checkbox
                      id={`allowedPaymentPlans-${months}`}
                      data-testid={`policy-plan-${months}`}
                      checked={checked}
                      onCheckedChange={(next) => {
                        const isChecked = next === true
                        const nextValue = isChecked
                          ? [...field.value, months].sort((a, b) => a - b)
                          : field.value.filter((m) => m !== months)
                        field.onChange(nextValue)
                      }}
                    />
                    {months}
                  </label>
                )
              })}
            </div>
          )}
        />
        <FieldError message={errors.allowedPaymentPlans?.message} />
      </div>

      <div>
        <label htmlFor="negotiationMaxAttempts" className="block text-sm font-medium text-fg mb-2">
          Intentos máximos de negociación
        </label>
        <Input
          id="negotiationMaxAttempts"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          className="font-mono tabular-nums"
          {...register('negotiationMaxAttempts', { valueAsNumber: true })}
        />
        <FieldError message={errors.negotiationMaxAttempts?.message} />
      </div>

      {submitError && (
        <div data-testid="policy-step-form-error" className="rounded-md bg-danger-soft border border-border p-3">
          <p className="text-sm text-danger">{submitError}</p>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} hideArrow size="lg" className="w-full">
        {isSubmitting ? (
          <>
            <Spinner size="xs" variant="current" />
            Guardando...
          </>
        ) : (
          <>
            Continuar
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </form>
  )
}
