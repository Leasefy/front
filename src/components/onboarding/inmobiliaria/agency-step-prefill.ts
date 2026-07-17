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
 *     survives a refresh, but today only carries whatever the agent's
 *     `/onboarding/start` step received: `proposedAgencyName`,
 *     `contactEmail`, `contactPhone` (see `OnboardingStartRequest`,
 *     src/lib/api/generated/agent.ts). It NEVER carries `nit` — the back
 *     never forwards it to the agent's start step (see handoff note below).
 *
 * Priority: `preStep` wins for `legalName` (typed one screen ago, more
 * likely correct than a possibly-stale agent draft). `nit` ONLY ever comes
 * from `preStep` — there is no other source. Both `preStep` and `draft` can
 * be null/undefined independently (e.g. after a refresh `preStep` is gone);
 * this function degrades gracefully to prefilling fewer fields, never throws.
 *
 * ── Backend/agent handoff note ──────────────────────────────────────────
 * The agent's onboarding-start draft (`GET .../onboarding/session/{id}/resume`)
 * does not carry the NIT anywhere. After a page refresh mid-wizard (pre-step
 * values lost, only the draft survives), the NIT cannot be prefilled from any
 * source and the user must retype it. If this is undesirable, the fix is on
 * the agent side: accept/persist `nit` in `OnboardingStartRequest` (or a
 * later step) so `resume`'s draft can carry it, mirroring
 * `proposedAgencyName`/`contactEmail`. Not implemented here — out of scope
 * for this front-only change.
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

  // NIT is only ever collected by the pre-step — the agent's draft never
  // carries it today (see the handoff note above).
  if (preStep?.nit) prefill.nit = preStep.nit

  const primaryContactEmail = readDraftString(draft, 'contactEmail')
  if (primaryContactEmail) prefill.primaryContactEmail = primaryContactEmail

  const primaryContactPhone = readDraftString(draft, 'contactPhone')
  if (primaryContactPhone) prefill.primaryContactPhone = primaryContactPhone

  return prefill
}
