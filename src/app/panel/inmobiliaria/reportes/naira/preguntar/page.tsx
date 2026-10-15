/**
 * B/preguntar — la pestaña Preguntar del workspace de Naira (Fase 13, plan 13-06; D13-3).
 *
 * Primer y único PageGuard: el módulo `naira` con la acción REAL de la pestaña (`conversation-ask`), la misma que declara su
 * ítem en el registro de workspaces. Si el servicio igual responde 403 a una pregunta, lo pinta la vista (sin nada del hilo).
 */

import { PageGuard } from '@/components/auth/PageGuard'

import { PreguntarClient } from './PreguntarClient'

export default function NairaPreguntarPage() {
  return (
    <PageGuard module="naira" action="conversation-ask">
      <PreguntarClient />
    </PageGuard>
  )
}
