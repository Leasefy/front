import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'

/**
 * The 4 user-facing steps of the agency onboarding wizard, in order.
 * `'start'` (the hook's pre-agency placeholder step) is not shown — it maps
 * to index 0 (Agencia), the first actionable step.
 *
 * `payment_provider` and `policy` are intentionally NOT listed here — both are
 * invisible auto-skip steps (see `PaymentProviderAutoSkipStep` /
 * `PolicyAutoSkipStep`): the wizard auto-submits each on arrival and moves on,
 * with no "Pago" / "Política" entry ever shown in the stepper. The collection
 * policy is an optional adjustment configured later in the agency panel.
 */
export const WIZARD_STEPS: { key: OnboardingWizardStep; label: string; descripcion: string }[] = [
  { key: 'agency', label: 'Agencia', descripcion: 'Dirección y contacto' },
  { key: 'members', label: 'Miembros', descripcion: 'Tu equipo, si quieres' },
  { key: 'habeas_data', label: 'Habeas Data', descripcion: 'Términos y datos' },
  { key: 'complete', label: 'Confirmar', descripcion: 'Revisa y crea' },
]

/**
 * Neither `payment_provider` nor `policy` has a visible stepper entry — while
 * either auto-skip round-trips, pin the stepper/label to the previous visible
 * step (`members`) instead of resolving to -1/"Agencia".
 */
function toVisibleStepKey(step: OnboardingWizardStep): OnboardingWizardStep {
  return step === 'payment_provider' || step === 'policy' ? 'members' : step
}

/** Resolves the active stepper index from the hook's `currentStep`. */
export function wizardStepIndex(step: OnboardingWizardStep | null): number {
  if (!step || step === 'start') return 0
  const idx = WIZARD_STEPS.findIndex((s) => s.key === toVisibleStepKey(step))
  return idx === -1 ? 0 : idx
}
