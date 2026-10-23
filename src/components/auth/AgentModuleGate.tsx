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
import Link from 'next/link'
import { Button } from '@/components/ui'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'

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
  children: ReactNode
}

export function AgentModuleGate({
  module,
  deniedTitle,
  titulo,
  seccion,
  salida,
  children,
}: AgentModuleGateProps) {
  const { canAccess, isLoading, agentAccessStatus, refetch } =
    usePermissionsContext()
  const { t } = useI18n()

  // Sin resolver ≠ denegado.
  if (isLoading || agentAccessStatus === 'resolviendo') {
    return <PageSkeleton variant="dashboard" />
  }

  // El agente no contestó. Decirlo, no convertirlo en una negativa. Revisora r24 (Cobranza #1 y #2): con el título
  // de la pantalla, la frase de la capa 2 («El asistente de Leasefy no responde ahora») y una salida a lo que sí
  // funciona; antes, un cartel sin título que hablaba del «servicio de permisos».
  if (agentAccessStatus === 'sin-verificar') {
    return (
      <div className="space-y-6 p-6 lg:p-8" data-testid="puerta-sin-verificar">
        {titulo ? <EncabezadoDePantalla seccion={seccion} titulo={titulo} /> : null}
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-14 text-center">
          <WifiSlash className="h-8 w-8 text-fg-muted" weight="duotone" aria-hidden="true" />
          <p className="text-lg font-medium text-fg">El asistente de Leasefy no responde ahora</p>
          <p className="max-w-sm text-sm text-fg-muted">
            Lo demás sigue funcionando. Tu acceso no cambió: sólo no pudimos comprobarlo.
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" hideArrow onClick={() => void refetch()}>
              Reintentar
            </Button>
            {salida ? (
              <Button asChild variant="ghost" size="sm" hideArrow>
                <Link href={salida.href}>{salida.label}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (!canAccess(module, 'view')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 px-6 text-center">
        <p className="text-lg font-medium text-fg">{deniedTitle}</p>
        <p className="text-sm text-fg-muted max-w-sm">
          {t('inmobiliaria.ai.access.contactAdmin')}
        </p>
      </div>
    )
  }

  return <>{children}</>
}
