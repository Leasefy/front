'use client'
// Phase 30 plan 30-06 | COTI-UI-03 | XR-03
// 3-carrier grid: 1-col at sm, 3-col at md+.
// Movimiento: `Stagger` (Cadence) — las aseguradoras entran escalonadas (techo
// 320 ms) y se reacomodan con `layout` cuando cambia el orden; cada tarjeta es
// un `StaggerItem` (ver CarrierCard).

import { Stagger } from '@leasefy/cadence'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'
import { CarrierCard } from './CarrierCard'

interface CarrierStreamGridProps {
  carriers: CarrierState[]
  locale?: string
}

export function CarrierStreamGrid({ carriers, locale }: CarrierStreamGridProps) {
  return (
    <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {carriers.map(carrier => (
        <CarrierCard
          key={carrier.carrier}
          carrier={carrier}
          locale={locale}
        />
      ))}
    </Stagger>
  )
}
