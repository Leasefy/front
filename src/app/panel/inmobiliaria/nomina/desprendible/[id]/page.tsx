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
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { SectionLabel } from '@/components/ui/section-label';
import { DesprendiblePanel } from '@/components/nomina/Desprendible';

export default function DesprendiblePage() {
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
          <h1 className="text-h2 text-fg">Desprendible de pago</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Cada renglón con su base, sus días u horas y su norma. Los aportes del
            empleador aparecen porque son parte del costo, aunque no se le
            descuenten a la persona.
          </p>
        </header>
        {id ? <DesprendiblePanel liquidacionId={id} /> : null}
      </div>
    </PageGuard>
  );
}
