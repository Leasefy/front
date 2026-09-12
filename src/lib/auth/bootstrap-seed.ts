/**
 * Bootstrap seed — hands the login bootstrap's already-fetched data to the
 * hooks/contexts that would otherwise re-fetch it on their own first mount
 * (T-0082 WU-2b, contract.md §3.2).
 *
 * Module-scope, not React state — mirrors `client.ts`'s `_accessToken`
 * pattern: `AuthProvider`'s bootstrap resolution and the consumers
 * (`PermissionsContext`, `useAgencySubscription`, `useMySubscription`) live
 * in different, non-overlapping parts of the tree, so a shared singleton is
 * how the seed reaches them without prop-drilling or a new state library
 * (`FRONTEND.md` §3: no react-query/SWR/Redux/Zustand).
 *
 * One-shot PER FIELD: each `consume*` call reads the value and clears it, so
 * only the first consumer after a bootstrap skips its network call. A second
 * mount of the same hook (route re-visit, remount) gets `null` and falls back
 * to its normal live fetch — a stale seed is never reused across mounts,
 * which is deliberate: this is *initial* data, not a cache.
 *
 * A seed is set ONLY for a field the bootstrap actually resolved (non-null).
 * When the bootstrap's `subscription`/`agency.permissions` is `null` — for
 * ANY reason, real failure or an authorization-expected absence — no seed is
 * set here at all, so the consuming hook takes its normal fallback path
 * (contract.md §3.2's degradation column). See `auth-context.tsx`'s
 * `fetchBootstrap`.
 */

import type { MemberPermissionsResponse } from '@/lib/api/inmobiliaria.service'
import type { AgencySubscriptionState } from '@/lib/api/agency-subscription.types'
import type { DisplaySubscription } from '@/lib/api/subscriptions.types'

interface BootstrapSeed {
  permissions: MemberPermissionsResponse | null
  agencySubscription: AgencySubscriptionState | null
  mySubscription: DisplaySubscription | null
}

let seed: BootstrapSeed | null = null

/** Called once per resolved bootstrap, from inside the same
 *  generation-guarded block that writes `user`/`agency` (auth-context.tsx).
 *  Fields left out (or `null`) are simply not seeded — see the module doc. */
export function setBootstrapSeed(next: Partial<BootstrapSeed>): void {
  seed = {
    permissions: next.permissions ?? null,
    agencySubscription: next.agencySubscription ?? null,
    mySubscription: next.mySubscription ?? null,
  }
}

/** Cleared on `SIGNED_OUT` and in `signOut()` — same identity-isolation
 *  reasoning as `clearInFlightGets` in `client.ts`: a seed set for the
 *  session that just ended must never be handed to the next sign-in's first
 *  mount of these hooks in the same tab. */
export function clearBootstrapSeed(): void {
  seed = null
}

export function consumePermissionsSeed(): MemberPermissionsResponse | null {
  const value = seed?.permissions ?? null
  if (seed) seed.permissions = null
  return value
}

export function consumeAgencySubscriptionSeed(): AgencySubscriptionState | null {
  const value = seed?.agencySubscription ?? null
  if (seed) seed.agencySubscription = null
  return value
}

export function consumeMySubscriptionSeed(): DisplaySubscription | null {
  const value = seed?.mySubscription ?? null
  if (seed) seed.mySubscription = null
  return value
}
