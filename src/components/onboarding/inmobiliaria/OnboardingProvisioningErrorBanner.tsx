'use client'

import { ArrowClockwise, WarningCircle, LifebuoyIcon, Plugs, HourglassMedium } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  LO_ESCRITO_NO_SE_PIERDE,
  type CaidaDelRegistro,
  type FalloDeAprovisionamiento,
} from '@/lib/hooks/use-onboarding-provisioning'
import { useEstadoDeConexion } from '@/lib/conexion/estado-de-conexion'
import {
  textoDeServicioNoDisponible,
  useEstadoDelServicio,
} from '@/lib/conexion/servicio-no-disponible'

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
 *
 * Y uno más (01-10-2026): una CAÍDA —el micro de agentes apagado, Leasefy sin
 * responder— no es un error de la persona. Se dice qué se cayó, que lo escrito
 * se queda y que reintentar sirve, sin «Código 503». Ver `BannerDeCaida`.
 */
export function OnboardingProvisioningErrorBanner({
  onRetry,
  fallo,
}: OnboardingProvisioningErrorBannerProps) {
  if (fallo?.caida) return <BannerDeCaida caida={fallo.caida} onRetry={onRetry} />

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
          {/* Nunca «quedó bloqueado»: suena irreversible y no lo es (Nico, 01-10-2026). */}
          {reintentable ? 'No pudimos abrir tu registro' : 'No pudimos seguir con tu registro'}
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

/**
 * Una caída en el registro: tono de aviso (no de error), título humano,
 * «Reintentar» siempre a la vista y ningún código.
 *
 *  - Se cayó una parte: la nombra y, sólo si `/health/servicios` lo confirma,
 *    dice que el equipo ya está avisado.
 *  - Leasefy entero no respondió: la franja de arriba ya lo dice, así que acá
 *    no se repite; mientras la franja esté, «Esperando a Leasefy…». Cuando se
 *    va, toca reintentar.
 */
function BannerDeCaida({ caida, onRetry }: { caida: CaidaDelRegistro; onRetry: () => void }) {
  const conexion = useEstadoDeConexion()
  const servicio = caida.tipo === 'servicio' ? caida.servicio : null
  const estadoDelServicio = useEstadoDelServicio(servicio)

  let titulo: string
  let detalle: string
  if (caida.tipo === 'servicio') {
    const texto = textoDeServicioNoDisponible(servicio, {
      equipoAvisado: estadoDelServicio?.equipoAvisado === true,
      tranquilidad: LO_ESCRITO_NO_SE_PIERDE,
    })
    titulo = texto.titulo
    detalle = texto.detalle
  } else if (conexion === 'sin-internet') {
    titulo = 'Esperando la conexión…'
    detalle = `${LO_ESCRITO_NO_SE_PIERDE} Apenas vuelva, dale a «Reintentar».`
  } else if (conexion === 'leasefy-no-responde') {
    titulo = 'Esperando a Leasefy…'
    detalle = `${LO_ESCRITO_NO_SE_PIERDE} Apenas responda, dale a «Reintentar».`
  } else {
    titulo = 'Se cortó la conexión con Leasefy'
    detalle = `${LO_ESCRITO_NO_SE_PIERDE} Ya puedes volver a intentarlo.`
  }
  const Icono = caida.tipo === 'servicio' ? Plugs : HourglassMedium

  return (
    <div
      data-testid="onboarding-provisioning-error"
      data-caida={caida.tipo}
      role="status"
      className="flex items-start gap-3 rounded-lg border border-border bg-warning-soft p-4"
    >
      <Icono className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" weight="duotone" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{titulo}</p>
        <p className="mt-1 text-body-sm text-fg-muted">{detalle}</p>
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
      </div>
    </div>
  )
}
