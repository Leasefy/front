'use client'

import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { OnboardingSessionPaymentProviderRequest } from '@/lib/api/generated/agency'
import {
  PAYMENT_PROVIDER_OPTIONS,
  PAYMENT_PROVIDER_STEP_DEFAULT_VALUES,
  paymentProviderStepSchema,
  toPaymentProviderRequest,
  type PaymentProviderStepFormValues,
} from './payment-provider-step-schema'

export interface PaymentProviderStepFormProps {
  isSubmitting: boolean
  onSubmit: (body: OnboardingSessionPaymentProviderRequest) => unknown
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

export function PaymentProviderStepForm({ isSubmitting, onSubmit, submitError }: PaymentProviderStepFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<PaymentProviderStepFormValues>({ defaultValues: PAYMENT_PROVIDER_STEP_DEFAULT_VALUES })

  const submit = handleSubmit(async (values) => {
    const parsed = paymentProviderStepSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path.join('.') as FieldPath<PaymentProviderStepFormValues>, { message: issue.message })
      }
      return
    }
    await onSubmit(toPaymentProviderRequest(parsed.data))
  })

  return (
    <form noValidate onSubmit={submit} className="space-y-5" data-testid="payment-provider-step-form">
      <p className="text-body-sm text-fg-muted">
        Conecta la pasarela de pago que usará tu inmobiliaria para cobrar los arriendos.
      </p>

      <div>
        <label htmlFor="provider" className="block text-sm font-medium text-fg mb-2">
          Pasarela de pago <span className="text-danger">*</span>
        </label>
        <Controller
          control={control}
          name="provider"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Selecciona una pasarela" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_PROVIDER_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    data-testid={`payment-provider-option-${option.value}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.provider?.message} />
      </div>

      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium text-fg mb-2">
          API key <span className="text-danger">*</span>
        </label>
        {/*
          SECURITY: payment-gateway secret. type="password" + autoComplete="off"
          so browsers don't offer to save/fill it; never persisted to
          localStorage or logged — only held in RHF state and sent via
          submitPaymentProvider (HTTPS) to the agent, which seals it with
          KMS server-side.
        */}
        <Input id="apiKey" type="password" autoComplete="off" {...register('apiKey')} />
        <FieldError message={errors.apiKey?.message} />
      </div>

      <div>
        <label htmlFor="eventSecret" className="block text-sm font-medium text-fg mb-2">
          Event secret <span className="text-danger">*</span>
        </label>
        <Input id="eventSecret" type="password" autoComplete="off" {...register('eventSecret')} />
        <FieldError message={errors.eventSecret?.message} />
      </div>

      <div>
        <label htmlFor="publicKey" className="block text-sm font-medium text-fg mb-2">
          Public key <span className="text-fg-subtle font-normal">(opcional)</span>
        </label>
        <Input id="publicKey" type="text" autoComplete="off" {...register('publicKey')} />
        <FieldError message={errors.publicKey?.message} />
      </div>

      {/*
        TODO: CONFIRMAR con back — ¿el agent valida las credenciales contra
        Wompi/Bold al recibirlas (feedback de validez), o solo las sella?
        ¿Existe modo sandbox/test? Por ahora este form solo captura y envía;
        no valida la credencial contra la pasarela.
      */}

      {submitError && (
        <div
          data-testid="payment-provider-step-form-error"
          className="rounded-md bg-danger-soft border border-border p-3"
        >
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
