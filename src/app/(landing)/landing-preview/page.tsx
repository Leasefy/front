import type { Metadata } from 'next'
import { landingRobots } from '@/lib/landing/landing-stage'
import { LandingHome } from '@/components/landing/home/LandingHome'

// Staging home for the theatrical scroll port. SLICE 3b replaces S3a's
// interim direct two-section wire with the `<LandingHome>` composer
// (T3.6), which now renders all five narrative beats in order. This is
// also the single import the final flip (S9) swaps into `src/app/page.tsx`.
// This route never conflicts with the live `/`, and `landingRobots()`
// keeps it out of search indexes while LANDING_STAGE is true.
export const metadata: Metadata = {
  title: 'Leasefy — Vista previa',
  description: 'Vista previa en construcción del nuevo home de Leasefy.',
  robots: landingRobots(),
}

export default function LandingPreviewPage() {
  return (
    <div data-testid="landing-preview-shell">
      <LandingHome />
    </div>
  )
}
