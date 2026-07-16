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

interface LandingHeaderProps {
  /** Internal pages (no dark hero to sit over) render solid from first paint. */
  forceSolid?: boolean
}

/**
 * Landing header state machine: `overlay-dark` (transparent, over the
 * home hero) transitions to `solid` past the scroll threshold, or is
 * `solid` from first paint on internal pages via `forceSolid`. All
 * navigation uses real Next `<Link>` routes — no hash fragments, no
 * `pushState` workaround (spec: Real Navigation).
 */
export function LandingHeader({ forceSolid = false }: LandingHeaderProps) {
  const pathname = usePathname()
  const { solid } = useHeaderScrollState(forceSolid)

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
