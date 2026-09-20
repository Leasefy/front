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

import { SectionLabel } from '@/components/ui/section-label'
import { PageGuard } from '@/components/auth/PageGuard'
import { CarteraCompleta } from '@/components/cartera/CarteraCompleta'
import { PestanasDeCartera } from '@/components/cartera/PestanasDeCartera'
import { IrALaCobranza } from '@/components/cartera/IrALaCobranza'

export default function CarteraPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <SectionLabel>Pagos · inquilinos</SectionLabel>
            <h1 className="text-h2 text-fg">
              Cartera
            </h1>
            {/* 🔴 Las mismas palabras que la franja y que «Cartera por
                concepto»: deuda no es cartera, y vencer no es estar en mora. */}
            <p className="max-w-2xl text-sm text-muted-foreground line-clamp-2">
              La deuda del contrato, partida en tres: lo que todavía no vence, lo
              vencido dentro del plazo y la cartera. Sólo la cartera se persigue.
            </p>
          </div>
          {/* Quién la persigue. Cobranza es un agente y vive en «Agentes IA»
              (2026-09-16): desde acá se llega con un enlace, no con una card. */}
          <IrALaCobranza />
        </header>

        {/* Las otras dos lecturas de la misma plata: por concepto y por pagar. */}
        <PestanasDeCartera />

        <CarteraCompleta />
      </div>
    </PageGuard>
  )
}
