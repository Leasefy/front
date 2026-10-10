'use client'

/**
 * Saldo del sistema anterior — lo que los inquilinos traían a la fecha de
 * corte, cuánto ya entró y cuánto falta (Nico, 10-10-2026).
 *
 * Permiso `dispersiones`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/cartera/saldo-del-sistema-anterior`: lo recaudado no se
 * gira solo y quien decide el giro es finanzas.
 */

import { SectionLabel } from '@/components/ui/section-label'
import { PageGuard } from '@/components/auth/PageGuard'
import { PestanasDeCartera } from '@/components/cartera/PestanasDeCartera'
import { SaldoDelSistemaAnterior } from '@/components/cartera/SaldoDelSistemaAnterior'

export default function SaldoDelSistemaAnteriorPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Pagos · inquilinos</SectionLabel>
          <h1 className="text-h2 text-fg">Saldo del sistema anterior</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Lo que cada inquilino debía en el sistema anterior a la fecha de corte. Se cobra como cualquier
            deuda, con interés desde el corte; lo que se recauda no se le gira solo al propietario.
          </p>
        </header>

        <PestanasDeCartera />

        <SaldoDelSistemaAnterior />
      </div>
    </PageGuard>
  )
}
