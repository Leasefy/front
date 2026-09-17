'use client';

/**
 * 🔴 Cobro jurídico (17-09-2026): abogados, lo pactado, los sugeridos (90 días
 * sin póliza), los casos en jurídico y la cuenta por pagar a los abogados.
 *
 * Vive dentro de Cartera porque es el final del camino de la cartera, y con su
 * mismo permiso: `cobros`/view para ver, `cobros`/edit para mover.
 */

import Link from 'next/link';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { CobroJuridico } from '@/components/cartera/CobroJuridico';

export default function CobroJuridicoPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Pagos · inquilinos</SectionLabel>
          <h1 className="text-h2 text-fg">Cobro jurídico</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Lo que ya no se cobra con una llamada. El sistema sugiere desde el día 90 de mora sin póliza; pasar el
            caso lo decide una persona y queda visible en el contrato y en la cartera.{' '}
            <Link className="underline" href="/panel/inmobiliaria/pagos/cartera">
              Volver a Cartera
            </Link>
          </p>
        </header>
        <CobroJuridico />
      </div>
    </PageGuard>
  );
}
