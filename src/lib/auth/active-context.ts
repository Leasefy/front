/**
 * Active-context persistence for DUAL-CONTEXT users — a user who has a personal
 * role (TENANT/LANDLORD) AND an ACTIVE agency membership, and can switch which
 * "hat" they are wearing.
 *
 * Persistence: a single localStorage entry scoped to the owner's userId (the
 * same userId-scoping pattern used by the tenant onboarding cache), so a
 * different account on a shared browser never inherits a stale context.
 * Single-context users (pure tenant / landlord / agent) never write this and
 * behave exactly as before.
 */

export type ActiveContext = 'personal' | 'agency'

const STORAGE_KEY = 'leasefy:active-context'

interface StoredActiveContext {
  userId?: string
  context?: ActiveContext
}

/**
 * Read the persisted active context for `userId`. Returns null when there is
 * no entry, the entry belongs to a DIFFERENT user (foreign → treated as
 * absent), or storage is unavailable/corrupt.
 */
export function readActiveContext(userId: string | null | undefined): ActiveContext | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredActiveContext
    if (!parsed || parsed.userId !== userId) return null
    return parsed.context === 'agency' || parsed.context === 'personal'
      ? parsed.context
      : null
  } catch {
    return null
  }
}

/** Persist the active context for `userId` and notify same-tab listeners. */
export function writeActiveContext(userId: string, context: ActiveContext): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, context }))
    window.dispatchEvent(new Event('active-context-updated'))
  } catch {
    // Storage unavailable (quota / private mode) — non-blocking.
  }
}

/** Remove the persisted context entirely (e.g. on sign-out). */
export function clearActiveContext(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * A dual-context user has a personal role (TENANT/LANDLORD) AND an ACTIVE
 * agency membership. Pure agents (role 'agency'), pure tenants and pure
 * landlords are single-context and must see NO context switcher.
 */
export function isDualContextUser(
  user: { role?: string } | null | undefined,
  hasActiveAgencyMembership: boolean,
): boolean {
  if (!user) return false
  const personalRole = user.role === 'tenant' || user.role === 'landlord'
  return personalRole && hasActiveAgencyMembership
}
