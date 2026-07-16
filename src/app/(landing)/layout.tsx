'use client'

import type { CSSProperties, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Inter, Inter_Tight, IBM_Plex_Mono } from 'next/font/google'
import { LandingHeader } from '@/components/landing/layout/LandingHeader'
import { LandingFooter } from '@/components/landing/layout/LandingFooter'
import './landing.css'
import './landing-v2.css'

// Scoped font exception (ADR-2): Inter Tight (display) + IBM Plex Mono
// load ONLY inside this route group, applied to a wrapper <div> — never
// the root <html>. Every other route keeps rendering Cadence fonts
// (Schibsted Grotesk + JetBrains Mono) from src/app/layout.tsx unaffected.
const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter-tight',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
})

// F1 (landing-react-port final integration): the v2 home (`.lv2` scope)
// also needs a body font — Inter — matching the standalone's `--fb` token.
// Loaded here (not a second layout) so both `.landing-scope` and `.lv2`
// share the same font bridge, inherited via CSS custom-property cascade.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})

// Routes whose home markup (LandingHome, port fiel of the standalone
// index.html) is fully self-contained — it renders its OWN <header>/<footer>
// 1:1 with the original design. Rendering the shared LandingHeader/
// LandingFooter here too would double them up. Every other route in this
// group (blog, contacto, productos, landing-preview) keeps the shared chrome.
const SELF_CONTAINED_CHROME_PATHS = ['/']

interface LandingLayoutProps {
  children: ReactNode
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  const pathname = usePathname()
  const hasOwnChrome = SELF_CONTAINED_CHROME_PATHS.includes(pathname ?? '')

  return (
    <div
      data-testid="landing-scope"
      className={`landing-scope ${interTight.variable} ${ibmPlexMono.variable} ${inter.variable}`}
      style={
        {
          // Bridge to the ported landing CSS custom properties
          // (--fd/--fb/--fm) referenced throughout the standalone
          // stylesheet (design §5). Deliberately UNCHANGED from S3a: the
          // old landing port's own `.landing-scope{font-family:var(--fb)}`
          // rule keeps resolving to Inter Tight (ADR-2 scope decision — no
          // regression to already-shipped/tested routes). `inter.variable`
          // is still applied to this same wrapper class so `--font-inter`
          // exists as a custom property; the v2 home (`.lv2`, nested inside
          // this wrapper) overrides `--fb` locally to `var(--font-inter)`
          // on its own element — a directly-declared value on a descendant
          // always wins over an inherited one, so this override is scoped
          // to `.lv2` only and never touches the old landing routes.
          '--fd': 'var(--font-inter-tight)',
          '--fb': 'var(--font-inter-tight)',
          '--fm': 'var(--font-ibm-plex-mono)',
          // Locked (HANDOFF "reglas de oro"): the eclipse orb is a flat
          // near-black, never a gradient. Scoped here (not Cadence's
          // --ink, which is a warmer #14130F) to match the standalone's
          // exact --night value.
          '--night': '#080808',
        } as CSSProperties
      }
    >
      {!hasOwnChrome && <LandingHeader />}
      {children}
      {!hasOwnChrome && <LandingFooter />}
    </div>
  )
}
