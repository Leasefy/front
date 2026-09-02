import type { AgencyMemberRole, UserRole } from './types'
import type { ActiveContext } from './active-context'

/** El Piloto automático es la entrada al panel para TODO miembro. */
export const AGENCY_HOME_ROUTE = '/panel/inmobiliaria/piloto'

/**
 * Landing route for an agency member after login.
 *
 * ── Por qué ya no depende del sub-rol (Nico, 2026-08-31) ──────────────────
 * Antes cada sub-rol caía en una pantalla distinta (ADMIN → la raíz del panel,
 * que es el chat; AGENTE → pipeline; CONTADOR → cobros; VIEWER → dashboard).
 * La decisión de producto es que «piloto automático siempre sea el inicio»:
 * es la torre de control transversal y la primera fila del sidebar, así que
 * abrir el panel en otra parte contradecía la navegación.
 *
 * Mandar ahí a los cuatro sub-roles es seguro porque el Piloto NO tiene gate
 * de módulo (`module: null` en el sidebar, igual que el hub /ai): es visible
 * para todo miembro activo, y cada widget se defiende solo — la bandeja
 * esconde sus botones de acción cuando el rol es VIEWER (el micro le
 * respondería 403) y cada endpoint es fail-soft por separado.
 */
export function getAgencyHomeRoute(_agencyRole?: AgencyMemberRole | null): string {
  return AGENCY_HOME_ROUTE
}

/**
 * Single source of truth for the "where does this role land after auth"
 * mapping. Reused by AuthForm's post-login redirect (both the auto-redirect
 * effect and `redirectAfterLogin`), ProtectedRoute's role-mismatch redirect,
 * and LandingAuthCta's "Ir al panel" CTA — do not re-implement this switch
 * anywhere else.
 *
 * For agency users this is `AGENCY_HOME_ROUTE` (el Piloto automático), que
 * todo miembro puede abrir — el `agencyRole` ya no cambia el destino, pero se
 * mantiene en la firma porque lo pasan varios llamadores.
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
