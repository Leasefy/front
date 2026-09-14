'use client'

/**
 * Cartera por pagar — cuánto le debe la inmobiliaria a cada propietario, por mes.
 *
 * Nico (2026-09-12): «Y cuánto le debe la inmobiliaria al propietario, por
 * mes. Para analizar flujo de caja.»
 *
 * Permiso: `dispersiones`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/cartera/propietarios` — es la misma cuenta que muestra
 * `/dispersiones/preview`, sólo que para todos los meses.
 */

import { SectionLabel } from '@/components/ui/section-label'
import { PageGuard } from '@/components/auth/PageGuard'
import { CarteraDePropietarios } from '@/components/cartera/CarteraDePropietarios'
import { PestanasDeCartera } from '@/components/cartera/PestanasDeCartera'

export default function CarteraPorPagarPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Cobros</SectionLabel>
          <h1 className="text-h2 text-fg">Por pagar a propietarios</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Lo que hay que girarle a cada propietario, mes a mes: lo recaudado a su nombre menos
            la comisión y lo que se le cobra a él.
          </p>
        </header>

        <PestanasDeCartera />

        <CarteraDePropietarios />
      </div>
    </PageGuard>
  )
}
