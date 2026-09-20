'use client';

/**
 * Plata pendiente de aplicar — `/panel/inmobiliaria/pagos/pendientes`.
 *
 * Permiso `dispersiones:view`: es plata de un tercero (una aseguradora) hasta
 * que se aplica o se devuelve, igual que el cuadre y los giros.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { PendientesDeAplicarPanel } from '@/components/tesoreria/PendientesDeAplicar';

export default function PendientesDeAplicarPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Tesorería</SectionLabel>
          <h1 className="text-h2 text-fg">Pendiente de aplicar</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Plata que entró y que todavía no se puede aplicar: lo que una aseguradora pagó por
            encima de lo VENCIDO de un inquilino. Un siniestro cubre la mora, no adelanta cánones
            que aún no vencen. Se queda como pasivo —es de quien la puso— hasta que venzan más
            cuotas o alguien la devuelva.
          </p>
        </header>
        <PendientesDeAplicarPanel />
      </div>
    </PageGuard>
  );
}
