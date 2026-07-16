import type { Metadata } from 'next'
import { landingRobots } from '@/lib/landing/landing-stage'

// Staging home for the theatrical scroll port. `<LandingHome>` composes
// here once SLICE 3 lands (ShaderHero → Eclipse → CaseRail →
// FinanceEquation → ClosingBanner). This route never conflicts with the
// live `/`, and `landingRobots()` keeps it out of search indexes while
// LANDING_STAGE is true.
export const metadata: Metadata = {
  title: 'Leasefy — Vista previa',
  description: 'Vista previa en construcción del nuevo home de Leasefy.',
  robots: landingRobots(),
}

export default function LandingPreviewPage() {
  return (
    <div data-testid="landing-preview-shell">
      <p>Landing preview — en construcción.</p>
    </div>
  )
}
