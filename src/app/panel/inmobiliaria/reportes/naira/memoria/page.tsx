/**
 * page.tsx — la pestaña «Qué cree Naira» del workspace de Naira (Fase 13, plan 13-07). Primer y único `PageGuard` con el
 * módulo de la fila y la acción real (`memory-view`); el 403 del servicio lo pinta la vista. Hasta que 10-06 publique `naira`
 * en `/my-permissions`, queda oculta (D13-3).
 */

import { PageGuard } from '@/components/auth/PageGuard'

import { MemoriaClient } from './MemoriaClient'

export default function NairaMemoriaPage() {
  return (
    <PageGuard module="naira" action="memory-view">
      <MemoriaClient />
    </PageGuard>
  )
}
