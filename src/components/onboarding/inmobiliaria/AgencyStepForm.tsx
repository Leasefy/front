'use client'

import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { Spinner } from '@/components/ui/spinner'
import { DEPARTAMENTO_NOMBRES, municipiosDe } from '@/lib/constants/colombia-geo'
import type { OnboardingSessionAgencyRequest } from '@/lib/api/generated/agency'
import {
  AGENCY_STEP_DEFAULT_VALUES,
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
  /**
   * Everything already known about the agency — the pre-step
   * (`OwnerNameStepForm`) razón social/NIT and/or the agent resume draft's
   * `proposedAgencyName`/`contactEmail`/`contactPhone` (see
   * `computeAgencyStepPrefill` in `agency-step-prefill.ts`). Only sets the
   * form's INITIAL values — every field stays fully editable.
   */
  prefill?: Partial<AgencyStepFormValues>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-danger">{message}</p>
}

export function AgencyStepForm({ isSubmitting, onSubmit, submitError, prefill }: AgencyStepFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<AgencyStepFormValues>({
    defaultValues: {
      ...AGENCY_STEP_DEFAULT_VALUES,
      ...prefill,
      address: { ...AGENCY_STEP_DEFAULT_VALUES.address, ...prefill?.address },
    },
  })

  // Municipio options depend on the chosen departamento. Watching the field
  // re-renders the municipio combobox with the right list; changing the
  // departamento clears the municipio (see the departamento onChange below).
  const departamento = watch('address.departamento')
  const departamentoOptions = DEPARTAMENTO_NOMBRES.map((n) => ({ value: n, label: n }))
  const municipioOptions = municipiosDe(departamento).map((m) => ({ value: m, label: m }))

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

      {/* Dirección (contract key `calle`) — full width, free text. */}
      <div>
        <label htmlFor="address.calle" className="block text-sm font-medium text-fg mb-2">
          Dirección <span className="text-danger">*</span>
        </label>
        <Input id="address.calle" type="text" autoComplete="address-line1" {...register('address.calle')} />
        <FieldError message={errors.address?.calle?.message} />
      </div>

      {/* Departamento → Municipio: dependent searchable comboboxes. The
          departamento is chosen first; the municipio list is filtered from it
          (contract key `ciudad`). Changing the departamento clears the
          municipio so a stale pairing can never be submitted. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span id="address-departamento-label" className="block text-sm font-medium text-fg mb-2">
            Departamento <span className="text-danger">*</span>
          </span>
          <Controller
            control={control}
            name="address.departamento"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value || undefined}
                onChange={(next) => {
                  field.onChange(next ?? '')
                  setValue('address.ciudad', '', { shouldDirty: true })
                }}
                options={departamentoOptions}
                placeholder="Selecciona departamento"
                searchPlaceholder="Buscar departamento..."
                invalid={Boolean(errors.address?.departamento)}
              />
            )}
          />
          <FieldError message={errors.address?.departamento?.message} />
        </div>
        <div>
          <span id="address-municipio-label" className="block text-sm font-medium text-fg mb-2">
            Municipio <span className="text-danger">*</span>
          </span>
          <Controller
            control={control}
            name="address.ciudad"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value || undefined}
                onChange={(next) => field.onChange(next ?? '')}
                options={municipioOptions}
                placeholder={departamento ? 'Selecciona municipio' : 'Elige un departamento primero'}
                searchPlaceholder="Buscar municipio..."
                disabled={!departamento}
                invalid={Boolean(errors.address?.ciudad)}
              />
            )}
          />
          <FieldError message={errors.address?.ciudad?.message} />
        </div>
      </div>

      {/* Código postal — full width, optional. */}
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
