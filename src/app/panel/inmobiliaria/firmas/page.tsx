'use client'

import { Suspense } from 'react'
import { PageGuard } from '@/components/auth/PageGuard'
import { PantallaDeFirmas } from '@/components/firmas/PantallaDeFirmas'

/** /panel/inmobiliaria/firmas — Firmas de la inmobiliaria o del agente (Nico, 28-10-2026). */
export default function FirmasPage() {
  return (
    <PageGuard module="documentos" seccion="Firmas">
      <Suspense fallback={null}>
        <PantallaDeFirmas donde="inmobiliaria" />
      </Suspense>
    </PageGuard>
  )
}
