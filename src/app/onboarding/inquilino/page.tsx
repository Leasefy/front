'use client'

import { TenantOnboardingProvider, useTenantOnboarding } from '@/lib/context/TenantOnboardingContext'
import {
  TenantOnboardingShell,
  StepTenantWelcome,
  StepHousingPreferences,
} from '@/components/onboarding/tenant'
import { Spinner } from '@/components/ui/spinner'

function TenantOnboardingContent() {
  const { currentStep, isComplete } = useTenantOnboarding()

  // Completed: the shell's submit handler owns the ONE router.push to the
  // dashboard (fired after submitOnboarding resolves, post-refreshUser).
  // Render only a minimal transitional state while that navigation lands —
  // no celebration screen, no second push (owner rule: no intermediate stop).
  if (isComplete) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepTenantWelcome />
      case 2:
        return <StepHousingPreferences />
      default:
        return <StepTenantWelcome />
    }
  }

  return <TenantOnboardingShell>{renderStep()}</TenantOnboardingShell>
}

export default function TenantOnboardingPage() {
  return (
    <TenantOnboardingProvider>
      <TenantOnboardingContent />
    </TenantOnboardingProvider>
  )
}
