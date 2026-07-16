import type { CSSProperties, ReactNode } from 'react'
import { Inter_Tight, IBM_Plex_Mono } from 'next/font/google'
import { LandingHeader } from '@/components/landing/layout/LandingHeader'
import { LandingFooter } from '@/components/landing/layout/LandingFooter'

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

interface LandingLayoutProps {
  children: ReactNode
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div
      data-testid="landing-scope"
      className={`landing-scope ${interTight.variable} ${ibmPlexMono.variable}`}
      style={
        {
          // Bridge to the ported landing CSS custom properties
          // (--fd/--fb/--fm) referenced throughout the standalone
          // stylesheet (design §5).
          '--fd': 'var(--font-inter-tight)',
          '--fb': 'var(--font-inter-tight)',
          '--fm': 'var(--font-ibm-plex-mono)',
        } as CSSProperties
      }
    >
      <LandingHeader />
      {children}
      <LandingFooter />
    </div>
  )
}
