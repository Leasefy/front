'use client';

/**
 * El desprendible de pago de una persona.
 *
 * 🔴 Esta pantalla NO recalcula nada: todas las cifras vienen del back,
 * congeladas al liquidar. Ni el neto se suma acá. Es lo que evita que la pantalla
 * muestre un número y el banco gire otro.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { DesprendiblePanel } from '@/components/nomina/Desprendible';

export default function DesprendiblePage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link href="/panel/inmobiliaria/nomina/periodos" className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg">
            Liquidación
          </Link>
          <EncabezadoDePantalla
            seccion="Dinero"
            titulo="Desprendible de pago"
            descripcion="Cada renglón con su base, sus días u horas y su norma; los aportes del empleador van aparte porque son costo, no descuento."
          />
        </div>
        {id ? <DesprendiblePanel liquidacionId={id} /> : null}
      </div>
    </PageGuard>
  );
}
