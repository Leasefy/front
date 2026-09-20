'use client'

/**
 * /pagos/agente — «Agente de pagos», la fila del equipo de agentes de pagos en
 * «Agentes IA» (Nico, 2026-09-16).
 *
 * No es la Sala que se retiró ese mismo día (el tercer renglón de Pagos): no
 * trae pestañas ni repite Pagos fallidos, Recordatorios o Por aprobar, que ya
 * viven en Cobranza y en Liquidaciones. Dice qué hace el equipo, qué está
 * encendido y qué le falta, y muestra su tablero sólo cuando el micro lo
 * publique. Ver `components/inmobiliaria/pagos/agente/AgenteDePagos.tsx`.
 *
 * Gate: el de la Sala de la que viene —ADMIN y CONTADOR—, el mismo que declara
 * su fila en `arquitectura-del-panel.ts`.
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { AgenteDePagos } from '@/components/inmobiliaria/pagos/agente/AgenteDePagos'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgenteDePagos } from '@/lib/hooks/use-agente-de-pagos'

function AgenteDePagosConDatos() {
  const lectura = useAgenteDePagos()
  return <AgenteDePagos lectura={lectura} />
}

export default function AgenteDePagosPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <AgenteDePagosConDatos />
    </PageGuard>
  )
}
