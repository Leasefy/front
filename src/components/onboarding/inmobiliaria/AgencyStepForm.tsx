'use client'

import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { OnboardingSessionAgencyRequest } from '@/lib/api/generated/agency'
import {
  AGENCY_STEP_DEFAULT_VALUES,
  BILLING_MODEL_OPTIONS,
  agencyStepSchema,
  toAgencyRequest,
  type AgencyStepFormValues,
} from './agency-step-schema'

export interface AgencyStepFormProps {
  isSubmitting: boolean
  onSubmit: (body: OnboardingSessionAgencyRequest) => unknown
  /**
   * Session-level `error.kind === 'validation'` message from the hook (the
   * backend re-validates and can reject a payload the client-side zod schema
   * accepted). The service doesn't return per-field paths, so this renders
   * as one form-level notice rather than a specific field error.
   */
  submitError?: string | null
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-danger">{message}</p>
}

export function AgencyStepForm({ isSubmitting, onSubmit, submitError }: AgencyStepFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<AgencyStepFormValues>({ defaultValues: AGENCY_STEP_DEFAULT_VALUES })

  const submit = handleSubmit(async (values) => {
    const parsed = agencyStepSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path.join('.') as FieldPath<AgencyStepFormValues>, { message: issue.message })
      }
      return
    }
    await onSubmit(toAgencyRequest(parsed.data))
  })

  return (
    <form noValidate onSubmit={submit} className="space-y-5" data-testid="agency-step-form">
      <div>
        <label htmlFor="legalName" className="block text-sm font-medium text-fg mb-2">
          Razón social <span className="text-danger">*</span>
        </label>
        <Input id="legalName" type="text" autoComplete="organization" {...register('legalName')} />
        <FieldError message={errors.legalName?.message} />
      </div>

      <div>
        <label htmlFor="nit" className="block text-sm font-medium text-fg mb-2">
          NIT <span className="text-danger">*</span>
        </label>
        <Input id="nit" type="text" inputMode="numeric" className="font-mono tabular-nums" {...register('nit')} />
        <FieldError message={errors.nit?.message} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="address.calle" className="block text-sm font-medium text-fg mb-2">
            Calle <span className="text-danger">*</span>
          </label>
          <Input id="address.calle" type="text" autoComplete="address-line1" {...register('address.calle')} />
          <FieldError message={errors.address?.calle?.message} />
        </div>
        <div>
          <label htmlFor="address.ciudad" className="block text-sm font-medium text-fg mb-2">
            Ciudad <span className="text-danger">*</span>
          </label>
          <Input id="address.ciudad" type="text" autoComplete="address-level2" {...register('address.ciudad')} />
          <FieldError message={errors.address?.ciudad?.message} />
        </div>
        <div>
          <label htmlFor="address.departamento" className="block text-sm font-medium text-fg mb-2">
            Departamento <span className="text-danger">*</span>
          </label>
          <Input
            id="address.departamento"
            type="text"
            autoComplete="address-level1"
            {...register('address.departamento')}
          />
          <FieldError message={errors.address?.departamento?.message} />
        </div>
        <div>
          <label htmlFor="address.codigoPostal" className="block text-sm font-medium text-fg mb-2">
            Código postal <span className="text-fg-subtle font-normal">(opcional)</span>
          </label>
          <Input
            id="address.codigoPostal"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            {...register('address.codigoPostal')}
          />
        </div>
      </div>

      <div>
        <label htmlFor="primaryContactEmail" className="block text-sm font-medium text-fg mb-2">
          Correo de contacto principal <span className="text-danger">*</span>
        </label>
        <Input
          id="primaryContactEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          {...register('primaryContactEmail')}
        />
        <FieldError message={errors.primaryContactEmail?.message} />
      </div>

      <div>
        <label htmlFor="primaryContactPhone" className="block text-sm font-medium text-fg mb-2">
          Teléfono de contacto principal <span className="text-danger">*</span>
        </label>
        <Input
          id="primaryContactPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          {...register('primaryContactPhone')}
        />
        <FieldError message={errors.primaryContactPhone?.message} />
      </div>

      <div>
        <label htmlFor="billingModel" className="block text-sm font-medium text-fg mb-2">
          Modelo de facturación <span className="text-danger">*</span>
        </label>
        <Controller
          control={control}
          name="billingModel"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="billingModel">
                <SelectValue placeholder="Selecciona un modelo" />
              </SelectTrigger>
              <SelectContent>
                {BILLING_MODEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.billingModel?.message} />
      </div>

      {submitError && (
        <div
          data-testid="agency-step-form-error"
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
