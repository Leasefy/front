'use client'

import { TenantOnboardingProvider, useTenantOnboarding } from '@/lib/context/TenantOnboardingContext'
import {
  TenantOnboardingShell,
  TenantOnboardingSuccess,
  StepTenantWelcome,
  StepEmployment,
  StepHousingPreferences,
} from '@/components/onboarding/tenant'

function TenantOnboardingContent() {
  const { currentStep, isComplete, draft } = useTenantOnboarding()

  // Show success screen when complete
  if (isComplete) {
    return <TenantOnboardingSuccess userName={draft.displayName || 'inquilino'} />
  }

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepTenantWelcome />
      case 2:
        return <StepEmployment />
      case 3:
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
