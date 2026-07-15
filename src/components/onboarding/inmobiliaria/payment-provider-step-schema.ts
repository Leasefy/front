/**
 * Zod schema for the wizard's `payment_provider` step form.
 *
 * Mirrors `OnboardingSessionPaymentProviderRequest` / `OnboardingSessionPaymentCredentials`
 * (src/lib/api/generated/agency.ts) field-for-field. Same pattern as
 * `agency-step-schema.ts` / `members-step-schema.ts` — react-hook-form holds
 * the field state, zod is the single source of truth for validation,
 * validated on submit inside `PaymentProviderStepForm`.
 *
 * SECURITY: `apiKey` / `eventSecret` are payment-gateway secrets. Nothing in
 * this module persists them (no localStorage, no logging) — they only flow
 * through react-hook-form state in memory and are sent via
 * `submitPaymentProvider` (HTTPS) to the agent, which seals them with KMS
 * server-side.
 */
import { z } from 'zod'
import type { OnboardingSessionPaymentProviderRequest } from '@/lib/api/generated/agency'

export type PaymentProvider = 'wompi' | 'bold'

export const PAYMENT_PROVIDER_OPTIONS: { value: PaymentProvider; label: string }[] = [
  { value: 'wompi', label: 'Wompi' },
  { value: 'bold', label: 'Bold' },
]

export const paymentProviderStepSchema = z.object({
  provider: z.enum(['wompi', 'bold'], {
    errorMap: () => ({ message: 'Selecciona una pasarela de pago.' }),
  }),
  apiKey: z.string().trim().min(1, 'La API key es obligatoria.'),
  eventSecret: z.string().trim().min(1, 'El event secret es obligatorio.'),
  publicKey: z.string().trim().optional(),
})

export type PaymentProviderStepFormValues = z.infer<typeof paymentProviderStepSchema>

export const PAYMENT_PROVIDER_STEP_DEFAULT_VALUES: PaymentProviderStepFormValues = {
  provider: 'wompi',
  apiKey: '',
  eventSecret: '',
  publicKey: '',
}

/** Drops the empty-string `publicKey` so it's omitted, not sent as `''`. */
export function toPaymentProviderRequest(
  values: PaymentProviderStepFormValues,
): OnboardingSessionPaymentProviderRequest {
  return {
    provider: values.provider,
    credentials: {
      apiKey: values.apiKey,
      eventSecret: values.eventSecret,
      ...(values.publicKey ? { publicKey: values.publicKey } : {}),
    },
  }
}
