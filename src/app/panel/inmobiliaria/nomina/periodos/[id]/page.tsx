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
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { SectionLabel } from '@/components/ui/section-label';
import { PeriodoDeNominaDetalle } from '@/components/nomina/PeriodoDetalle';

export default function PeriodoDeNominaPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <Link
            href="/panel/inmobiliaria/nomina/periodos"
            className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Liquidación
          </Link>
          <SectionLabel>Nómina</SectionLabel>
          <h1 className="text-h2 text-fg">El período</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Cada persona con su neto y su desprendible. Lo que un contador tiene que
            validar sale marcado antes de aprobar.
          </p>
        </header>
        {id ? <PeriodoDeNominaDetalle periodoId={id} /> : null}
      </div>
    </PageGuard>
  );
}
