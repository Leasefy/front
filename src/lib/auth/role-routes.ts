import type { UserRole } from './types'

/**
 * Single source of truth for the "where does this role land after auth"
 * mapping. Reused by AuthForm's post-login redirect (both the auto-redirect
 * effect and `redirectAfterLogin`), ProtectedRoute's role-mismatch redirect,
 * and LandingAuthCta's "Ir al panel" CTA — do not re-implement this switch
 * anywhere else.
 */
export function getRoleHomeRoute(role: UserRole | string | undefined): string {
  if (role === 'agency') return '/panel/inmobiliaria'
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
): string {
  return user ? getRoleHomeRoute(user.role) : '/'
}
