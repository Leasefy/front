/**
 * B/aprobaciones — la pestaña Aprobaciones del workspace de Naira (Fase 13, plan 13-05; D13-3).
 *
 * Primer y único PageGuard: el módulo `naira` con la acción REAL de la pestaña (`action-view`), la misma que declara su
 * ítem en el registro de workspaces. Si el servicio igual responde 403, lo pinta la vista (sin un dato de antes).
 */

import { PageGuard } from '@/components/auth/PageGuard'

import { AprobacionesClient } from './AprobacionesClient'

export default function NairaAprobacionesPage() {
  return (
    <PageGuard module="naira" action="action-view">
      <AprobacionesClient />
    </PageGuard>
  )
}
