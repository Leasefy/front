'use client'

/**
 * Saldo del sistema anterior — lo que los inquilinos traían a la fecha de
 * corte, cuánto ya entró y cuánto falta (Nico, 10-10-2026).
 *
 * Permiso `dispersiones`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/cartera/saldo-del-sistema-anterior`: lo recaudado no se
 * gira solo y quien decide el giro es finanzas.
 */

import { useTr } from '@/lib/i18n/use-tr'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PageGuard } from '@/components/auth/PageGuard'
import { PestanasDeCartera } from '@/components/cartera/PestanasDeCartera'
import { SaldoDelSistemaAnterior } from '@/components/cartera/SaldoDelSistemaAnterior'

export default function SaldoDelSistemaAnteriorPage() {
  // C1 (revisora r25): el sobretítulo es la cara del riel, «Cobrar a inquilinos».
  const tr = useTr()
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion={tr('Cobrar a inquilinos')}
          titulo="Saldo del sistema anterior"
          descripcion="Lo que cada inquilino debía en el sistema anterior a la fecha de corte, cobrado como cualquier deuda."
          ayuda={
            <ParaEntenderMas etiqueta="Cómo se cobra" titulo="Cómo se cobra el saldo anterior" variante="secundario">
              <p className="text-body-sm text-fg-muted">
                Se cobra como cualquier deuda, con interés desde la fecha de corte. Lo que se recauda
                de este saldo no se le gira solo al propietario.
              </p>
            </ParaEntenderMas>
          }
        />

        <PestanasDeCartera />

        <SaldoDelSistemaAnterior />
      </div>
    </PageGuard>
  )
}
