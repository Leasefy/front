'use client';

/**
 * El plan de cuentas, fuera de la migración.
 *
 * Es el MISMO componente del paso 4 (`PlanDeCuentas`), sin el pie que manda
 * al paso 5: acá no hay secuencia que seguir.
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { PlanDeCuentas } from '@/components/migracion/PlanDeCuentas';

export default function PlanDeCuentasPage() {
  return (
    <PageGuard module="reportes">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Contabilidad
          </Link>
          <SectionLabel>Finanzas</SectionLabel>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Plan de cuentas</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            El PUC de la inmobiliaria. El código de una cuenta no se cambia; una cuenta con
            movimientos no se borra, se desactiva.
          </p>
        </header>
        <PlanDeCuentas sinPaso5 />
      </div>
    </PageGuard>
  );
}
