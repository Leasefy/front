'use client';

/**
 * Un período de nómina con todos sus desprendibles.
 *
 * La lista corta de esta pantalla es la que decide si el período se aprueba: las
 * liquidaciones MARCADAS (una tarifa que depende del perfil tributario, el
 * procedimiento 2 de retención, un aprendiz) salen contadas arriba, antes del
 * botón — no después, cuando ya se entregó el desprendible.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { PeriodoDeNominaDetalle } from '@/components/nomina/PeriodoDetalle';

export default function PeriodoDeNominaPage() {
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
            seccion="Nómina"
            titulo="El período"
            descripcion="Cada persona con su neto y su desprendible; lo que un contador tiene que validar sale marcado antes de aprobar."
          />
        </div>
        {id ? <PeriodoDeNominaDetalle periodoId={id} /> : null}
      </div>
    </PageGuard>
  );
}
