'use client'
// Phase 30 plan 30-06 | COTI-UI-03 | XR-03
// 3-carrier grid: 1-col at sm, 3-col at md+. AnimatePresence handles reorder.

import { AnimatePresence } from 'framer-motion'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'
import { CarrierCard } from './CarrierCard'

interface CarrierStreamGridProps {
  carriers: CarrierState[]
  locale?: string
}

export function CarrierStreamGrid({ carriers, locale }: CarrierStreamGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {carriers.map(carrier => (
          <CarrierCard
            key={carrier.carrier}
            carrier={carrier}
            locale={locale}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
