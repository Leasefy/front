import { ShaderHero } from '@/components/landing/home/ShaderHero'
import { EclipseSection } from '@/components/landing/home/EclipseSection'
import { CaseRail } from '@/components/landing/home/CaseRail'
import { FinanceEquation } from '@/components/landing/home/FinanceEquation'
import { ClosingBanner } from '@/components/landing/home/ClosingBanner'

/**
 * Composes the home's continuous theatrical scroll narrative, in spec
 * order (Home Theatrical Scroll Order): ShaderHero (hero, LCP) →
 * EclipseSection (night settle) → CaseRail (Portofino case) →
 * FinanceEquation (finance checklist) → ClosingBanner (mailto CTA).
 *
 * This replaces S3a's interim direct two-section wire in
 * `/landing-preview/page.tsx`; it is also the single import the final
 * flip (S9) swaps into `src/app/page.tsx`.
 */
export function LandingHome() {
  return (
    <div data-testid="landing-home">
      <ShaderHero />
      <EclipseSection />
      <CaseRail />
      <FinanceEquation />
      <ClosingBanner />
    </div>
  )
}
