/**
 * Zod schema for the wizard's `members` step form.
 *
 * Mirrors `OnboardingSessionMembersRequest` / `OnboardingSessionMemberInput`
 * (src/lib/api/generated/agency.ts) field-for-field. Same pattern as
 * `agency-step-schema.ts` — react-hook-form holds the field state, zod is the
 * single source of truth for validation, validated on submit inside
 * `MembersStepForm`.
 *
 * Contract history (see engram, project "front"):
 *  - Originally the step allowed an empty list (`members: []`), but the
 *    agent's `OnboardingSessionMembersRequest.members` had `minItems: 1` and
 *    rejected that with a 400 (topic "sdd/onboarding-members-min1").
 *  - The schema was tightened to `.min(1)` to match (topic
 *    "onboarding-members-min1").
 *  - The agent contract has since been relaxed to `minItems: 0` and
 *    `/onboarding/session/{id}/complete` no longer requires `members` entries
 *    — only that the step was POSTed at least once (topic
 *    "onboarding-members-optional-investigation" documents the earlier,
 *    now-resolved blocker). `members: []` is a valid POST again, this time
 *    actually accepted server-side. `MembersStepForm` exposes an explicit
 *    "Omitir por ahora" action that submits `{ members: [] }` directly.
 *
 * Role enum: the agent's `OnboardingSessionMemberInput.role` now accepts
 * `ADMIN | AGENTE | CONTADOR | VIEWER | OPERATOR` (`OPERATOR` kept
 * server-side only as a deprecated alias for pre-existing data). The front
 * aligns `MEMBER_ROLE_OPTIONS` with the panel's agency roles
 * (`src/lib/auth/agency-roles.ts`, same labels as
 * `InviteFirstMemberForm.tsx`'s `ROLE_OPTIONS`) and never sends `OPERATOR`.
 */
import { z } from 'zod'
import type { OnboardingSessionMembersRequest } from '@/lib/api/generated/agency'

export type MemberRole = 'AGENTE' | 'CONTADOR' | 'ADMIN' | 'VIEWER'

export const MEMBER_ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: 'AGENTE', label: 'Agente' },
  { value: 'CONTADOR', label: 'Contador' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'VIEWER', label: 'Solo lectura' },
]

const memberRowSchema = z.object({
  email: z.string().trim().min(1, 'El correo es obligatorio.').email('Ingresa un correo válido.'),
  /**
   * Opcional a propósito. El DTO del back (`InviteMemberDto`) exige la clave
   * `name`, pero acepta el string vacío y guarda `null` — el equipo muestra
   * entonces el correo hasta que la persona se registre. Pedirlo obligatorio
   * frenaría el alta por un dato que quien invita puede no tener a mano, y
   * derivarlo del correo sería inventarle un nombre a alguien.
   */
  nombre: z.string().trim().max(120, 'El nombre no puede pasar de 120 caracteres.').optional(),
  role: z.enum(['AGENTE', 'CONTADOR', 'ADMIN', 'VIEWER'], {
    errorMap: () => ({ message: 'Selecciona un rol.' }),
  }),
})

export const membersStepSchema = z
  .object({
    // No `.min(1)` — the agent now accepts an empty list (minItems: 0).
    members: z.array(memberRowSchema),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>()
    value.members.forEach((member, index) => {
      const normalized = member.email.trim().toLowerCase()
      if (!normalized) return
      if (seen.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Este correo ya está en la lista.',
          path: ['members', index, 'email'],
        })
      }
      seen.add(normalized)
    })
  })

export type MembersStepFormValues = z.infer<typeof membersStepSchema>

/** Default row appended when the user clicks "Agregar miembro". */
export const MEMBERS_STEP_NEW_ROW: MembersStepFormValues['members'][number] = {
  email: '',
  nombre: '',
  role: 'AGENTE',
}

/** Starts with one empty row as an affordance — the step itself is optional. */
export const MEMBERS_STEP_DEFAULT_VALUES: MembersStepFormValues = {
  members: [MEMBERS_STEP_NEW_ROW],
}

export function toMembersRequest(values: MembersStepFormValues): OnboardingSessionMembersRequest {
  return {
    members: values.members.map((member) => ({ email: member.email.trim(), role: member.role })),
  }
}
