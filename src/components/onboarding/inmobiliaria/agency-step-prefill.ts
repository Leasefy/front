/**
 * agency-step-prefill.ts — merges everything already known about the agency
 * into the initial values the "Agencia" step (`AgencyStepForm`) starts with.
 *
 * The wizard's pre-step (`OwnerNameStepForm`) already collects razón social
 * + NIT and posts them to the back (`POST /users/me/onboarding`,
 * `useOnboardingProvisioning`). Re-asking the same two fields one screen
 * later is the bug this file fixes. Two sources feed the merge:
 *
 *  1. `preStep` — the exact values captured by `OwnerNameStepForm` THIS
 *     session, held in-memory by `useOnboardingProvisioning`
 *     (`ProvisioningInput.agencyName`/`.nit`). Freshest source, but
 *     in-memory only — gone after a hard page refresh.
 *  2. `draft` — the agent's `resumeOnboarding` draft
 *     (`OnboardingSessionResumeResponse.draft`, untyped
 *     `Record<string, unknown>` on the wire). Agent-persisted, so it
 *     survives a refresh. It carries whatever the agent's `/onboarding/start`
 *     step received: `proposedAgencyName`, `contactEmail`, `contactPhone`,
 *     and now `nit` too (`OnboardingStartRequest.nit` is optional — see
 *     `src/lib/api/generated/agent.ts`).
 *
 * Priority: `preStep` wins for both `legalName` and `nit` (typed one screen
 * ago, more likely correct/fresher than a possibly-stale agent draft).
 * `draft.nit` is only used as a fallback when `preStep.nit` is absent (e.g.
 * after a hard page refresh mid-wizard, when in-memory pre-step values are
 * gone but the agent-persisted draft survives). Both `preStep` and `draft`
 * can be null/undefined independently; this function degrades gracefully to
 * prefilling fewer fields, never throws.
 */
import type { AgencyStepFormValues } from './agency-step-schema'

export interface AgencyStepPreStepValues {
  legalName?: string
  nit?: string
}

function readDraftString(draft: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = draft?.[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function computeAgencyStepPrefill(
  preStep: AgencyStepPreStepValues | null | undefined,
  draft: Record<string, unknown> | null | undefined,
): Partial<AgencyStepFormValues> {
  const prefill: Partial<AgencyStepFormValues> = {}

  const legalName = preStep?.legalName || readDraftString(draft, 'proposedAgencyName')
  if (legalName) prefill.legalName = legalName

  const nit = preStep?.nit || readDraftString(draft, 'nit')
  if (nit) prefill.nit = nit

  const primaryContactEmail = readDraftString(draft, 'contactEmail')
  if (primaryContactEmail) prefill.primaryContactEmail = primaryContactEmail

  const primaryContactPhone = readDraftString(draft, 'contactPhone')
  if (primaryContactPhone) prefill.primaryContactPhone = primaryContactPhone

  return prefill
}
