'use client'

import { ArrowClockwise, WarningCircle, LifebuoyIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import type { FalloDeAprovisionamiento } from '@/lib/hooks/use-onboarding-provisioning'

const CORREO_DE_SOPORTE = 'hola@leasefy.co'

export interface OnboardingProvisioningErrorBannerProps {
  /** Retries the provisioning call (`POST /users/me/onboarding`). */
  onRetry: () => void
  /** Qué pasó exactamente. Sin esto se cae al mensaje genérico de siempre. */
  fallo?: FalloDeAprovisionamiento | null
}

/**
 * Lo que se ve cuando `useOnboardingProvisioning` no consigue el
 * `agentSessionId`.
 *
 * Dos cambios sobre la versión anterior, los dos por lo mismo: el mensaje
 * genérico no dejaba ni entender ni salir.
 *
 *  1. Se muestra lo que dijo el back, que ya viene en español y es específico
 *     («el NIT es requerido», «contacta a soporte»). Antes el hook se comía el
 *     error con un `catch` vacío y todo el mundo veía la misma frase.
 *  2. El botón de reintentar sólo aparece cuando reintentar puede funcionar.
 *     Con la agencia en FAILED —terminal por diseño en el back— reintentar da
 *     exactamente el mismo error para siempre: ahí lo que sirve es escribir a
 *     soporte, con el número del error a la vista para que lo puedan buscar.
 */
export function OnboardingProvisioningErrorBanner({
  onRetry,
  fallo,
}: OnboardingProvisioningErrorBannerProps) {
  const reintentable = fallo ? fallo.reintentable : true
  const mensaje =
    fallo?.mensaje ??
    'Ocurrió un problema al preparar el registro de tu inmobiliaria. Intenta de nuevo.'

  return (
    <div
      data-testid="onboarding-provisioning-error"
      className="flex items-start gap-3 rounded-lg border border-border bg-danger-soft p-4"
    >
      <WarningCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger" weight="fill" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-danger">
          {reintentable ? 'No pudimos abrir tu registro' : 'Tu registro quedó bloqueado'}
        </p>
        <p className="mt-1 text-body-sm text-fg-muted">{mensaje}</p>

        {reintentable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            hideArrow
            onClick={onRetry}
            className="mt-3"
          >
            <ArrowClockwise className="h-4 w-4" aria-hidden />
            Reintentar
          </Button>
        ) : (
          <Button asChild type="button" variant="outline" size="sm" hideArrow className="mt-3">
            <a href={`mailto:${CORREO_DE_SOPORTE}?subject=${encodeURIComponent('No puedo terminar el registro de mi inmobiliaria')}`}>
              <LifebuoyIcon className="h-4 w-4" aria-hidden />
              Escribir a soporte
            </a>
          </Button>
        )}

        {fallo?.status ? (
          <p className="mt-2 font-mono text-caption tabular-nums text-fg-subtle">
            Código {fallo.status}
          </p>
        ) : null}
      </div>
    </div>
  )
}
