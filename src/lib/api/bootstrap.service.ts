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
import type { components } from './generated/back'

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

/**
 * T-0099 contract (`.orchestration/tasks/T-0099-mfa-pending-gate/contract.md`
 * §2) — additive field on `GET /users/me/bootstrap`. `exigido: true` means
 * the back will 403 SEGUNDO_FACTOR_REQUERIDO on protected routes unless the
 * session token is aal2, computed by the back with the guard's own policy
 * (mandatory roles plus the agency's configured extras) on the member role
 * the bootstrap resolved.
 *
 * Type-aliased to the generated `SegundoFactorDto` (`pnpm api:gen:back`,
 * `src/lib/api/generated/back.ts` — WU-2/WU-3, T-0099) rather than
 * hand-declared, so the shape can never silently drift from what the back's
 * Swagger actually publishes. This is a compile-time-only alias, not a
 * runtime import of the generated client — the rest of this file keeps the
 * usual mirror-and-map pattern (`FRONTEND.md` §4: never import backend DTOs
 * directly for runtime use).
 *
 * OPTIONAL on the wire regardless of what the current back always sends
 * (contract §2, degradation column): an older back build omits the whole
 * `segundoFactor` key. `getBootstrap` below normalizes that absence to
 * `{ exigido: false }` — today's behaviour, no pre-emptive gate — so no
 * caller needs its own version-skew fallback.
 */
export type BootstrapSegundoFactor = components['schemas']['SegundoFactorDto']

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
  /**
   * Normalized here — always present. Absent on an older back build (contract
   * §2, degradation column) becomes `{ exigido: false }` (today's behaviour,
   * no pre-emptive gate). See `getBootstrap` below.
   */
  segundoFactor: BootstrapSegundoFactor
}

/** Raw shape before normalization — everything else is required by the
 *  contract, but `errors`' "absent key ≡ []" and `segundoFactor`'s "absent
 *  key ≡ { exigido: false }" are the back-compat cases this file must handle
 *  defensively. */
type RawBootstrapResponse = Omit<BootstrapResponse, 'errors' | 'segundoFactor'> & {
  errors?: string[]
  segundoFactor?: BootstrapSegundoFactor
}

/**
 * GET /users/me/bootstrap. Normalizes a missing `errors` key to `[]` (the
 * contract's explicit back-compat rule, §3.2) and a missing `segundoFactor`
 * key to `{ exigido: false }` (T-0099 contract §2) — so no caller ever has to
 * null-check either. Every other failure mode (401, 409, 5xx) propagates as
 * an `ApiError`, identical to `GET /users/me` today (contract.md §3.3): the
 * caller (`auth-context.tsx`'s `fetchBootstrap`) handles those exactly like
 * it already handles `fetchUser`'s.
 */
export async function getBootstrap(token?: string): Promise<BootstrapResponse> {
  const raw = await apiClient.get<RawBootstrapResponse>('/users/me/bootstrap', token)
  return {
    ...raw,
    errors: Array.isArray(raw.errors) ? raw.errors : [],
    segundoFactor: raw.segundoFactor && typeof raw.segundoFactor.exigido === 'boolean'
      ? raw.segundoFactor
      : { exigido: false },
  }
}

export const bootstrapApi = { get: getBootstrap }
