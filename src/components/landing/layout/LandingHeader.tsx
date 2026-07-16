'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useHeaderScrollState } from './useHeaderScrollState'
import { MegaMenu } from './MegaMenu'

interface NavItem {
  label: string
  href: string
}

// "Producto" is rendered via <MegaMenu> (SLICE 4b) instead of a plain nav
// link — it is a disclosure trigger, not a route by itself.
const NAV_ITEMS: NavItem[] = [
  { label: 'Blog', href: '/blog' },
  { label: 'Contacto', href: '/contacto' },
]

// Routes that render the dark theatrical hero underneath the header —
// every other route has no dark hero to sit over, so the header must
// render solid from first paint there. Includes the pre-flip staging
// route (`/landing-preview`) AND the eventual flip target (`/`) so this
// list keeps working unchanged once SLICE 9 swaps the home route.
const HOME_PATHS = ['/landing-preview', '/']

interface LandingHeaderProps {
  /** Internal pages (no dark hero to sit over) render solid from first paint. */
  forceSolid?: boolean
}

/**
 * Landing header state machine: `overlay-dark` (transparent, over the
 * home hero) transitions to `solid` past the scroll threshold, or is
 * `solid` from first paint on internal pages — derived from the current
 * pathname (`forceSolid` defaults to `true` for every route outside
 * `HOME_PATHS`) — or via an explicit `forceSolid` override. All
 * navigation uses real Next `<Link>` routes — no hash fragments, no
 * `pushState` workaround (spec: Real Navigation).
 */
export function LandingHeader({ forceSolid }: LandingHeaderProps) {
  const pathname = usePathname()
  const isHomeRoute = HOME_PATHS.includes(pathname ?? '')
  const resolvedForceSolid = forceSolid ?? !isHomeRoute
  const { solid } = useHeaderScrollState(resolvedForceSolid)

  return (
    <header data-state={solid ? 'solid' : 'overlay-dark'} className="landing-header">
      <Link href="/" aria-label="Leasefy — inicio" data-testid="landing-header-logo" className="landing-header__logo">
        Leasefy
      </Link>
      <nav aria-label="Navegación principal" className="landing-header__nav">
        <MegaMenu />
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined}>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <Link href="/registro" className="landing-header__cta">
        Empezar ahora
      </Link>
    </header>
  )
}
