'use client';

/**
 * La portada de Nómina: qué falta para poder liquidar, y el costo del mes.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { EstadoDeNominaPanel } from '@/components/nomina/EstadoDeNomina';

/**
 * 🔴 EL GATE DE ESTA PÁGINA TIENE DOS MITADES, y las dos hacen falta.
 *
 *   · `<PageGuard roles>` es lo que impide que un ASESOR COMERCIAL o un VIEWER
 *     entren escribiendo la URL: nómina la ven sólo administrador y contador.
 *   · El **módulo de pago** NO se gatea acá, a propósito: el back responde 402 y
 *     el componente lo pinta como lo que es —un producto que se contrata—, no
 *     como un «no tienes permiso». Un `PageGuard` que redirigiera al inicio
 *     escondería la única explicación útil.
 */
export default function NominaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      {/* GLOW UP 21-10: el encabezado vive en la portada, que sabe si el módulo
          está abierto (sin él no hay «Liquidar un período» que ofrecer). */}
      <div className="p-6 lg:p-8">
        <EstadoDeNominaPanel />
      </div>
    </PageGuard>
  );
}
