'use client'

import { useState } from 'react'
import { Controller, useFieldArray, useForm, type FieldPath } from 'react-hook-form'
import { ArrowRight, Check, Copy, EnvelopeSimple, Plus, Trash, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { InvitacionCreada } from './crear-invitaciones'
import {
  MEMBER_ROLE_OPTIONS,
  MEMBERS_STEP_DEFAULT_VALUES,
  MEMBERS_STEP_NEW_ROW,
  membersStepSchema,
  type MembersStepFormValues,
} from './members-step-schema'

/**
 * Lo que devolvió el paso «Miembros»: las invitaciones REALES creadas en el
 * back (`POST /inmobiliaria/agency/members`), una por persona, con su enlace
 * `/invitacion/<token>` y si el correo salió o no.
 *
 * Lo tiene el padre (`OnboardingInmobiliariaClient`) y no este componente:
 * `submitMembers` avanza `currentStep` apenas resuelve, así que con estado
 * local acá la pantalla de resultados se desmontaría antes de que nadie la
 * viera. El padre sigue renderizando `MembersStepForm` con este prop puesto
 * hasta que la persona toca «Continuar».
 */
export interface PendingMembersInvites {
  invitaciones: InvitacionCreada[]
}

export interface MembersStepFormProps {
  isSubmitting: boolean
  /**
   * Recibe los valores del formulario, no el request del micro: el padre
   * necesita el `nombre` de cada fila para crear la invitación REAL en el
   * back, y además avanza el asistente con `toMembersRequest`.
   */
  onSubmit: (values: MembersStepFormValues) => Promise<unknown>
  /**
   * Session-level `error.kind === 'validation'` message from the hook (same
   * contract as `AgencyStepForm`'s `submitError` — the backend re-validates
   * and can reject a payload the client-side zod schema accepted).
   */
  submitError?: string | null
  /** Con esto puesto se muestra el resultado de las invitaciones en vez del formulario. */
  pendingInvites: PendingMembersInvites | null
  /** La persona ya leyó el resultado y quiere seguir. */
  onContinueAfterInvites: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-danger">{message}</p>
}

function roleLabel(role: string | undefined): string {
  return MEMBER_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role ?? ''
}

function MembersInviteLinksScreen({
  pendingInvites,
  onContinueAfterInvites,
}: {
  pendingInvites: PendingMembersInvites
  onContinueAfterInvites: () => void
}) {
  const [copiado, setCopiado] = useState<string | null>(null)

  const copiar = async (email: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(email)
      setTimeout(() => setCopiado((actual) => (actual === email ? null : actual)), 2000)
    } catch {
      // El portapapeles puede fallar (permisos, contexto inseguro). El enlace
      // sigue visible en la fila para copiarlo a mano.
    }
  }

  const invitaciones = pendingInvites.invitaciones
  const conError = invitaciones.filter((i) => i.error !== null)
  const enviadas = invitaciones.filter((i) => i.error === null && i.correoEnviado)
  const sinCorreo = invitaciones.filter((i) => i.error === null && !i.correoEnviado)

  return (
    <div
      data-testid="members-invite-links"
      className="rounded-lg border border-border bg-surface p-6 space-y-4 shadow-sm"
    >
      <div>
        <h2 className="text-h2">Invitaciones enviadas</h2>
        <p className="text-body-sm text-fg-muted mt-1">
          {enviadas.length > 0
            ? 'Cada persona recibió un correo con su enlace para unirse a tu inmobiliaria.'
            : 'Estas son las invitaciones que quedaron creadas.'}
        </p>
      </div>

      {/*
        Nada de «guarda estos enlaces ahora, no se vuelven a mostrar»: era
        mentira y además asustaba. Las invitaciones viven en el back y desde
        Configuración → Equipo se pueden reenviar o volver a copiar cuando
        haga falta.
      */}
      {sinCorreo.length > 0 && (
        <div
          data-testid="members-invite-warning"
          className="rounded-md bg-warning-soft border border-warning/30 p-3 flex items-start gap-2"
        >
          <WarningCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" weight="fill" />
          <div>
            <p className="text-sm font-medium text-warning">
              {sinCorreo.length === 1
                ? 'Una invitación quedó creada, pero el correo no salió.'
                : `${sinCorreo.length} invitaciones quedaron creadas, pero el correo no salió.`}
            </p>
            <p className="text-body-sm text-fg-muted mt-0.5">
              Copia el enlace y pásaselo tú. También puedes reenviarlo más tarde desde
              Configuración → Equipo.
            </p>
          </div>
        </div>
      )}

      {conError.length > 0 && (
        <div
          data-testid="members-invite-errors"
          className="rounded-md bg-danger-soft border border-border p-3 flex items-start gap-2"
        >
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" weight="fill" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-danger">
              {conError.length === 1
                ? 'No pudimos invitar a una persona.'
                : `No pudimos invitar a ${conError.length} personas.`}
            </p>
            <p className="text-body-sm text-fg-muted mt-0.5">
              Puedes intentarlo de nuevo desde Configuración → Equipo cuando termines el
              registro.
            </p>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {invitaciones.map((invitacion) => {
          const copiadoAhora = copiado === invitacion.email
          return (
            <li key={invitacion.email} data-testid={`invite-row-${invitacion.email}`} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-fg truncate">
                  {invitacion.nombre || invitacion.email}
                </span>
                <span className="text-caption text-fg-muted shrink-0">
                  {roleLabel(invitacion.role)}
                </span>
              </div>

              {invitacion.error ? (
                <p className="text-xs text-danger" data-testid={`invite-error-${invitacion.email}`}>
                  {invitacion.error}
                </p>
              ) : invitacion.correoEnviado ? (
                <p
                  className="flex items-center gap-1.5 text-xs text-fg-muted"
                  data-testid={`invite-sent-${invitacion.email}`}
                >
                  <EnvelopeSimple className="w-3.5 h-3.5 shrink-0" />
                  Correo enviado a {invitacion.email}
                </p>
              ) : null}

              {invitacion.enlace && !invitacion.correoEnviado && (
                <button
                  type="button"
                  onClick={() => copiar(invitacion.email, invitacion.enlace as string)}
                  data-testid={`invite-copy-${invitacion.email}`}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-surface-muted border border-border hover:border-border-strong transition-colors text-left"
                >
                  <span className="text-xs text-fg-muted truncate">{invitacion.enlace}</span>
                  {copiadoAhora ? (
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 text-fg-muted flex-shrink-0" />
                  )}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <Button
        type="button"
        hideArrow
        size="lg"
        className="w-full"
        onClick={onContinueAfterInvites}
        data-testid="members-invite-continue"
      >
        Continuar
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

export function MembersStepForm({
  isSubmitting,
  onSubmit,
  submitError,
  pendingInvites,
  onContinueAfterInvites,
}: MembersStepFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<MembersStepFormValues>({ defaultValues: MEMBERS_STEP_DEFAULT_VALUES })
  const { fields, append, remove } = useFieldArray({ control, name: 'members' })

  const submit = handleSubmit(async (values) => {
    const parsed = membersStepSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path.join('.') as FieldPath<MembersStepFormValues>, { message: issue.message })
      }
      return
    }
    await onSubmit(parsed.data)
  })

  /**
   * Bypasses row-level validation entirely — the agent now accepts an empty
   * `members: []` POST (minItems: 0) and no longer gates `/complete` on this
   * step having entries. This is the explicit "skip" affordance; the regular
   * "Continuar" button still validates whatever rows are present.
   */
  const skipStep = async () => {
    await onSubmit({ members: [] })
  }

  if (pendingInvites) {
    return (
      <MembersInviteLinksScreen pendingInvites={pendingInvites} onContinueAfterInvites={onContinueAfterInvites} />
    )
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-5" data-testid="members-step-form">
      <p className="text-body-sm text-fg-muted">
        Invita a otras personas de tu inmobiliaria. Cada una recibe un correo con su enlace
        para unirse.
      </p>

      <p data-testid="members-step-optional-notice" className="text-body-sm text-fg-muted">
        Este paso es opcional: puedes omitirlo ahora e invitar a tu equipo más adelante desde
        Configuración → Equipo.
      </p>

      <FieldError message={errors.members?.message} />

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} data-testid={`member-row-${index}`} className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <label htmlFor={`members.${index}.email`} className="sr-only">
                Correo del miembro {index + 1}
              </label>
              <Input
                id={`members.${index}.email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="correo@inmobiliaria.com"
                {...register(`members.${index}.email` as const)}
              />
              <FieldError message={errors.members?.[index]?.email?.message} />
              {/* Opcional: sin nombre, el equipo muestra el correo hasta que
                  la persona se registre. No se deriva del correo. */}
              <label htmlFor={`members.${index}.nombre`} className="sr-only">
                Nombre del miembro {index + 1} (opcional)
              </label>
              <Input
                id={`members.${index}.nombre`}
                type="text"
                autoComplete="name"
                placeholder="Nombre y apellido (opcional)"
                {...register(`members.${index}.nombre` as const)}
              />
              <FieldError message={errors.members?.[index]?.nombre?.message} />
            </div>

            <div className="w-40">
              <label htmlFor={`members.${index}.role`} className="sr-only">
                Rol del miembro {index + 1}
              </label>
              <Controller
                control={control}
                name={`members.${index}.role` as const}
                render={({ field: roleField }) => (
                  <Select value={roleField.value} onValueChange={roleField.onChange}>
                    <SelectTrigger id={`members.${index}.role`}>
                      <SelectValue placeholder="Rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBER_ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              hideArrow
              disabled={fields.length === 1}
              onClick={() => remove(index)}
              aria-label={`Quitar miembro ${index + 1}`}
              data-testid={`members-remove-row-${index}`}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        hideArrow
        onClick={() => append(MEMBERS_STEP_NEW_ROW)}
        data-testid="members-add-row"
      >
        <Plus className="w-4 h-4" />
        Agregar miembro
      </Button>

      {submitError && (
        <div
          data-testid="members-step-form-error"
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

      <Button
        type="button"
        variant="ghost"
        hideArrow
        size="lg"
        className="w-full"
        disabled={isSubmitting}
        onClick={skipStep}
        data-testid="members-skip-step"
      >
        Omitir por ahora
      </Button>
    </form>
  )
}
