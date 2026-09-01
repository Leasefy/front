'use client';

/**
 * Lotes al banco — los pagos a propietarios que salen juntos.
 *
 * Ruta: /panel/inmobiliaria/dispersiones/lotes
 * Permiso: `dispersiones`/view, el mismo del `GET` del back.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { ListaDeLotes } from '@/components/dispersiones/lotes/ListaDeLotes';

export default function LotesDeDispersionPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Finanzas</SectionLabel>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Lotes al banco</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Los pagos a propietarios de un mes, juntos: se arma el lote, lo aprueba otra persona y
            sale el archivo plano para subir al banco.
          </p>
        </header>
        <ListaDeLotes />
      </div>
    </PageGuard>
  );
}
