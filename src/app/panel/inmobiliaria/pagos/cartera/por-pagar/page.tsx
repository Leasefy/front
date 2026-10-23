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

import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { PageGuard } from '@/components/auth/PageGuard'
import { CarteraDePropietarios } from '@/components/cartera/CarteraDePropietarios'
import { PestanasDeCartera } from '@/components/cartera/PestanasDeCartera'
import { QUE_ES_EL_CANON_CAUSADO, ROTULO_DEL_CANON } from '@/lib/propietarios/base-del-canon'

export default function CarteraPorPagarPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Pagar a propietarios"
          titulo="Por pagar a propietarios"
          // Ronda 26 (revisora r25, Por pagar #4): la descripción en una línea; qué es el canon causado, a la ayuda.
          descripcion="Lo que se le gira a cada propietario, mes a mes."
          ayuda={
            <ParaEntenderMas etiqueta="Qué se le gira" titulo="Qué se le gira al propietario" variante="secundario">
              {/*
                🔴 Decía «lo recaudado a su nombre», y la liquidación del
                propietario no sale de lo recaudado: es lo que el contrato cobra
                (base CAUSADO) con sus deducciones — confirmado por Juan Camilo el
                2026-09-16, y es lo que calcula `CarteraDePropietarios`.
              */}
              <p className="text-body-sm text-fg-muted" data-testid="que-se-le-debe">
                Lo que hay que girarle a cada propietario, mes a mes: el{' '}
                {ROTULO_DEL_CANON.CAUSADO.toLowerCase()} a su nombre ({QUE_ES_EL_CANON_CAUSADO}) menos
                la comisión y lo que se le cobra a él.
              </p>
            </ParaEntenderMas>
          }
        />

        <PestanasDeCartera />

        <CarteraDePropietarios />
      </div>
    </PageGuard>
  )
}
