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
