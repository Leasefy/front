'use client'

/**
 * IrALaCobranza — el camino de la Cartera a la Cobranza.
 *
 * Hasta el 2026-09-16 Cobranza era una card del riel de Pagos, al lado de
 * Cartera. Ese día pasó a su propia fila en «Agentes IA» (Nico: «una sección
 * sólo de agentes»), con su URL de siempre, y la card se fue: una sala la
 * reclama un solo lugar del menú.
 *
 * Pero desde la cartera tiene que seguir habiendo a dónde ir, porque la
 * cartera es exactamente lo que la cobranza persigue. Es un ENLACE y no una
 * pestaña a propósito: una pestaña diría que la cobranza es otra lectura de la
 * misma plata, y es otra cosa —el agente que sale a recuperarla—.
 *
 * Se muestra con el MISMO gate con que el sidebar muestra la fila de Cobranza
 * (`pasaGateDeFila` sobre la fila del catálogo, y el encuadre por rol), así
 * que nadie ve un enlace que no se le abre, ni pierde uno que el menú le da.
 */

import Link from 'next/link'
import { ArrowRight, ChatCircleText } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { pasaGateDeFila } from '@/lib/nav/agency-nav-filter'
import { canSeeBusinessModule } from '@/lib/nav/agency-module-scope'
import { modulosDelPanel } from '@/lib/nav/arquitectura-del-panel'

const COBRANZA = modulosDelPanel().find((m) => m.key === 'cobranza')

export function IrALaCobranza() {
  const { canAccess, isAdmin, agencyRole, agentAccessStatus } = usePermissionsContext()
  if (!COBRANZA) return null

  const ctx = { canAccess, isAdmin, agencyRole, agentUnverified: agentAccessStatus === 'sin-verificar' }
  if (!pasaGateDeFila(COBRANZA, ctx) || !canSeeBusinessModule(COBRANZA.scope, { isAdmin, agencyRole })) {
    return null
  }

  return (
    <Button asChild variant="secondary" size="sm" hideArrow>
      <Link href={COBRANZA.href} data-testid="ir-a-la-cobranza">
        <ChatCircleText className="h-4 w-4" aria-hidden="true" />
        Ir a la cobranza
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </Button>
  )
}
