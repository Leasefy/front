'use client';

/**
 * Traslado de la comisión — `/panel/inmobiliaria/pagos/traslados`.
 *
 * Permiso `dispersiones:view`, el mismo con el que el back protege el cuadre de
 * plata de terceros: es plata de propietarios e inquilinos hasta que se separa la
 * comisión, y «el asesor no ve nada que tenga que ver con operación» (17-09).
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { TrasladoDeComisionPanel } from '@/components/tesoreria/TrasladoDeComision';

export default function TrasladosPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Tesorería</SectionLabel>
          <h1 className="text-h2 text-fg">Traslado de la comisión a tu cuenta</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            En la cuenta de recaudo casi nada es tuyo, pero tu comisión sí — y se queda ahí hasta
            que la muevas. Mientras no la trasladas, el cuadre de plata de terceros va a mostrar
            esa diferencia. Acá se propone con su desglose y se aprueba: no sale solo.
          </p>
        </header>
        <TrasladoDeComisionPanel />
      </div>
    </PageGuard>
  );
}
