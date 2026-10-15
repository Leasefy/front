/**
 * Naira · Señal — la ficha N4 de una señal congelada (Fase 13, plan 13-03; E13-1, D13-3, D13-19).
 *
 * Es el destino del enlace «Ver la señal» del correo y del briefing. El único guard de la página es el del módulo
 * `naira` con la acción REAL de esta pantalla (ver una señal). Next 15 / React 19: `params` llega como una promesa que
 * este Server Component resuelve antes de pintar.
 */

import type { JSX } from 'react'

import { PageGuard } from '@/components/auth/PageGuard'

import { SenalClient } from './SenalClient'

export default async function NairaSenalPage({ params }: { params: Promise<{ promocionId: string }> }): Promise<JSX.Element> {
  const { promocionId } = await params
  return (
    <PageGuard module="naira" action="signal-view">
      <SenalClient promocionId={promocionId} />
    </PageGuard>
  )
}
