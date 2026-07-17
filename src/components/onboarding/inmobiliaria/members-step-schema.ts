/**
 * Zod schema for the wizard's `members` step form.
 *
 * Mirrors `OnboardingSessionMembersRequest` / `OnboardingSessionMemberInput`
 * (src/lib/api/generated/agency.ts) field-for-field. Same pattern as
 * `agency-step-schema.ts` — react-hook-form holds the field state, zod is the
 * single source of truth for validation, validated on submit inside
 * `MembersStepForm`.
 *
 * `members` requires at least one row (`.min(1)`), matching the agent
 * contract's `OnboardingSessionMembersRequest.members` (`minItems: 1`),
 * which rejects an empty list with a 400. Previously this schema allowed an
 * empty list, which the agent rejected — see the discovery saved to engram
 * (project "front", topic "onboarding") for the bug this caused.
 *
 * This step CANNOT be made optional front-only (re-verified — see engram
 * "front", topic "onboarding-members-optional-investigation"):
 *  1. `OnboardingSessionMembersRequest.members` has `minItems: 1` — an empty
 *     POST is rejected with 400, there's no "empty array" escape hatch.
 *  2. Sequential state machine: `payment_provider`'s POST 409s with a
 *     state-machine violation (`requiredStep`) if `members` hasn't been
 *     submitted yet — the front cannot jump the wizard forward locally,
 *     `useOnboardingSession.currentStep` only advances via a successful
 *     step-endpoint response.
 *  3. `/onboarding/session/{id}/complete`'s 409 `missingSteps` can list
 *     `"members"` as required (see `CompleteStepForm.tsx`'s
 *     `MISSING_STEP_LABELS` + its tests, and
 *     `OnboardingInmobiliariaClient.test.tsx`'s `missingSteps: ['policy',
 *     'members']` fixture) — even a client-side-only "skip" would dead-end
 *     the user back here at the final step.
 * Making this step truly optional requires an agent-side contract change
 * (drop `members` from `/complete`'s required-completion steps AND accept an
 * empty `members: []` POST, or add a dedicated "skip" affordance to the
 * session state machine). Reported as an agent-side handoff.
 *
 * Role enum mismatch (also an agent-side handoff, NOT fixed here):
 * `OnboardingSessionMemberInput.role` is `"ADMIN" | "OPERATOR" | "VIEWER"`
 * (agent contract) — it does NOT match the panel's agency roles
 * `ADMIN | AGENTE | CONTADOR | VIEWER` (`src/lib/auth/agency-roles.ts`).
 * `OPERATOR` has no equivalent among the panel roles, and there is no
 * `CONTADOR` option at all. The front cannot invent values the contract
 * doesn't accept, so `MEMBER_ROLE_OPTIONS` below is intentionally left
 * as-is (contract-accurate), not aligned with the panel's role set.
 */
import { z } from 'zod'
import type { OnboardingSessionMembersRequest } from '@/lib/api/generated/agency'

export type MemberRole = 'ADMIN' | 'OPERATOR' | 'VIEWER'

export const MEMBER_ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'OPERATOR', label: 'Operador' },
  { value: 'VIEWER', label: 'Solo lectura' },
]

const memberRowSchema = z.object({
  email: z.string().trim().min(1, 'El correo es obligatorio.').email('Ingresa un correo válido.'),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER'], {
    errorMap: () => ({ message: 'Selecciona un rol.' }),
  }),
})

export const membersStepSchema = z
  .object({
    members: z.array(memberRowSchema).min(1, 'Invitá al menos un miembro.'),
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
  role: 'OPERATOR',
}

/** Starts with one empty row — the step requires at least one member. */
export const MEMBERS_STEP_DEFAULT_VALUES: MembersStepFormValues = {
  members: [MEMBERS_STEP_NEW_ROW],
}

export function toMembersRequest(values: MembersStepFormValues): OnboardingSessionMembersRequest {
  return {
    members: values.members.map((member) => ({ email: member.email.trim(), role: member.role })),
  }
}
