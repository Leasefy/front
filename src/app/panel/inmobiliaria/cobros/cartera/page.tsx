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

export default function CarteraPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Cobros</SectionLabel>
          <h1 className="text-h2 text-fg">
            Cartera
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground line-clamp-2">
            Todo lo pendiente y lo vencido, por edad de la deuda. Lo que todavía
            no vence va aparte: no es mora.
          </p>
        </header>

        <CarteraCompleta />
      </div>
    </PageGuard>
  )
}
