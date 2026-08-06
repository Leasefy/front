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
   * `computeAgencyStepPrefill` in `agency-step-prefill.ts`).
   *
   * `legalName` + `nit` were already captured (and the NIT is LOCKED once the
   * agency is provisioned — the back ignores later NIT edits), so when they
   * arrive prefilled they render as read-only "confirmed" fields instead of
   * editable inputs. They stay `register`ed (readOnly, not removed), so their
   * values are still sent in the step payload — the agent schema requires
   * `legalName` + `nit`. If a value is missing (edge case), that field
   * degrades to an editable input. Every other field is always editable and
   * only seeded with its initial value.
   */
  prefill?: Partial<AgencyStepFormValues>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-danger">{message}</p>
}

/** A read-only "confirmado" note under a locked field. */
function ConfirmedHint() {
  return (
    <p className="mt-1.5 text-xs text-fg-subtle">Confirmado en el paso anterior · no editable.</p>
  )
}

function hasPrefilledValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
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

<<<<<<< HEAD
  // Municipio options depend on the chosen departamento. Watching the field
  // re-renders the municipio combobox with the right list; changing the
  // departamento clears the municipio (see the departamento onChange below).
  const departamento = watch('address.departamento')
  const departamentoOptions = DEPARTAMENTO_NOMBRES.map((n) => ({ value: n, label: n }))
  const municipioOptions = municipiosDe(departamento).map((m) => ({ value: m, label: m }))
=======
  // Razón social + NIT were captured one screen earlier (and the NIT is
  // locked post-provisioning). When they arrive prefilled, present them as
  // read-only "confirmed" fields — but keep them `register`ed so their values
  // still ship in the payload (the agent schema requires both). Missing values
  // degrade to editable inputs.
  const legalNameConfirmed = hasPrefilledValue(prefill?.legalName)
  const nitConfirmed = hasPrefilledValue(prefill?.nit)
>>>>>>> 5f3dad4a4f8bdf087cec769737a92e2e2b8c9529

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
          Razón social {!legalNameConfirmed && <span className="text-danger">*</span>}
        </label>
        <Input
          id="legalName"
          type="text"
          autoComplete="organization"
          readOnly={legalNameConfirmed}
          aria-readonly={legalNameConfirmed || undefined}
          className={legalNameConfirmed ? 'bg-surface-muted text-fg-subtle cursor-not-allowed' : undefined}
          {...register('legalName')}
        />
        {legalNameConfirmed ? <ConfirmedHint /> : <FieldError message={errors.legalName?.message} />}
      </div>

      <div>
        <label htmlFor="nit" className="block text-sm font-medium text-fg mb-2">
          NIT {!nitConfirmed && <span className="text-danger">*</span>}
        </label>
        <Input
          id="nit"
          type="text"
          inputMode="numeric"
          readOnly={nitConfirmed}
          aria-readonly={nitConfirmed || undefined}
          className={
            nitConfirmed
              ? 'font-mono tabular-nums bg-surface-muted text-fg-subtle cursor-not-allowed'
              : 'font-mono tabular-nums'
          }
          {...register('nit')}
        />
        {nitConfirmed ? <ConfirmedHint /> : <FieldError message={errors.nit?.message} />}
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
