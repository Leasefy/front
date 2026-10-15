/**
 * B/seguimiento — la pestaña Seguimiento del workspace de Naira (Fase 13, plan 13-04; D13-3).
 *
 * Primer y único PageGuard: el módulo `naira` con la acción REAL de la pestaña (`open-loops-view`), la misma que declara su
 * ítem en el registro de workspaces. Si el servicio igual responde 403, lo pinta la vista (sin un dato de antes).
 */

import { PageGuard } from '@/components/auth/PageGuard'

import { SeguimientoClient } from './SeguimientoClient'

export default function NairaSeguimientoPage() {
  return (
    <PageGuard module="naira" action="open-loops-view">
      <SeguimientoClient />
    </PageGuard>
  )
}
