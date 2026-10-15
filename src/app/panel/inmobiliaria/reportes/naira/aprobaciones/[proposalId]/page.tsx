/**
 * B/aprobaciones/[proposalId] — la ficha de una propuesta de Naira (Fase 13, plan 13-05; D13-3, D13-14, D13-19).
 *
 * Primer y único PageGuard: el módulo `naira` con la acción REAL de la pestaña dueña (`action-view`). Abrir esta ficha es
 * lo único que pide el detalle de la propuesta (el servidor registra que se presentó). En Next 15 `params` es una
 * `Promise` que la página resuelve con `await`.
 */

import type { JSX } from 'react'

import { PageGuard } from '@/components/auth/PageGuard'

import { PropuestaClient } from './PropuestaClient'

export default async function NairaPropuestaPage({ params }: { params: Promise<{ proposalId: string }> }): Promise<JSX.Element> {
  const { proposalId } = await params
  return (
    <PageGuard module="naira" action="action-view">
      <PropuestaClient proposalId={proposalId} />
    </PageGuard>
  )
}
