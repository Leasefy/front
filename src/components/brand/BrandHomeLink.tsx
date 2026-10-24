'use client'

import Link from 'next/link'
import { useContext, type ComponentProps } from 'react'
import { AuthContext } from '@/lib/auth/auth-context'
import { inicioDeLaPersona } from '@/lib/auth/role-routes'
import { cn } from '@/lib/utils'

/**
 * Brand/logo link honoring the owner rule "logged in → dashboard, everywhere":
 * an authenticated user is sent to their role dashboard (getUserHomeRoute),
 * an anonymous visitor to the public landing.
 *
 * Reads AuthContext LENIENTLY (plain useContext, no throw) so public chrome
 * (landing header/footer) keeps rendering in isolation — tests, previews, or
 * any tree without AuthProvider simply behave as anonymous → '/'.
 */
export function BrandHomeLink(props: Omit<ComponentProps<typeof Link>, 'href'>) {
  const auth = useContext(AuthContext)
  // For dual-context users the destination follows the active context; for
  // single-context users activeContext mirrors their role, so this is a no-op.
  // «Cambiar de cuenta» (21-10-2026): con varias cuentas, a la última que usó.
  // T-0173: `hit-area-44` gives the logo link a 44 px touch hit area (the mark is ~24 px tall).
  const className = cn('relative hit-area-44', props.className)
  if (!auth?.user) return <Link href="/" {...props} className={className} />
  return <Link href={inicioDeLaPersona(auth.user, auth.agencyRole, auth.ultimaCuenta, auth.activeContext)} {...props} className={className} />
}
