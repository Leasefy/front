'use client'

/**
 * Cartera — todo lo que le deben a la inmobiliaria, en una pantalla.
 *
 * Antes esto estaba repartido: `/cobros` muestra el mes corriente,
 * `/tesoreria` explica cómo se calcula el neto del propietario (con un ejemplo,
 * no con datos), `/conciliacion` redirige a la sala de IA, y el reporte de
 * edades —que sí existía y se calculaba entero— vivía dentro de Reportes, en
 * una pestaña avanzada, cortado a las diez deudas más grandes.
 *
 * Permiso: `cobros`/view, el mismo con el que el back protege el reporte.
 */

import { useTr } from '@/lib/i18n/use-tr'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { PageGuard } from '@/components/auth/PageGuard'
import { CarteraCompleta } from '@/components/cartera/CarteraCompleta'
import { PestanasDeCartera } from '@/components/cartera/PestanasDeCartera'
import { IrALaCobranza } from '@/components/cartera/IrALaCobranza'

export default function CarteraPage() {
  // C1 (revisora r25): el sobretítulo es la cara del riel, «Cobrar a inquilinos».
  const tr = useTr()
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        {/* GLOW UP (22-10): el encabezado común; una línea de para qué sirve. Quién
            la persigue (Cobranza, un agente) es un enlace en las acciones. */}
        <EncabezadoDePantalla
          seccion={tr('Cobrar a inquilinos')}
          titulo="Cartera"
          descripcion="Lo que pasó el plazo y se persigue, separado de lo que todavía no vence."
          acciones={<IrALaCobranza />}
        />

        {/* Las otras dos lecturas de la misma plata: por concepto y por pagar. */}
        <PestanasDeCartera />

        <CarteraCompleta />
      </div>
    </PageGuard>
  )
}
