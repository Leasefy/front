'use client'

/**
 * /pagos/agente — «Agente de pagos», la fila de Payu en «Agentes IA».
 *
 * 26-09-2026: el resumen del mes en una frase y el link de cada cuota, leídos
 * del back (`GET /inmobiliaria/cobros/links[/resumen]`). Antes pedía un tablero
 * al micro que no existía y sólo decía «Apagado». Ver
 * `components/inmobiliaria/pagos/agente/AgenteDePagos.tsx`.
 *
 * Gate: ADMIN y CONTADOR, el mismo que declara su fila en
 * `arquitectura-del-panel.ts`.
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { AgenteDePagos } from '@/components/inmobiliaria/pagos/agente/AgenteDePagos'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'

export default function AgenteDePagosPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <AgenteDePagos />
    </PageGuard>
  )
}
