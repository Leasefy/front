'use client'

import { useAuth } from '@/lib/auth/use-auth'
import { getRoleHomeRoute } from '@/lib/auth/role-routes'

interface LandingRegistroCtaProps {
  /**
   * header/mobile: sit next to a <LandingAuthCta> that already renders
   * "Ir al panel" when authenticated — this CTA renders NOTHING in that
   * case to avoid two panel buttons side by side.
   * banner: the closing CTA has no adjacent LandingAuthCta, so it swaps to
   * "Ir al panel" -> the role's panel route when authenticated, keeping the
   * same class so the layout doesn't jump.
   */
  variant: 'header' | 'mobile' | 'banner'
}

const VARIANT_CLASS: Record<LandingRegistroCtaProps['variant'], string> = {
  header: 'btn primary sm',
  mobile: 'btn primary lg',
  banner: 'btn primary sm',
}

/**
 * Landing "Empezar ahora" CTA — session-aware sibling of LandingAuthCta. Sends
 * new (logged-out) users to /auth in "create account" mode (the profile picker),
 * NOT to /registro — that route is the invitation-completion flow and requires
 * an `invitationToken`, so a plain visitor lands on "Invitación inválida".
 * Registering while already authenticated errors out, so this hides
 * (header/mobile) or redirects to the panel (banner) instead.
 *
 * SSR/hydration note: same as LandingAuthCta — useAuth()'s initial state is
 * always `{ user: null, isLoading: true }` on server + first client render,
 * so this always renders the logged-out branch until AuthProvider's effect
 * settles post-mount — no hydration mismatch.
 */
export function LandingRegistroCta({ variant }: LandingRegistroCtaProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const className = VARIANT_CLASS[variant]
  const authenticated = !isLoading && isAuthenticated && !!user

  if (authenticated) {
    if (variant === 'banner') {
      return (
        <a className={className} href={getRoleHomeRoute(user!.role)}>
          Ir al panel
        </a>
      )
    }
    return null
  }

  return (
    <a className={className} href="/auth?mode=register">
      Empezar ahora
    </a>
  )
}
