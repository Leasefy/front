'use client'

import { ArrowClockwise, EnvelopeSimple, HourglassMedium, LockKey, Plugs, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import type { OnboardingSessionError } from '@/lib/api/onboarding-session.service'
import { useEstadoDeConexion } from '@/lib/conexion/estado-de-conexion'
import {
  textoDeServicioNoDisponible,
  useEstadoDelServicio,
} from '@/lib/conexion/servicio-no-disponible'

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
      return <AsistenteCaido onRetry={onRetry} isRetrying={isRetrying} />

    // 'conflict' is corrected in-place by the hook (currentStep is realigned)
    // and 'unknown' covers any status the service doesn't special-case.
    default:
      // Un 502/504 del micro es su proxy diciendo que atrás no hay nadie: el
      // asistente está caído, no «un error inesperado».
      if (error.status === 502 || error.status === 504) {
        return <AsistenteCaido onRetry={onRetry} isRetrying={isRetrying} />
      }
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

/**
 * El micro de agentes no contesta (01-10-2026). Estos pasos le hablan DIRECTO
 * al micro, así que su caída no es «Leasefy entero caído» —el back sigue
 * andando y la franja global no se prende—: es una parte, el asistente (capa
 * 2). Antes decía «El servicio no está disponible» y el `message` crudo del
 * micro; ahora nombra qué se cayó, dice que no es culpa de la persona y —sólo
 * si el back lo confirma— que el equipo ya está avisado.
 *
 * La excepción es no tener internet: eso no es el asistente, y la franja de
 * arriba ya lo dice.
 */
function AsistenteCaido({ onRetry, isRetrying }: { onRetry: () => void; isRetrying?: boolean }) {
  const conexion = useEstadoDeConexion()
  const sinInternet = conexion === 'sin-internet'
  // Con internet caído no se le pregunta al back por el asistente: no llegaría.
  const estadoDelServicio = useEstadoDelServicio(sinInternet ? null : 'asistente')
  const texto = sinInternet
    ? {
        titulo: 'Esperando la conexión…',
        detalle: 'Lo que ya guardaste está a salvo. Apenas vuelva, dale a «Reintentar».',
      }
    : textoDeServicioNoDisponible('asistente', {
        equipoAvisado: estadoDelServicio?.equipoAvisado === true,
        tranquilidad: 'Lo que ya guardaste está a salvo.',
      })
  const Icono = sinInternet ? HourglassMedium : Plugs

  return (
    <div
      data-testid="onboarding-error-banner-retryable"
      role="status"
      className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2"
    >
      <Icono className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" weight="duotone" aria-hidden />
      <div className="flex-1">
        <p className="text-sm font-medium text-fg">{texto.titulo}</p>
        <p className="text-body-sm text-fg-muted mt-0.5">{texto.detalle}</p>
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
