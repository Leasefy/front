import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'

/**
 * The 5 user-facing steps of the agency onboarding wizard, in order.
 * `'start'` (the hook's pre-agency placeholder step) is not shown — it maps
 * to index 0 (Agencia), the first actionable step.
 *
 * `payment_provider` is intentionally NOT listed here — it's an invisible
 * auto-skip step (see `PaymentProviderAutoSkipStep` / fix/onboarding-skip-payment):
 * the wizard submits `{ skip: true }` on arrival and moves straight to
 * `policy`, with no "Pago" entry ever shown in the stepper.
 */
export const WIZARD_STEPS: { key: OnboardingWizardStep; label: string }[] = [
  { key: 'agency', label: 'Agencia' },
  { key: 'members', label: 'Miembros' },
  { key: 'policy', label: 'Política' },
  { key: 'habeas_data', label: 'Habeas Data' },
  { key: 'complete', label: 'Confirmar' },
]

/**
 * `payment_provider` has no visible stepper entry — while the auto-skip
 * round-trips, pin the stepper/label to the previous visible step
 * (`members`) instead of resolving to -1/"Agencia".
 */
function toVisibleStepKey(step: OnboardingWizardStep): OnboardingWizardStep {
  return step === 'payment_provider' ? 'members' : step
}

/** Resolves the active stepper index from the hook's `currentStep`. */
export function wizardStepIndex(step: OnboardingWizardStep | null): number {
  if (!step || step === 'start') return 0
  const idx = WIZARD_STEPS.findIndex((s) => s.key === toVisibleStepKey(step))
  return idx === -1 ? 0 : idx
}

/** Resolves the step-title label (`<h1>`) shown above the active step form. */
export function wizardStepLabel(step: OnboardingWizardStep | null): string {
  if (!step || step === 'start') return WIZARD_STEPS[0].label
  return WIZARD_STEPS.find((s) => s.key === toVisibleStepKey(step))?.label ?? WIZARD_STEPS[0].label
}
