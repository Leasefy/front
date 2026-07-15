'use client'

import { ArrowClockwise, EnvelopeSimple, LockKey, Warning, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import type { OnboardingSessionError } from '@/lib/api/onboarding-session.service'

export interface OnboardingSessionErrorBannerProps {
  error: OnboardingSessionError
  /** Retries the last failed request. Only wired for retryable kinds. */
  onRetry: () => void
  /** True while `refresh()`/a retry is in flight — disables the retry CTA. */
  isRetrying?: boolean
}

/**
 * Session-level error banner — branches by `error.kind`. Field-level
 * `'validation'` errors are NOT rendered here (they surface inline in
 * `AgencyStepForm`); `'unauthorized'` is handled by a redirect effect in the
 * client orchestrator, this banner only shows the transient "redirecting"
 * message while that effect fires.
 */
export function OnboardingSessionErrorBanner({ error, onRetry, isRetrying }: OnboardingSessionErrorBannerProps) {
  switch (error.kind) {
    case 'expired':
      return (
        <div
          data-testid="onboarding-error-banner-expired"
          className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2"
        >
          <EnvelopeSimple className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Tu sesión de onboarding expiró</p>
            <p className="text-body-sm text-fg-muted mt-0.5">
              Te enviamos un correo para retomarla desde donde quedaste.
            </p>
          </div>
        </div>
      )

    case 'forbidden':
      return (
        <div
          data-testid="onboarding-error-banner-forbidden"
          className="rounded-md bg-danger-soft border border-border p-3 flex items-start gap-2"
        >
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">No puedes continuar esta sesión de onboarding</p>
            <p className="text-body-sm text-fg-muted mt-0.5">
              Esta sesión pertenece a otro usuario o ya fue completada.
            </p>
          </div>
        </div>
      )

    case 'notFound':
      return (
        <div
          data-testid="onboarding-error-banner-not-found"
          className="rounded-md bg-danger-soft border border-border p-3 flex items-start gap-2"
        >
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">No encontramos esta sesión de onboarding</p>
            <p className="text-body-sm text-fg-muted mt-0.5">Verifica el enlace o inicia el registro de nuevo.</p>
          </div>
        </div>
      )

    case 'unauthorized':
      return (
        <div
          data-testid="onboarding-error-banner-unauthorized"
          className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2"
        >
          <LockKey className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Tu sesión expiró</p>
            <p className="text-body-sm text-fg-muted mt-0.5">Redirigiendo al inicio de sesión...</p>
          </div>
        </div>
      )

    case 'unavailable':
    case 'network':
      return (
        <div
          data-testid="onboarding-error-banner-retryable"
          className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2"
        >
          <Warning className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warning">
              {error.kind === 'network' ? 'No pudimos conectarnos' : 'El servicio no está disponible'}
            </p>
            <p className="text-body-sm text-fg-muted mt-0.5">{error.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              hideArrow
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-3"
            >
              <ArrowClockwise className="w-4 h-4" />
              Reintentar
            </Button>
          </div>
        </div>
      )

    // 'conflict' is corrected in-place by the hook (currentStep is realigned)
    // and 'unknown' covers any status the service doesn't special-case.
    default:
      return (
        <div
          data-testid="onboarding-error-banner-unknown"
          className="rounded-md bg-danger-soft border border-border p-3 flex items-start gap-2"
        >
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-danger">Ocurrió un error inesperado</p>
            <p className="text-body-sm text-fg-muted mt-0.5">{error.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              hideArrow
              onClick={onRetry}
              disabled={isRetrying}
              className="mt-3"
            >
              <ArrowClockwise className="w-4 h-4" />
              Reintentar
            </Button>
          </div>
        </div>
      )
  }
}
