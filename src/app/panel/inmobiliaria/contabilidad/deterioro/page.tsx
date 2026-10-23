'use client';

/**
 * Deterioro de cartera — `/panel/inmobiliaria/contabilidad/deterioro`.
 *
 * Permiso `reportes`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/deterioro` y el mismo con el que se abre el
 * resto de Contabilidad (ver `contabilidad/page.tsx`: el back todavía no tiene
 * un módulo `contabilidad` en la matriz de permisos).
 */

import Link from 'next/link';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { DeterioroDeCarteraPanel } from '@/components/finanzas/DeterioroDeCartera';

export default function DeterioroPage() {
  return (
    <PageGuard module="reportes" roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]} seccion="Contabilidad">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg"
          >
            Contabilidad
          </Link>
          <EncabezadoDePantalla
            seccion="Contabilidad"
            titulo="Deterioro de cartera"
            descripcion="Cuánta de la cartera se reconoce como incobrable, por edades."
            ayuda={
              <ParaEntenderMas etiqueta="Para entender más" variante="secundario">
                <p className="text-body-sm text-fg-muted">El sistema sugiere los porcentajes; el contador los edita y los aprueba cada mes. Lo que va al libro es el movimiento contra el mes anterior, no el saldo.</p>
              </ParaEntenderMas>
            }
          />
        </div>
        <DeterioroDeCarteraPanel />
      </div>
    </PageGuard>
  );
}
