/**
 * Naira · Briefing — la raíz del workspace de Naira (Fase 13, plan 13-03; D13-1′, D13-3).
 *
 * El único guard de la página es el del módulo de su fila en «Agentes IA» (`naira`) con la acción REAL de esta pantalla
 * (ver el briefing), no un `view` genérico. El admin del monolito pasa este guard (R13-7): el 403 del servicio de agentes
 * sigue siendo la autoridad y lo pinta la vista.
 */

import type { JSX } from 'react'

import { PageGuard } from '@/components/auth/PageGuard'

import { BriefingClient } from './BriefingClient'

export default function NairaBriefingPage(): JSX.Element {
  return (
    <PageGuard module="naira" action="briefing-view">
      <BriefingClient />
    </PageGuard>
  )
}
