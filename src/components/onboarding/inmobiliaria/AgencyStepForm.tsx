'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { aplicarErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { formatearNitAlEscribir } from '@/lib/onboarding/nit'
import { borrarBorradorLocal, guardarBorradorLocal, leerBorradorLocal } from './borrador-local'
import { PhoneInput } from '@leasefy/cadence'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { Spinner } from '@/components/ui/spinner'
import { DEPARTAMENTO_NOMBRES, municipiosDe } from '@/lib/constants/colombia-geo'
import {
  EJEMPLO_DE_DIRECCION,
  errorDeCodigoPostal,
  limpiarCodigoPostalAlEscribir,
} from '@/lib/direccion/direccion'
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
   * accepted). Se pinta como un aviso del formulario. Si llega
   * `errorDelServidor`, manda él.
   */
  submitError?: string | null
  /**
   * 02-10-2026 · El 400 del micro, entero (`OnboardingSessionError`, que trae
   * los `campos` del sobre `DATOS_INVALIDOS`). Cada problema va a SU campo con
   * `aplicarErroresDelServidor` y el primero recibe el foco; al aviso del
   * formulario va SÓLO lo que no tiene campo (o un campo confirmado, que no se
   * puede editar acá).
   */
  errorDelServidor?: unknown
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

/** A read-only "confirmado" note under a locked field. */
function ConfirmedHint() {
  return (
    <p className="mt-1.5 text-caption text-fg-subtle">Confirmado en el paso anterior · no editable.</p>
  )
}

function hasPrefilledValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/** Los campos del paso que el micro puede rechazar, con su ruta en el cuerpo (`toAgencyRequest`). */
const CAMPOS_EDITABLES_DEL_PASO = [
  'address.calle',
  'address.ciudad',
  'address.departamento',
  'address.codigoPostal',
  'primaryContactEmail',
  'primaryContactPhone',
] as const satisfies readonly FieldPath<AgencyStepFormValues>[]

export function AgencyStepForm({
  isSubmitting,
  onSubmit,
  submitError,
  errorDelServidor,
  prefill,
  sessionId,
}: AgencyStepFormProps) {
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
    setFocus,
    clearErrors,
    getValues,
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
  /** El error del código postal según la regla, o ninguno. */
  const revisarCodigoPostal = (mensaje: string | null) => {
    if (mensaje) setError('address.codigoPostal', { message: mensaje })
    else clearErrors('address.codigoPostal')
  }

  const legalNameConfirmed = hasPrefilledValue(prefill?.legalName)
  const nitConfirmed = hasPrefilledValue(prefill?.nit)

  // Los campos que el formulario deja corregir: un error en la razón social o
  // el NIT confirmados no tiene dónde ir (son de solo lectura) y va al aviso.
  const camposConError = useMemo<FieldPath<AgencyStepFormValues>[]>(
    () => [
      ...(legalNameConfirmed ? [] : (['legalName'] as const)),
      ...(nitConfirmed ? [] : (['nit'] as const)),
      ...CAMPOS_EDITABLES_DEL_PASO,
    ],
    [legalNameConfirmed, nitConfirmed],
  )

  // El 400 del micro: cada problema a su campo; lo suelto, al aviso.
  const [sueltosDelServidor, setSueltosDelServidor] = useState<string[]>([])
  useEffect(() => {
    if (!errorDelServidor) {
      setSueltosDelServidor([])
      return
    }
    const reparto = aplicarErroresDelServidor<FieldPath<AgencyStepFormValues>>(
      errorDelServidor,
      // `setError` envuelto: el de react-hook-form pide `{ shouldFocus: boolean }`
      // y `FormularioConErrores` declara `shouldFocus?` (pedido al principal).
      { setError: (campo, error) => setError(campo, error), setFocus },
      {
        campos: camposConError,
        toast: false,
        accion: 'guardar los datos de la agencia',
        porDefecto: 'No pudimos guardar los datos de la agencia. Revisa los campos e intenta de nuevo.',
      },
    )
    setSueltosDelServidor(reparto.sueltos)
    // Sólo cuando llega un error nuevo: `camposConError` sale del prefill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorDelServidor])

  const avisoDelFormulario = errorDelServidor !== undefined
    ? sueltosDelServidor.join(' · ') || null
    : submitError

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
          invalid={!legalNameConfirmed && Boolean(errors.legalName)}
          aria-invalid={(!legalNameConfirmed && Boolean(errors.legalName)) || undefined}
          aria-describedby={!legalNameConfirmed && errors.legalName ? 'legalName-error' : undefined}
          {...register('legalName')}
        />
        {legalNameConfirmed ? (
          <ConfirmedHint />
        ) : (
          <ErrorDelCampo id="legalName-error" mensaje={errors.legalName?.message} />
        )}
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
          invalid={!nitConfirmed && Boolean(errors.nit)}
          aria-invalid={(!nitConfirmed && Boolean(errors.nit)) || undefined}
          aria-describedby={!nitConfirmed && errors.nit ? 'nit-error' : undefined}
          {...register('nit', {
            // El guion lo pone el campo al noveno dígito; la persona sólo
            // teclea números. `setValue` y no mutar el evento: RHF ya leyó.
            onChange: (e) =>
              setValue('nit', formatearNitAlEscribir(String(e.target.value)), {
                shouldValidate: true,
              }),
          })}
        />
        {nitConfirmed ? <ConfirmedHint /> : <ErrorDelCampo id="nit-error" mensaje={errors.nit?.message} />}
      </div>

      {/* Dirección (contract key `calle`) — full width, free text. */}
      <div>
        <label htmlFor="address.calle" className="mb-1.5 block text-caption font-semibold text-fg">
          Dirección <span className="text-danger">*</span>
        </label>
        <Input
          id="address.calle"
          type="text"
          autoComplete="address-line1"
          placeholder={EJEMPLO_DE_DIRECCION}
          invalid={Boolean(errors.address?.calle)}
          aria-invalid={Boolean(errors.address?.calle) || undefined}
          aria-describedby={errors.address?.calle ? 'address.calle-error' : undefined}
          /* El error sale al «Continuar», como en los demás campos. NO al
             salir del campo: el mensaje que aparecía en el blur empujaba el
             Departamento 44 px y el clic con que la persona salía caía en el
             vacío (medido en el navegador el 02-10). */
          {...register('address.calle')}
        />
        <ErrorDelCampo id="address.calle-error" mensaje={errors.address?.calle?.message} />
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
                  // Si el código postal ya estaba en rojo, se vuelve a cruzar
                  // con el departamento nuevo: elegir el correcto lo apaga.
                  if (errors.address?.codigoPostal) {
                    revisarCodigoPostal(errorDeCodigoPostal(getValues('address.codigoPostal') ?? '', next ?? ''))
                  }
                }}
                options={departamentoOptions}
                placeholder="Selecciona departamento"
                searchPlaceholder="Buscar departamento..."
                invalid={Boolean(errors.address?.departamento)}
              />
            )}
          />
          <ErrorDelCampo id="address.departamento-error" mensaje={errors.address?.departamento?.message} />
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
          <ErrorDelCampo id="address.ciudad-error" mensaje={errors.address?.ciudad?.message} />
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
          className="font-mono tabular-nums"
          invalid={Boolean(errors.address?.codigoPostal)}
          aria-invalid={Boolean(errors.address?.codigoPostal) || undefined}
          aria-describedby={errors.address?.codigoPostal ? 'address.codigoPostal-error' : undefined}
          {...register('address.codigoPostal', {
            // Sólo dígitos y hasta seis, limpiando al escribir: sin `maxLength`
            // (ya nos cortó dígitos de un celular pegado). `setValue` y no
            // mutar el evento: RHF ya leyó.
            onChange: (e) =>
              setValue('address.codigoPostal', limpiarCodigoPostalAlEscribir(String(e.target.value))),
          })}
        />
        {/* La ayuda y el error se cruzan (Cadence `FormError` con `hint`). */}
        <ErrorDelCampo
          id="address.codigoPostal-error"
          mensaje={errors.address?.codigoPostal?.message}
          pista="6 dígitos; los dos primeros son los del departamento."
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
          invalid={Boolean(errors.primaryContactEmail)}
          aria-invalid={Boolean(errors.primaryContactEmail) || undefined}
          aria-describedby={errors.primaryContactEmail ? 'primaryContactEmail-error' : undefined}
          {...register('primaryContactEmail')}
        />
        {/* No es «el del representante legal» (eso se preguntó antes): queda
            asociado a la cuenta de la inmobiliaria y es a donde el micro manda
            el reporte diario de cartera y los avisos (Nico, 30-09-2026). */}
        <ErrorDelCampo
          id="primaryContactEmail-error"
          mensaje={errors.primaryContactEmail?.message}
          pista="Queda asociado a la cuenta de la inmobiliaria: ahí te llegan los reportes y avisos de Leasefy."
        />
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
              // El ref deja que un error del servidor en el teléfono le dé el foco.
              ref={field.ref}
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
              aria-invalid={Boolean(errors.primaryContactPhone) || undefined}
              aria-describedby={errors.primaryContactPhone ? 'primaryContactPhone-error' : undefined}
            />
          )}
        />
        <ErrorDelCampo
          id="primaryContactPhone-error"
          mensaje={errors.primaryContactPhone?.message}
          pista={pistaDelTelefono(paisDelTelefono)}
        />
      </div>

      {avisoDelFormulario && (
        <div
          data-testid="agency-step-form-error"
          role="alert"
          className="rounded-md border border-danger/20 bg-danger-soft p-3"
        >
          <p className="text-sm text-danger">{avisoDelFormulario}</p>
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
