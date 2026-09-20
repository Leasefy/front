'use client';

/**
 * La portada de Nómina: qué falta para poder liquidar, y el costo del mes.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { SectionLabel } from '@/components/ui/section-label';
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
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Nómina</SectionLabel>
          <h1 className="text-h2 text-fg">Nómina</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Empleados con contrato laboral, asesores por comisiones, contratistas de prestación de servicios y aprendices. Liquidación quincenal o mensual, provisión mensual de prestaciones sociales, aportes de seguridad social y nómina electrónica de la DIAN. La planilla PILA se hace por fuera.
          </p>
        </header>
        <EstadoDeNominaPanel />
      </div>
    </PageGuard>
  );
}
