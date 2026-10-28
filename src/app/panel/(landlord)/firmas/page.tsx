'use client'

import { Suspense } from 'react'
import { PantallaDeFirmas } from '@/components/firmas/PantallaDeFirmas'

/** /panel/firmas — Firmas del propietario sin inmobiliaria (Nico, 28-10-2026). */
export default function FirmasDelPropietarioPage() {
  return (
    <Suspense fallback={null}>
      <PantallaDeFirmas donde="propietario" />
    </Suspense>
  )
}
