/**
 * Login bootstrap composition — `GET /users/me/bootstrap` (T-0082 WU-2a/WU-2b).
 *
 * Folds five round trips the login path used to make one by one
 * (`GET /users/me`, the agency membership probe, agency permissions,
 * subscription, onboarding status) into a single response. Consumed
 * exclusively by `auth-context.tsx`'s bootstrap path (INITIAL_SESSION,
 * SIGNED_IN, `refreshUser()`) — see contract.md §3.2 Surface A for the frozen
 * field-by-field shape and degradation rules. `TOKEN_REFRESHED` deliberately
 * keeps using the standalone `GET /users/me` + agency probe (out of this
 * unit's scope, see wu-2b-front-brief.md §4).
 *
 * No wire field is invented here — this file only types and normalizes the
 * frozen contract response, exactly like `session.service.ts` does for
 * `/auth/session/claim`.
 */

import { apiClient } from '@/lib/api/client'
import type { AgencyMemberRole } from '@/lib/auth/types'
import type { MemberPermissionsResponse } from './inmobiliaria.service'
import type { AgencySubscriptionState } from './agency-subscription.types'
import type { BackendSubscriptionMeResponse } from './subscriptions.types'

export type BootstrapRole = 'TENANT' | 'LANDLORD' | 'AGENT' | 'ADMIN'

/** `user` block — an explicit allowlist on the back, never the raw Prisma row.
 *  Mirrors what `GET /users/me` returns today (contract.md §3.2). */
export interface BootstrapUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  avatarUrl?: string | null
  rut?: string | null
  address?: string | null
  birthDate?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  onboardingCompletedAt?: string | null
  onboardingData?: Record<string, unknown> | null
  preferences?: Record<string, unknown> | null
}

/** `agency` block — same fields `GET /inmobiliaria/agency` returns today,
 *  plus `memberRole`/`memberStatus`/`permissions` folded in (contract.md
 *  §3.2). Kept as an open shape (mirror-and-map, `FRONTEND.md` §4) since the
 *  agency fields spread here are whatever `agency.service.ts` spreads today —
 *  this file only needs `id`/`name` plus the three composed fields to build
 *  an `AgencyFetchResult` (see `agency-fetch.ts`'s `agencyResultFromBootstrap`). */
export type BootstrapAgency = {
  id: string
  name: string
  memberRole: AgencyMemberRole | null
  memberStatus: string | null
  permissions: MemberPermissionsResponse | null
  [key: string]: unknown
}

/** `LandlordTenantSubscriptionDto | AgencySubscriptionStateDto` per contract.md
 *  §3.2 — byte-identical to the existing standalone endpoints' 200 bodies. */
export type BootstrapSubscription = BackendSubscriptionMeResponse | AgencySubscriptionState

export interface BootstrapOnboarding {
  complete: boolean
}

export interface BootstrapResponse {
  user: BootstrapUser
  role: BootstrapRole
  agency: BootstrapAgency | null
  subscription: BootstrapSubscription | null
  onboarding: BootstrapOnboarding | null
  /** Always present per contract — MUST default to `[]` when the key is
   *  missing (an old front build talking to a new back, or vice versa).
   *  Never throw on it. See `getBootstrap` below. */
  errors: string[]
}

/** Raw shape before the `errors` normalization — everything else is required
 *  by the contract, but `errors`' "absent key ≡ []" rule is the one back-compat
 *  case this file must handle defensively. */
type RawBootstrapResponse = Omit<BootstrapResponse, 'errors'> & { errors?: string[] }

/**
 * GET /users/me/bootstrap. Normalizes a missing `errors` key to `[]` — the
 * contract's explicit back-compat rule (§3.2) — so no caller ever has to
 * null-check it. Every other failure mode (401, 409, 5xx) propagates as an
 * `ApiError`, identical to `GET /users/me` today (contract.md §3.3): the
 * caller (`auth-context.tsx`'s `fetchBootstrap`) handles those exactly like
 * it already handles `fetchUser`'s.
 */
export async function getBootstrap(token?: string): Promise<BootstrapResponse> {
  const raw = await apiClient.get<RawBootstrapResponse>('/users/me/bootstrap', token)
  return { ...raw, errors: Array.isArray(raw.errors) ? raw.errors : [] }
}

export const bootstrapApi = { get: getBootstrap }
