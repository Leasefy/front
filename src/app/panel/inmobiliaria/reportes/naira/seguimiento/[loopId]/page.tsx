/**
 * B/seguimiento/[loopId] — la ficha N4 de UN loop de Naira, su bitácora (Fase 13, plan 13-04; D13-3, P16). Es el deep link
 * de «Ver la bitácora» (desde la pestaña Seguimiento y desde el detalle de una señal).
 *
 * Primer y único PageGuard: el módulo `naira` con la acción de lectura de la pestaña (`open-loops-view`). `params` es una
 * Promise en Next 15 y se resuelve con `await` (D13-19).
 */

import type { JSX } from 'react'

import { PageGuard } from '@/components/auth/PageGuard'

import { LoopClient } from './LoopClient'

export default async function NairaLoopPage({ params }: { params: Promise<{ loopId: string }> }): Promise<JSX.Element> {
  const { loopId } = await params
  return (
    <PageGuard module="naira" action="open-loops-view">
      <LoopClient loopId={loopId} />
    </PageGuard>
  )
}
