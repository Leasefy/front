import type { Metadata } from 'next'
import { landingRobots } from '@/lib/landing/landing-stage'
import { ShaderHero } from '@/components/landing/home/ShaderHero'
import { EclipseSection } from '@/components/landing/home/EclipseSection'

// Staging home for the theatrical scroll port. SLICE 3a wires the first
// two narrative beats (ShaderHero, EclipseSection) directly here; the
// remaining beats (CaseRail, FinanceEquation, ClosingBanner) plus the
// `<LandingHome>` composer (T3.6) land with SLICE 3b — this page becomes
// a thin `<LandingHome/>` shell at that point. This route never conflicts
// with the live `/`, and `landingRobots()` keeps it out of search indexes
// while LANDING_STAGE is true.
export const metadata: Metadata = {
  title: 'Leasefy — Vista previa',
  description: 'Vista previa en construcción del nuevo home de Leasefy.',
  robots: landingRobots(),
}

export default function LandingPreviewPage() {
  return (
    <div data-testid="landing-preview-shell">
      <ShaderHero />
      <EclipseSection />
    </div>
  )
}
