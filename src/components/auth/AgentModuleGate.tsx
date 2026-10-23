'use client'

/**
 * Puerta de los módulos del AGENTE (cobranza, cotizador).
 *
 * ⚠️ El bug que arregla: la pantalla mostraba «No tienes acceso a Cobranza» y
 * un segundo después entraba. Gateaba sólo con `isLoading`, y ese flag se
 * libera aunque al agente NUNCA se le haya podido preguntar: con `agencyId`
 * todavía sin hidratar el fetch ni se dispara, y como cobranza y cotizador
 * fallan CERRADO, «sin resolver» se leía como «denegado».
 *
 * Acusar a alguien de no tener acceso y desdecirse en el cuadro siguiente es
 * peor que esperar. Los tres estados se dicen distinto:
 *
 *   resolviendo    → esqueleto (todavía se está averiguando)
 *   sin-verificar  → «No pudimos verificar tu acceso» + reintentar
 *                    (el agente no contestó; NO es una negativa)
 *   resuelto       → `canAccess` manda: entra, o se le niega de verdad
 *
 * `canAccess` sigue siendo la ÚNICA autoridad para conceder. Lo único que
 * cambia es qué se le dice a la persona mientras tanto.
 */

import type { ReactNode } from 'react'
import { Lock } from '@phosphor-icons/react'

import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useI18n } from '@/lib/i18n'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { BackButton } from '@/components/ui/back-button'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { ApiError } from '@/lib/api/client'
import {
  CODIGO_SERVICIO_NO_DISPONIBLE,
  textoParaUnAviso,
} from '@/lib/conexion/servicio-no-disponible'

export interface AgentModuleGateProps {
  /** Módulo del agente: 'cobranza' | 'cotizador'. */
  module: string
  /** Copia del «no tienes acceso» propia del módulo. */
  deniedTitle: string
  /** El nombre de la pantalla, para que la puerta no quede sin título cuando el asistente no contesta. */
  titulo?: string
  /** La sección del menú (sobretítulo). */
  seccion?: string
  /** Una salida a lo que sí funciona sin el asistente. */
  salida?: { label: string; href: string }
  /** En una sub-pantalla, a dónde se vuelve (revisora r25, C1). */
  vuelta?: { label: string; href: string }
  children: ReactNode
}

/** La caída del asistente dicha como capa 2 (servicio `asistente`), para `FalloDeCarga`. */
const CAIDA_DEL_ASISTENTE = new ApiError(503, textoParaUnAviso('asistente'), CODIGO_SERVICIO_NO_DISPONIBLE, {
  statusCode: 503,
  code: CODIGO_SERVICIO_NO_DISPONIBLE,
  servicio: 'asistente',
})

export function AgentModuleGate({
  module,
  deniedTitle,
  titulo,
  seccion,
  salida,
  vuelta,
  children,
}: AgentModuleGateProps) {
  const { canAccess, isLoading, agentAccessStatus, refetch } =
    usePermissionsContext()
  const { t } = useI18n()

  // Sin resolver ≠ denegado.
  if (isLoading || agentAccessStatus === 'resolviendo') {
    return <PageSkeleton variant="dashboard" />
  }

  // El encabezado de la puerta: la vuelta (en una sub-pantalla) y el título de la ruta.
  const marco = (
    <>
      {vuelta ? <BackButton href={vuelta.href} label={vuelta.label} variant="subtle" /> : null}
      {titulo ? <EncabezadoDePantalla seccion={seccion} titulo={titulo} /> : null}
    </>
  )

  // El agente no contestó. Decirlo, no convertirlo en una negativa. Revisora r25 (C1): con `FalloDeCarga` —la
  // misma pieza de las caídas de la capa 2 («El asistente de Leasefy no está disponible en este momento»), su
  // «Intentar de nuevo» y la salida a lo que sí funciona—, en vez del cartel armado a mano.
  if (agentAccessStatus === 'sin-verificar') {
    return (
      <div className="space-y-6 p-6 lg:p-8" data-testid="puerta-sin-verificar">
        {marco}
        <FalloDeCarga
          error={CAIDA_DEL_ASISTENTE}
          queEs="tu acceso"
          onReintentar={() => refetch()}
          volverA={salida}
        />
      </div>
    )
  }

  // Sin acceso de verdad: el mismo marco (antes un callejón sin encabezado ni salida).
  if (!canAccess(module, 'view')) {
    return (
      <div className="space-y-6 p-6 lg:p-8" data-testid="puerta-sin-acceso">
        {marco}
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-6 py-14 text-center">
          <Lock className="h-8 w-8 text-fg-subtle" weight="duotone" aria-hidden="true" />
          <p className="text-body font-medium text-fg">{deniedTitle}</p>
          <p className="max-w-sm text-body-sm text-fg-muted">{t('inmobiliaria.ai.access.contactAdmin')}</p>
          {salida ? (
            <Button asChild variant="outline" size="sm" hideArrow className="mt-1">
              <Link href={salida.href}>{salida.label}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
