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

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { PageGuard } from '@/components/auth/PageGuard'
import { CarteraPorConcepto } from '@/components/cartera/CarteraPorConcepto'
import { PestanasDeCartera } from '@/components/cartera/PestanasDeCartera'
import { IrALaCobranza } from '@/components/cartera/IrALaCobranza'

export default function CarteraPorConceptoPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Pagos · inquilinos"
          titulo="Cartera por concepto"
          descripcion="Cuánto debe cada inquilino, mes a mes, separado en canon, intereses de mora, gasto administrativo y lo demás que se le cobra."
          acciones={<IrALaCobranza />}
        />

        <PestanasDeCartera />

        <CarteraPorConcepto />
      </div>
    </PageGuard>
  )
}
