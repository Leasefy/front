import type { User } from '@/lib/auth/types'

/**
 * Tenant onboarding completeness — backend-first derivation.
 *
 * The BACKEND is the source of truth for onboarding completeness:
 * `GET /users/me` (mapped by the auth context into `User`) carries the
 * `onboardingCompletedAt` flag (mapped to `onboardingCompleted`), plus
 * `firstName`/`phone` and `onboardingData` (tenant housing preferences,
 * mapped to `tenantOnboardingData`) for per-step display.
 *
 * localStorage (`plan_onboarding_tenant`) remains ONLY a draft/cache for
 * in-progress wizard state. It must never override a complete backend
 * profile — `rehydrateTenantOnboardingCache` self-heals it instead.
 *
 * Completeness contract (flag criterion): `isComplete` mirrors the backend's
 * `onboardingCompletedAt` flag (`GET /users/me/onboarding/status` is
 * flag-based too). The flag is stamped ONLY when the wizard actually
 * completes (`POST /users/me/onboarding`) — product rule (owner decision):
 * a user who never completed the wizard must see the checklist to confirm
 * their data, even if Google metadata supplied a name. Hence step 1 needs
 * firstName AND phone (phone is wizard evidence; a metadata-only name must
 * not tick it).
 *
 * Trust rules:
 * - Only a profile actually loaded from the backend (`profileSource ===
 *   'backend'`) drives completeness. The degraded Supabase-session fallback
 *   (`profileSource === 'session'`) hardcodes `onboardingCompleted: true` and
 *   must never be treated as a real profile, or an API outage would poison
 *   the cache with fabricated completion.
 * - Cache ownership: every payload written while an authenticated user is
 *   known carries the owner's `userId`. A payload owned by a DIFFERENT user
 *   is treated as absent (and overwritten/purged on the next write) so PII
 *   (phone, budget, zones, pets) never leaks across accounts on a shared
 *   browser. Payloads WITHOUT a `userId` are anonymous pre-auth wizard
 *   drafts (the wizard runs before the backend user record exists, when
 *   `useAuth().user` is still null) or legacy entries: they stay usable for
 *   whoever is present and are adopted (stamped) on the next authenticated
 *   write. `signOut` clears the key entirely.
 */

export const TENANT_ONBOARDING_STORAGE_KEY = 'plan_onboarding_tenant'
const TOTAL_STEPS = 2

export interface TenantOnboardingBackendStatus {
  /** Step 1 — firstName AND phone (a Google-metadata-only name must not tick it) */
  basicInfoComplete: boolean
  /** Step 2 — saved housing preferences (budget is the wizard's required field) */
  preferencesComplete: boolean
  /**
   * Overall completeness. Mirrors the backend `onboardingCompletedAt` flag
   * (via `user.onboardingCompleted`), stamped only when the wizard actually
   * completed — matching `GET /users/me/onboarding/status`.
   */
  isComplete: boolean
}

/** Fields of `User` this derivation reads (keeps tests light). */
export type TenantOnboardingUserSlice = Pick<
  User,
  'firstName' | 'phone' | 'onboardingCompleted' | 'tenantOnboardingData' | 'profileSource'
>

/**
 * Derive the tenant onboarding status from backend data (auth-context user).
 * Only trusts profiles actually loaded from `GET /users/me`
 * (`profileSource === 'backend'`) — the degraded Supabase-session fallback
 * fabricates `onboardingCompleted: true` and must derive as unknown/incomplete.
 */
export function deriveTenantOnboardingStatus(
  user: TenantOnboardingUserSlice | null | undefined,
): TenantOnboardingBackendStatus {
  if (!user || user.profileSource !== 'backend') {
    return { basicInfoComplete: false, preferencesComplete: false, isComplete: false }
  }
  // Step 1 needs firstName AND phone: phone is wizard evidence, a name alone
  // may have come from Google metadata on auto-provisioning.
  const basicInfoComplete = !!user.firstName?.trim() && !!user.phone
  const prefs = user.tenantOnboardingData
  const preferencesComplete =
    !!prefs && prefs.budgetMin != null && prefs.budgetMax != null
  // Overall completeness = the wizard-completion flag, nothing else.
  return { basicInfoComplete, preferencesComplete, isComplete: !!user.onboardingCompleted }
}

interface TenantOnboardingCache {
  /** Owner of this payload. Absent = anonymous pre-auth draft / legacy entry. */
  userId?: string
  draft?: Record<string, unknown>
  currentStep?: number
  completedSteps?: number[]
  isComplete?: boolean
  completedAt?: string
  [key: string]: unknown
}

/** Parsed view of the localStorage wizard cache (draft/progress only). */
export interface TenantOnboardingCacheStatus {
  completedSteps: number[]
  isComplete: boolean
}

function readCache(): TenantOnboardingCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as TenantOnboardingCache
  } catch {
    return null
  }
}

/** A payload stamped with a userId that is NOT the current user's is foreign
 *  PII and must be treated as absent. Unowned payloads are never foreign. */
function isForeignCache(
  cache: TenantOnboardingCache | null,
  currentUserId?: string | null,
): boolean {
  return !!cache?.userId && !!currentUserId && cache.userId !== currentUserId
}

/**
 * Read the local wizard progress cache. Includes the legacy migration the
 * dashboard applied for years: old step 3 (employment, removed) counts as
 * step 2 (preferences).
 *
 * Pass the current user's id when one is known: a payload owned by a
 * different user is treated as absent (see "Trust rules" above).
 */
export function readTenantOnboardingCacheStatus(
  currentUserId?: string | null,
): TenantOnboardingCacheStatus {
  const cache = readCache()
  if (!cache || isForeignCache(cache, currentUserId)) {
    return { completedSteps: [], isComplete: false }
  }
  const rawSteps = Array.isArray(cache.completedSteps) ? cache.completedSteps : []
  const completedSteps = rawSteps.filter(
    (s): s is number => typeof s === 'number' && s <= TOTAL_STEPS,
  )
  if (rawSteps.includes(3) && !completedSteps.includes(2)) {
    completedSteps.push(2)
  }
  return { completedSteps, isComplete: completedSteps.length >= TOTAL_STEPS }
}

/**
 * Self-heal the localStorage wizard cache from backend data.
 *
 * When the backend profile is complete but the cache is missing or marked
 * incomplete (cleared storage, fresh device), rewrite it as completed —
 * prefilled from the backend profile — so localStorage-driven UI (sidebar
 * progress, ProtectedRoute fallback) stays consistent. An existing draft's
 * fields are preserved so in-progress wizard edits are never lost.
 *
 * No-ops when the backend profile is incomplete or the cache already agrees.
 */
export function rehydrateTenantOnboardingCache(user: User): void {
  if (typeof window === 'undefined') return
  // deriveTenantOnboardingStatus already rejects degraded 'session' profiles,
  // so an API outage can never fabricate completion into the cache.
  const status = deriveTenantOnboardingStatus(user)
  if (!status.isComplete) return

  // Another account's payload is foreign PII: never preserve any of it —
  // overwrite entirely with the current user's backend data below.
  let existing = readCache()
  if (isForeignCache(existing, user.id)) existing = null

  const existingSteps = Array.isArray(existing?.completedSteps)
    ? existing.completedSteps
    : []
  const cacheAgrees =
    existing?.isComplete === true &&
    existing.userId === user.id &&
    [1, 2].every((s) => existingSteps.includes(s))
  if (cacheAgrees) return

  const prefs = user.tenantOnboardingData
  const backendDraft: Record<string, unknown> = {
    displayName: user.name ?? '',
    phone: user.phone ?? '',
    preferredContact: prefs?.preferredContact ?? 'whatsapp',
    budgetMin: prefs?.budgetMin,
    budgetMax: prefs?.budgetMax,
    preferredZones: prefs?.preferredZones ?? [],
    preferredAmenities: prefs?.preferredAmenities ?? [],
    moveInDate: prefs?.moveInDate ?? '',
    hasPets: prefs?.hasPets ?? false,
    petDetails: prefs?.petDetails ?? '',
  }
  const draft =
    existing?.draft && typeof existing.draft === 'object'
      ? existing.draft
      : backendDraft

  try {
    window.localStorage.setItem(
      TENANT_ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        userId: user.id,
        draft,
        currentStep: TOTAL_STEPS,
        completedSteps: [1, 2],
        isComplete: true,
        completedAt: existing?.completedAt ?? new Date().toISOString(),
        rehydratedFromBackendAt: new Date().toISOString(),
      }),
    )
    // Notify localStorage-driven consumers (sidebar, layout) in this tab.
    window.dispatchEvent(new Event('onboarding-updated'))
  } catch {
    // Storage unavailable (quota/private mode) — cache only, never blocking.
  }
}
