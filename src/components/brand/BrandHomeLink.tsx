'use client'

import Link from 'next/link'
import { useContext, type ComponentProps } from 'react'
import { AuthContext } from '@/lib/auth/auth-context'
import { getUserHomeRoute } from '@/lib/auth/role-routes'

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
  return <Link href={getUserHomeRoute(auth?.user, auth?.activeContext)} {...props} />
}
