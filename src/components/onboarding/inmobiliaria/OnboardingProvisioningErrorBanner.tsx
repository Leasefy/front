'use client'

import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export interface OnboardingProvisioningErrorBannerProps {
  /** Retries the provisioning call (`POST /users/me/onboarding`). */
  onRetry: () => void
}

/**
 * Shown when `useOnboardingProvisioning` fails to obtain an `agentSessionId`
 * — either the request itself failed, or the back returned
 * `agentSessionId: null` (user/agency row created, but the handoff to the
 * agent's `onboardingStart` failed). Both cases are terminal from the
 * wizard's point of view and share this single retry-able state.
 */
export function OnboardingProvisioningErrorBanner({ onRetry }: OnboardingProvisioningErrorBannerProps) {
  return (
    <div
      data-testid="onboarding-provisioning-error"
      className="rounded-md bg-danger-soft border border-border p-3 flex items-start gap-2"
    >
      <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-danger">No pudimos iniciar tu sesión de onboarding</p>
        <p className="text-body-sm text-fg-muted mt-0.5">
          Ocurrió un problema al preparar el registro de tu inmobiliaria. Intenta de nuevo.
        </p>
        <Button type="button" variant="outline" size="sm" hideArrow onClick={onRetry} className="mt-3">
          <ArrowClockwise className="w-4 h-4" />
          Reintentar
        </Button>
      </div>
    </div>
  )
}
