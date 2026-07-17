'use client'

import { useAuth } from '@/lib/auth/use-auth'
import { getRoleHomeRoute } from '@/lib/auth/role-routes'

interface LandingAuthCtaProps {
  /** Matches the two spots this CTA replaces in LandingHome.tsx markup. */
  variant?: 'header' | 'mobile'
}

const VARIANT_CLASS: Record<NonNullable<LandingAuthCtaProps['variant']>, string> = {
  header: 'btn outline sm',
  mobile: 'btn outline lg',
}

/**
 * Landing header/mobile-menu auth CTA.
 *
 * Replaces the previously hardcoded `http://localhost:3001/auth` anchor
 * (absolute URL + target="_blank", opened a new tab out of the app and
 * never reflected an existing session).
 *
 * SSR/hydration note: `useAuth()`'s initial state is always
 * `{ user: null, isLoading: true }` on both server and first client render,
 * so this always renders the logged-out branch until `AuthProvider`'s effect
 * settles post-mount — no hydration mismatch.
 */
export function LandingAuthCta({ variant = 'header' }: LandingAuthCtaProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const className = VARIANT_CLASS[variant]

  if (!isLoading && isAuthenticated && user) {
    return (
      <a className={className} href={getRoleHomeRoute(user.role)}>
        Ir al panel
      </a>
    )
  }

  return (
    <a className={className} href="/auth">
      Iniciar sesión
    </a>
  )
}
