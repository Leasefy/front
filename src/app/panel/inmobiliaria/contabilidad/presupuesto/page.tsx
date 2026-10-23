'use client';

/**
 * Presupuesto — `/panel/inmobiliaria/contabilidad/presupuesto`.
 *
 * Permiso `reportes:view`, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/presupuesto*` (contrato del 17-09, §11) y el
 * mismo con el que se abre toda la contabilidad.
 */

import Link from 'next/link';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { PresupuestoPanel } from '@/components/finanzas/Presupuesto';

export default function PresupuestoPage() {
  return (
    <PageGuard module="reportes" roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]} seccion="Contabilidad" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg"
          >
            Contabilidad
          </Link>
          <EncabezadoDePantalla
            seccion="Finanzas"
            titulo="Presupuesto"
            descripcion="Lo que se planeó para el mes, contra lo que pasó y contra el mismo mes del año pasado."
            ayuda={
              <ParaEntenderMas etiqueta="Para entender más" variante="secundario">
                <p className="text-body-sm text-fg-muted">Los rubros que el sistema todavía no sabe medir se pueden presupuestar igual: salen con guion y dicen por qué, en vez de un cero que se leería como «no gastaste nada».</p>
              </ParaEntenderMas>
            }
          />
        </div>
        <PresupuestoPanel />
      </div>
    </PageGuard>
  );
}
