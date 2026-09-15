'use client'

/**
 * Cartera por concepto — lo que debe cada inquilino, por mes y por concepto.
 *
 * Nico (2026-09-12): «Nicolás debe 3 meses; esos meses ya generaron intereses
 * y gasto administrativo según la regla de cobro. Quiero ver cuánto debe POR
 * MES, cuánto EN TOTAL, y dividido por CONCEPTO.»
 *
 * Permiso: `cobros`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/cartera/inquilinos` — es la misma plata que lista
 * `/cobros`, vista por deuda.
 */

import { SectionLabel } from '@/components/ui/section-label'
import { PageGuard } from '@/components/auth/PageGuard'
import { CarteraPorConcepto } from '@/components/cartera/CarteraPorConcepto'
import { PestanasDeCartera } from '@/components/cartera/PestanasDeCartera'

export default function CarteraPorConceptoPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Cobros</SectionLabel>
          <h1 className="text-h2 text-fg">Cartera por concepto</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Cuánto debe cada inquilino, mes a mes, separado en canon, intereses de mora, gasto
            administrativo y lo demás que se le cobra.
          </p>
        </header>

        <PestanasDeCartera />

        <CarteraPorConcepto />
      </div>
    </PageGuard>
  )
}
