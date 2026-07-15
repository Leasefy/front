/**
 * Zod schema for the wizard's `policy` step form.
 *
 * This step is INTENTIONALLY MINIMAL. `OnboardingSessionPolicyRequest`
 * (src/lib/api/generated/agency.ts) has 9 optional fields, but the agent only
 * applies a default at `/complete` for 2 of them: `allowedPaymentPlans`
 * (default `[3, 6, 12]`) and `negotiationMaxAttempts` (default `3`). The
 * other 7 (`maxDiscountPct`, `maxPlanMonths`, `minPaymentCop`,
 * `autoEscalateAfterDays`, `allowHardshipPath`, `crmProvider`, `erpProvider`)
 * have no agent-side default and are configured later in the agency panel —
 * this form does not collect them.
 *
 * Same pattern as `agency-step-schema.ts` / `payment-provider-step-schema.ts`
 * — react-hook-form holds the field state, zod is the single source of truth
 * for validation, validated on submit inside `PolicyStepForm`.
 */
import { z } from 'zod'
import type { OnboardingSessionPolicyRequest } from '@/lib/api/generated/agency'

/** Common payment-plan lengths (months) offered as checkboxes. */
export const PAYMENT_PLAN_OPTIONS: number[] = [3, 6, 9, 12, 18, 24]

/**
 * The agent's own defaults, applied at `/complete` if this step sends `{}`.
 * Mirrored here so the form pre-fills the exact values the agent would
 * otherwise apply — the user sees them and can edit before continuing.
 */
export const POLICY_STEP_AGENT_DEFAULTS = {
  allowedPaymentPlans: [3, 6, 12],
  negotiationMaxAttempts: 3,
} as const

export const policyStepSchema = z.object({
  allowedPaymentPlans: z
    .array(z.number().int().positive())
    .min(1, 'Selecciona al menos un plan de pago.'),
  negotiationMaxAttempts: z
    .number({ invalid_type_error: 'Ingresa un número de intentos válido.' })
    .int('El número de intentos debe ser un entero.')
    .positive('El número de intentos debe ser mayor a 0.'),
})

export type PolicyStepFormValues = z.infer<typeof policyStepSchema>

export const POLICY_STEP_DEFAULT_VALUES: PolicyStepFormValues = {
  allowedPaymentPlans: [...POLICY_STEP_AGENT_DEFAULTS.allowedPaymentPlans],
  negotiationMaxAttempts: POLICY_STEP_AGENT_DEFAULTS.negotiationMaxAttempts,
}

export function toPolicyRequest(values: PolicyStepFormValues): OnboardingSessionPolicyRequest {
  return {
    allowedPaymentPlans: values.allowedPaymentPlans,
    negotiationMaxAttempts: values.negotiationMaxAttempts,
  }
}
