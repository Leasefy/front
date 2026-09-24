'use client';

/**
 * Tasas de usura — `/panel/inmobiliaria/pagos/cartera/usura`.
 *
 * Vive bajo Cartera porque es el techo del interés que la cartera genera, y se
 * entra desde Reglas de mora, que es donde se decide cuánto se cobra.
 *
 * Permiso: `cobros`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/usura` (contrato del 17-09).
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { TasasDeUsuraPanel } from '@/components/finanzas/TasasDeUsura';

export default function UsuraPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <Link
            href="/panel/inmobiliaria/pagos/cartera/reglas-de-mora"
            className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Reglas de mora
          </Link>
          <SectionLabel>Pagos · inquilinos</SectionLabel>
          <h1 className="text-h2 text-fg">Tasa de usura</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            El techo legal del interés de mora, mes a mes. El art. 884 del Código de Comercio lo
            amarra a lo que certifica la Superfinanciera: un mes sin tasa cargada es un mes en el
            que el interés se liquida sin techo.
          </p>
        </header>
        <TasasDeUsuraPanel />
      </div>
    </PageGuard>
  );
}
