'use client';

/**
 * Lotes al banco — los pagos a propietarios que salen juntos.
 *
 * Ruta: /panel/inmobiliaria/pagos/dispersiones/lotes
 * Permiso: `dispersiones`/view, el mismo del `GET` del back.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { ListaDeLotes } from '@/components/dispersiones/lotes/ListaDeLotes';

/**
 * «Ir a Lotes» desde una dispersión trae su mes (`?mes=2026-09`): la pantalla
 * abre en ESE mes y no en el de hoy. `useSearchParams` en Next 14 pide
 * Suspense; el respaldo es la lista en el mes actual.
 */
function ListaEnElMesPedido() {
  const params = useSearchParams();
  return <ListaDeLotes mesInicial={params.get('mes')} />;
}

export default function LotesDeDispersionPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Pagos</SectionLabel>
          <h1 className="text-h2 text-fg">Lotes al banco</h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
            Los pagos a propietarios de un mes, juntos, en el archivo plano del banco desde el que giras.
          </p>
        </header>
        <Suspense fallback={<ListaDeLotes />}>
          <ListaEnElMesPedido />
        </Suspense>
      </div>
    </PageGuard>
  );
}
