'use client'

import { useEffect } from 'react'
import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { formatearNitAlEscribir } from '@/lib/onboarding/nit'
import { borrarBorradorLocal, guardarBorradorLocal, leerBorradorLocal } from './borrador-local'
import { PhoneInput } from '@leasefy/cadence'
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
  pistaDelTelefono,
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
  /**
   * Con la sesión, lo escrito y no enviado se guarda como borrador local y
   * vuelve al devolverse de paso (ver `borrador-local.ts`). Sin ella (pruebas,
   * usos sueltos) el formulario se comporta como siempre.
   */
  sessionId?: string
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p role="alert" className="mt-1.5 text-caption text-danger">{message}</p>
}

/** A read-only "confirmado" note under a locked field. */
function ConfirmedHint() {
  return (
    <p className="mt-1.5 text-caption text-fg-subtle">Confirmado en el paso anterior · no editable.</p>
  )
}

function hasPrefilledValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function AgencyStepForm({ isSubmitting, onSubmit, submitError, prefill, sessionId }: AgencyStepFormProps) {
  // Lo escrito y no enviado la última vez pisa al prefill: es lo más reciente.
  // (Los campos confirmados son readOnly, así que su borrador == su prefill.)
  const borrador = sessionId ? leerBorradorLocal<AgencyStepFormValues>(sessionId, 'agency') : null
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
      ...borrador,
      address: {
        ...AGENCY_STEP_DEFAULT_VALUES.address,
        ...prefill?.address,
        ...borrador?.address,
      },
    },
  })

  // Cada tecla actualiza el borrador local del paso.
  useEffect(() => {
    if (!sessionId) return
    const sub = watch((valores) => guardarBorradorLocal(sessionId, 'agency', valores))
    return () => sub.unsubscribe()
  }, [watch, sessionId])
  // El país vive en el formulario (no en un `useState` aparte) para que el
  // esquema valide el largo del número con él.
  const paisDelTelefono = watch('primaryContactCountry') || 'CO'

  // Municipio options depend on the chosen departamento. Watching the field
  // re-renders the municipio combobox with the right list; changing the
  // departamento clears the municipio (see the departamento onChange below).
  const departamento = watch('address.departamento')
  const departamentoOptions = DEPARTAMENTO_NOMBRES.map((n) => ({ value: n, label: n }))
  const municipioOptions = municipiosDe(departamento).map((m) => ({ value: m, label: m }))

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
    const resultado = await onSubmit(toAgencyRequest(parsed.data))
    // Enviado con éxito: el borrador de verdad ya vive en el back.
    if (resultado && sessionId) borrarBorradorLocal(sessionId, 'agency')
  })

  return (
    <form noValidate onSubmit={submit} className="space-y-5" data-testid="agency-step-form">
      <div>
        <label htmlFor="legalName" className="mb-1.5 block text-caption font-semibold text-fg">
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
        <label htmlFor="nit" className="mb-1.5 block text-caption font-semibold text-fg">
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
          {...register('nit', {
            // El guion lo pone el campo al noveno dígito; la persona sólo
            // teclea números. `setValue` y no mutar el evento: RHF ya leyó.
            onChange: (e) =>
              setValue('nit', formatearNitAlEscribir(String(e.target.value)), {
                shouldValidate: true,
              }),
          })}
        />
        {nitConfirmed ? <ConfirmedHint /> : <FieldError message={errors.nit?.message} />}
      </div>

      {/* Dirección (contract key `calle`) — full width, free text. */}
      <div>
        <label htmlFor="address.calle" className="mb-1.5 block text-caption font-semibold text-fg">
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
          <span id="address-departamento-label" className="mb-1.5 block text-caption font-semibold text-fg">
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
          <span id="address-municipio-label" className="mb-1.5 block text-caption font-semibold text-fg">
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
        <label htmlFor="address.codigoPostal" className="mb-1.5 block text-caption font-semibold text-fg">
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
        <label htmlFor="primaryContactEmail" className="mb-1.5 block text-caption font-semibold text-fg">
          Correo de la cuenta <span className="text-danger">*</span>
        </label>
        <Input
          id="primaryContactEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          {...register('primaryContactEmail')}
        />
        {/* No es «el del representante legal» (eso se preguntó antes): queda
            asociado a la cuenta de la inmobiliaria y es a donde el micro manda
            el reporte diario de cartera y los avisos (Nico, 30-09-2026). */}
        <p className="mt-1.5 text-caption text-fg-subtle">
          Queda asociado a la cuenta de la inmobiliaria: ahí te llegan los reportes y avisos de Leasefy.
        </p>
        <FieldError message={errors.primaryContactEmail?.message} />
      </div>

      <div>
        <label htmlFor="primaryContactPhone" className="mb-1.5 block text-caption font-semibold text-fg">
          Teléfono de la cuenta <span className="text-danger">*</span>
        </label>
        {/* Con selector de país y su indicativo (Nico, 2026-09-07). El valor
            que viaja al back sigue siendo el número sin indicativo, igual que
            antes; el país queda en el formulario y el esquema valida con él
            cuántos dígitos tiene un número de ese país. */}
        <Controller
          control={control}
          name="primaryContactPhone"
          render={({ field }) => (
            <PhoneInput
              id="primaryContactPhone"
              autoComplete="tel"
              inputMode="numeric"
              countryCode={paisDelTelefono}
              onCountryChange={(codigo) =>
                setValue('primaryContactCountry', codigo, { shouldValidate: false })
              }
              value={field.value ?? ''}
              // El PhoneInput del DS entrega el texto tal cual (dejaba
              // escribir letras — Nico, 30-09): acá solo pasan dígitos.
              onChange={(v) => field.onChange(v.replace(/\D/g, ''))}
              onBlur={field.onBlur}
              invalid={Boolean(errors.primaryContactPhone)}
            />
          )}
        />
        {errors.primaryContactPhone?.message ? (
          <FieldError message={errors.primaryContactPhone.message} />
        ) : (
          <p className="mt-1.5 text-caption text-fg-subtle">{pistaDelTelefono(paisDelTelefono)}</p>
        )}
      </div>

      {submitError && (
        <div
          data-testid="agency-step-form-error"
          className="rounded-md border border-danger/20 bg-danger-soft p-3"
        >
          <p className="text-sm text-danger">{submitError}</p>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} hideArrow className="w-full">
        {isSubmitting ? (
          <>
            <Spinner size="xs" variant="current" />
            Guardando...
          </>
        ) : (
          <>
            Continuar
            <ArrowRight className="w-4 h-4" weight="bold" aria-hidden />
          </>
        )}
      </Button>
    </form>
  )
}
