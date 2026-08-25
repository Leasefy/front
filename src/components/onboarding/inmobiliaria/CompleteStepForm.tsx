'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { OnboardingSessionCompleteResponse, OnboardingSessionStepConflict } from '@/lib/api/generated/agency'
import type { OnboardingSessionError } from '@/lib/api/onboarding-session.service'
import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'

export interface CompleteStepFormProps {
  isSubmitting: boolean
  onSubmit: () => Promise<OnboardingSessionCompleteResponse | null>
  /** Session-level error from the hook — passed as the full object (not just `.message`,
   * like the other step forms) because this step branches on `.kind` and `.conflict`. */
  error: OnboardingSessionError | null
  /** Navigates the wizard to a step other than `complete` — used by the missing-steps CTA. */
  onNavigateToStep: (step: OnboardingWizardStep) => void
}

const MISSING_STEP_LABELS: Record<string, string> = {
  agency: 'Datos de la agencia',
  members: 'Miembros',
  payment_provider: 'Medio de pago',
  policy: 'Política',
  habeas_data: 'Habeas data',
}

/** Wizard order, used to resolve "the first missing step" out of an unordered `missingSteps` list. */
const STEP_ORDER: OnboardingWizardStep[] = ['agency', 'members', 'payment_provider', 'policy', 'habeas_data']

function labelFor(step: string): string {
  return MISSING_STEP_LABELS[step] ?? step
}

/**
 * `/complete`'s 409 body is a UNION of `OnboardingSessionStepConflict` (`requiredStep`)
 * and `OnboardingSessionCompleteMissingSteps` (`missingSteps: string[]`) — the service
 * types `error.conflict` uniformly as the former, so this reads defensively at runtime
 * instead of trusting the static type. See onboarding-session.service.ts's header.
 */
function extractMissingSteps(conflict: OnboardingSessionStepConflict | undefined): string[] | null {
  const candidate = conflict as unknown as { missingSteps?: unknown } | undefined
  return candidate && Array.isArray(candidate.missingSteps) ? (candidate.missingSteps as string[]) : null
}

function firstMissingStep(missingSteps: string[]): OnboardingWizardStep | null {
  const found = STEP_ORDER.find((step) => missingSteps.includes(step))
  if (found) return found
  const fallback = missingSteps[0]
  return STEP_ORDER.includes(fallback as OnboardingWizardStep) ? (fallback as OnboardingWizardStep) : null
}

/**
 * Form for the wizard's terminal `complete` step — no fields, just a confirm CTA
 * that calls `completeOnboarding()`.
 *
 *  - Success → redirects with `window.location.href` (the response's `dashboardUrl`
 *    is potentially cross-domain, so the Next.js router is deliberately not used here).
 *  - 409 conflict → NOT a hard error: the session isn't actually done yet. See
 *    `extractMissingSteps` above for how the two possible 409 shapes are discriminated.
 *  - Any other error kind is NOT handled here — the parent renders the generic
 *    `OnboardingSessionErrorBanner` for those instead (same contract as every other step).
 */
export function CompleteStepForm({ isSubmitting, onSubmit, error, onNavigateToStep }: CompleteStepFormProps) {
  const [redirecting, setRedirecting] = useState(false)

  const handleFinish = async () => {
    const result = await onSubmit()
    if (result) {
      setRedirecting(true)
      window.location.href = result.dashboardUrl
    }
  }

  if (error?.kind === 'conflict') {
    const missingSteps = extractMissingSteps(error.conflict)
    const requiredStep = error.conflict?.requiredStep ?? null

    const missingStepKeys = missingSteps ?? (requiredStep ? [requiredStep] : [])
    const targetStep = missingSteps ? firstMissingStep(missingSteps) : requiredStep

    return (
      <div
        data-testid="complete-step-missing"
        className="rounded-lg border border-border bg-surface p-6 space-y-4 shadow-sm"
      >
        <div className="flex items-start gap-2">
          <WarningCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-fg">Te faltan estos pasos antes de finalizar</p>
            {missingStepKeys.length > 0 && (
              <ul className="mt-2 space-y-1 text-body-sm text-fg-muted list-disc list-inside">
                {missingStepKeys.map((step) => (
                  <li key={step}>{labelFor(step)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {targetStep && (
          <Button
            type="button"
            hideArrow
            size="lg"
            className="w-full"
            onClick={() => onNavigateToStep(targetStep)}
            data-testid="complete-step-go-to-missing"
          >
            Ir a {labelFor(targetStep)}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      data-testid="complete-step-form"
      className="rounded-lg border border-border bg-surface p-6 text-center space-y-4 shadow-sm"
    >
      <div className="w-12 h-12 mx-auto rounded-md bg-primary-soft flex items-center justify-center">
        <CheckCircle className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h2 className="text-h2">Ya casi está</h2>
        <p className="text-body-sm text-fg-muted mt-1">
          Revisa que todo esté en orden y confirma para finalizar tu registro.
        </p>
      </div>

      <Button
        type="button"
        hideArrow
        size="lg"
        className="w-full"
        disabled={isSubmitting || redirecting}
        onClick={handleFinish}
        data-testid="complete-step-finish"
      >
        {redirecting ? (
          <>
            <Spinner size="xs" variant="current" />
            Redirigiendo a tu panel...
          </>
        ) : isSubmitting ? (
          <>
            <Spinner size="xs" variant="current" />
            Finalizando...
          </>
        ) : (
          <>
            Finalizar onboarding
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  )
}
