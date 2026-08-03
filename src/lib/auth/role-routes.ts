import type { AgencyMemberRole, UserRole } from './types'
import type { ActiveContext } from './active-context'

/**
 * Per-agency-sub-role landing route for an agency member after login. Each role
 * lands on a destination it CAN access by its default permissions (Inicio is
 * ungated for all members, so an unknown/null sub-role falls back safely there).
 * ADMIN → Inicio (full access); AGENTE → pipeline; CONTADOR → cobros;
 * VIEWER → dashboard.
 */
export function getAgencyHomeRoute(agencyRole: AgencyMemberRole | null | undefined): string {
  switch (agencyRole) {
    case 'AGENTE':
      return '/panel/inmobiliaria/pipeline'
    case 'CONTADOR':
      return '/panel/inmobiliaria/cobros'
    case 'VIEWER':
      return '/panel/inmobiliaria/dashboard'
    case 'ADMIN':
    default:
      return '/panel/inmobiliaria'
  }
}

/**
 * Single source of truth for the "where does this role land after auth"
 * mapping. Reused by AuthForm's post-login redirect (both the auto-redirect
 * effect and `redirectAfterLogin`), ProtectedRoute's role-mismatch redirect,
 * and LandingAuthCta's "Ir al panel" CTA — do not re-implement this switch
 * anywhere else.
 *
 * For agency users, pass `agencyRole` to land on the per-sub-role destination.
 * Omitting it (backward-compat) routes agency users to the safe default
 * '/panel/inmobiliaria' (Inicio), which every member can access.
 */
export function getRoleHomeRoute(
  role: UserRole | string | undefined,
  agencyRole?: AgencyMemberRole | null,
): string {
  if (role === 'agency') return getAgencyHomeRoute(agencyRole)
  if (role === 'landlord') return '/panel'
  return '/inquilino'
}

/**
 * User-aware home/dashboard destination: an authenticated user lands on
 * their role dashboard (owner rule: "logged in → dashboard, everywhere"),
 * only a truly anonymous visitor goes to the public landing. Used by brand/
 * logo links (BrandHomeLink) AND flow navigation (e.g. the tenant wizard's
 * post-submit redirect).
 *
 * Works for session-degraded profiles too (`profileSource: 'session'` still
 * carries a role — mapSupabaseUser defaults to 'tenant'). Agency membership
 * needs no extra detection here: `toFrontendRole` already maps backend
 * AGENT/INMOBILIARIA to the frontend 'agency' role that getRoleHomeRoute
 * routes to /panel/inmobiliaria.
 */
export function getUserHomeRoute(
  user: { role?: UserRole | string } | null | undefined,
  activeContext?: ActiveContext | null,
  agencyRole?: AgencyMemberRole | null,
): string {
  if (!user) return '/'
  // Dual-context disambiguation: a user carrying an ACTIVE agency membership
  // (personal role + agency) is ambiguous by role alone. When the effective
  // active context is 'agency', route to the agency panel; otherwise fall back
  // to the personal role route. `activeContext` is omitted/undefined for
  // single-context callers, preserving today's behavior exactly.
  if (activeContext === 'agency') return getAgencyHomeRoute(agencyRole)
  return getRoleHomeRoute(user.role, agencyRole)
}

/**
 * Panel role-admission for ProtectedRoute. A user is admitted when their
 * personal role is in `allowedRoles`, OR — when `allowAgencyMembers` is set for
 * the agency panel — when they hold an ACTIVE agency membership even though
 * their personal role is tenant/landlord. Pure agency users pass via role
 * regardless of membership, so this is a strict WIDENING: it never removes
 * existing access. No `allowedRoles` = unrestricted (unchanged).
 */
export function isPanelRoleAllowed(
  role: string | undefined,
  allowedRoles: readonly string[] | undefined,
  opts?: { allowAgencyMembers?: boolean; hasActiveAgencyMembership?: boolean },
): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true
  if (role && allowedRoles.includes(role)) return true
  return !!(opts?.allowAgencyMembers && opts.hasActiveAgencyMembership)
}
