'use client';

/**
 * Egresos — `/panel/inmobiliaria/contabilidad/egresos`.
 *
 * Permiso `reportes:view`, el mismo con el que el back protege toda la
 * contabilidad. Lo que escribe se deshabilita con su motivo si el rol no es
 * ADMIN ni CONTADOR (`ContabilidadEscrituraGuard`), y además la aprobación de
 * un lote la tiene que dar otra persona que la que lo armó.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { PageGuard } from '@/components/auth/PageGuard';
import { Egresos, parteDeEgresos } from '@/components/contabilidad/egresos/Egresos';
import { ROLES_DE_LA_CONTABILIDAD } from '@/lib/auth/roles-de-la-contabilidad';

export default function EgresosPage() {
  const parte = parteDeEgresos(useSearchParams().get('parte'));

  return (
    <PageGuard module="reportes" roles={ROLES_DE_LA_CONTABILIDAD} seccion="Contabilidad" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg"
          >
            Contabilidad
          </Link>
          <EncabezadoDePantalla
            seccion="Dinero"
            titulo="Egresos"
            descripcion="Lo que la inmobiliaria le paga a sus proveedores, abogados, técnicos y empleados."
          />
        </div>
        <Egresos key={parte} inicial={parte} />
      </div>
    </PageGuard>
  );
}
