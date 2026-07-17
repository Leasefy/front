'use client'

import { useState } from 'react'
import { Controller, useFieldArray, useForm, type FieldPath } from 'react-hook-form'
import { ArrowRight, Check, Copy, Plus, Trash, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { OnboardingSessionMembersRequest, OnboardingSessionMembersResponse } from '@/lib/api/generated/agency'
import { buildMemberInviteLink } from './invite-link'
import {
  MEMBER_ROLE_OPTIONS,
  MEMBERS_STEP_DEFAULT_VALUES,
  MEMBERS_STEP_NEW_ROW,
  membersStepSchema,
  toMembersRequest,
  type MembersStepFormValues,
} from './members-step-schema'

/**
 * Captured by the parent (`OnboardingInmobiliariaClient`) right after a
 * successful `submitMembers` — NOT local state here. `inviteTokens.rawToken`
 * is returned by the agent exactly once, and `useOnboardingSession` advances
 * `currentStep` to the next step as soon as the request resolves. If this
 * were local state inside `MembersStepForm`, the parent's `currentStep`
 * branch would swap this component out before the user ever saw the links.
 * The parent keeps rendering `MembersStepForm` (with this prop set) until
 * `onContinueAfterInvites` fires, regardless of `currentStep`.
 */
export interface PendingMembersInvites {
  response: OnboardingSessionMembersResponse
  body: OnboardingSessionMembersRequest
}

export interface MembersStepFormProps {
  isSubmitting: boolean
  onSubmit: (body: OnboardingSessionMembersRequest) => Promise<OnboardingSessionMembersResponse | null>
  /**
   * Session-level `error.kind === 'validation'` message from the hook (same
   * contract as `AgencyStepForm`'s `submitError` — the backend re-validates
   * and can reject a payload the client-side zod schema accepted).
   */
  submitError?: string | null
  /** When set, renders the invite-links screen instead of the form. */
  pendingInvites: PendingMembersInvites | null
  /** Fires when the user manually confirms they saved the links. */
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
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  const handleCopy = async (email: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedEmail(email)
      setTimeout(() => setCopiedEmail((current) => (current === email ? null : current)), 2000)
    } catch {
      // Clipboard can fail (permissions/insecure context) — the link is
      // still visible in the row for the user to select and copy manually.
    }
  }

  return (
    <div
      data-testid="members-invite-links"
      className="rounded-lg border border-border bg-surface-raised p-6 space-y-4 shadow-sm"
    >
      <div>
        <h2 className="text-h2">Invitaciones generadas</h2>
        <p className="text-body-sm text-fg-muted mt-1">
          Compartí cada link con la persona correspondiente para que se una a tu inmobiliaria.
        </p>
      </div>

      <div
        data-testid="members-invite-warning"
        className="rounded-md bg-warning-soft border border-warning/30 p-3 flex items-start gap-2"
      >
        <WarningCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-sm font-medium text-warning">
            Guardá estos links ahora — no se vuelven a mostrar.
          </p>
          <p className="text-body-sm text-fg-secondary mt-0.5">
            Por seguridad no podemos volver a generarlos. Copiá y enviá cada link antes de continuar.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {pendingInvites.response.inviteTokens.map((invite) => {
          const role = pendingInvites.body.members.find((member) => member.email === invite.email)?.role
          const link = buildMemberInviteLink(invite.rawToken)
          const copied = copiedEmail === invite.email

          return (
            <li key={invite.email} data-testid={`invite-row-${invite.email}`} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-fg">{invite.email}</span>
                <span className="text-caption text-fg-muted shrink-0">{roleLabel(role)}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(invite.email, link)}
                data-testid={`invite-copy-${invite.email}`}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-surface-muted border border-border hover:border-border-strong transition-colors text-left"
              >
                <span className="text-xs text-fg-muted truncate">{link}</span>
                {copied ? (
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-fg-muted flex-shrink-0" />
                )}
              </button>
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
    await onSubmit(toMembersRequest(parsed.data))
  })

  if (pendingInvites) {
    return (
      <MembersInviteLinksScreen pendingInvites={pendingInvites} onContinueAfterInvites={onContinueAfterInvites} />
    )
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-5" data-testid="members-step-form">
      <p className="text-body-sm text-fg-muted">Invita a otras personas de tu inmobiliaria.</p>

      {/*
        This step CANNOT be made optional front-only: the agent's
        OnboardingSessionMembersRequest.members has minItems: 1 (rejects an
        empty POST with 400) and /onboarding/session/{id}/complete's 409
        missingSteps can list "members" as required (see
        CompleteStepForm.tsx's MISSING_STEP_LABELS + its tests). Skipping
        ahead is also blocked server-side: payment_provider's POST 409s with
        a state-machine violation if members hasn't been submitted yet. Until
        the agent contract changes (drop members from required completion
        steps or accept an empty POST), the best honest UX is to keep the
        requirement and explain it clearly instead of a fake "skip" action.
      */}
      <p data-testid="members-step-required-notice" className="text-body-sm text-fg-muted">
        Este paso es obligatorio: invita al menos un miembro de tu equipo para continuar.
      </p>

      <FieldError message={errors.members?.message} />

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} data-testid={`member-row-${index}`} className="flex items-start gap-3">
            <div className="flex-1">
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
    </form>
  )
}
