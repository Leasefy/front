'use client'

import { useForm, type FieldPath } from 'react-hook-form'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
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
    setError,
    formState: { errors },
  } = useForm<AgencyStepFormValues>({
    defaultValues: {
      ...AGENCY_STEP_DEFAULT_VALUES,
      ...prefill,
      address: { ...AGENCY_STEP_DEFAULT_VALUES.address, ...prefill?.address },
    },
  })

  // Razón social + NIT were captured one screen earlier (and the NIT is
  // locked post-provisioning). When they arrive prefilled, present them as
  // read-only "confirmed" fields — but keep them `register`ed so their values
  // still ship in the payload (the agent schema requires both). Missing values
  // degrade to editable inputs.
  const legalNameConfirmed = hasPrefilledValue(prefill?.legalName)
  const nitConfirmed = hasPrefilledValue(prefill?.nit)

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
