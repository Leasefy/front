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
import { WifiSlash } from '@phosphor-icons/react'

import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useI18n } from '@/lib/i18n'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { Button } from '@/components/ui'

export interface AgentModuleGateProps {
  /** Módulo del agente: 'cobranza' | 'cotizador'. */
  module: string
  /** Copia del «no tienes acceso» propia del módulo. */
  deniedTitle: string
  children: ReactNode
}

export function AgentModuleGate({
  module,
  deniedTitle,
  children,
}: AgentModuleGateProps) {
  const { canAccess, isLoading, agentAccessStatus, refetch } =
    usePermissionsContext()
  const { t } = useI18n()

  // Sin resolver ≠ denegado.
  if (isLoading || agentAccessStatus === 'resolviendo') {
    return <PageSkeleton variant="dashboard" />
  }

  // El agente no contestó. Decirlo, no convertirlo en una negativa.
  if (agentAccessStatus === 'sin-verificar') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-6 text-center">
        <WifiSlash
          className="w-8 h-8 text-fg-muted"
          weight="duotone"
          aria-hidden="true"
        />
        <p className="text-lg font-semibold text-fg">
          No pudimos verificar tu acceso
        </p>
        <p className="text-sm text-fg-muted max-w-sm">
          El servicio de permisos no respondió. No es que no tengas acceso:
          no pudimos comprobarlo.
        </p>
        <Button
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => void refetch()}
          className="mt-1"
        >
          Reintentar
        </Button>
      </div>
    )
  }

  if (!canAccess(module, 'view')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-fg">{deniedTitle}</p>
        <p className="text-sm text-fg-muted max-w-sm">
          {t('inmobiliaria.ai.access.contactAdmin')}
        </p>
      </div>
    )
  }

  return <>{children}</>
}
