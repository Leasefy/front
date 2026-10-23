'use client';

/**
 * Copropiedades — `/panel/inmobiliaria/contabilidad/copropiedades`.
 *
 * Permiso `reportes`/view, el mismo con el que se abre el resto de
 * Contabilidad: son un TERCERO del libro, no una entrada del directorio.
 */

import Link from 'next/link';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { Copropiedades } from '@/components/contabilidad/copropiedades/Copropiedades';

export default function CopropiedadesPage() {
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
            seccion="Finanzas"
            titulo="Copropiedades"
            descripcion="El conjunto o el edificio donde está el inmueble, con su NIT."
            ayuda={
              <ParaEntenderMas etiqueta="Para entender más" variante="secundario">
                <p className="text-body-sm text-fg-muted">Es el dueño de la cuota de administración: sin él, esa plata queda en el libro sin decir de quién es, y eso es lo que traba la exógena.</p>
              </ParaEntenderMas>
            }
          />
        </div>
        <Copropiedades />
      </div>
    </PageGuard>
  );
}
