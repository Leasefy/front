import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'

/**
 * The 6 user-facing steps of the agency onboarding wizard, in order.
 * `'start'` (the hook's pre-agency placeholder step) is not shown — it maps
 * to index 0 (Agencia), the first actionable step.
 */
export const WIZARD_STEPS: { key: OnboardingWizardStep; label: string }[] = [
  { key: 'agency', label: 'Agencia' },
  { key: 'members', label: 'Miembros' },
  { key: 'payment_provider', label: 'Pago' },
  { key: 'policy', label: 'Política' },
  { key: 'habeas_data', label: 'Habeas Data' },
  { key: 'complete', label: 'Confirmar' },
]

/** Resolves the active stepper index from the hook's `currentStep`. */
export function wizardStepIndex(step: OnboardingWizardStep | null): number {
  if (!step || step === 'start') return 0
  const idx = WIZARD_STEPS.findIndex((s) => s.key === step)
  return idx === -1 ? 0 : idx
}
