'use client';

/**
 * Extracto bancario — conciliación contra los cobros, que emite recibos de caja.
 *
 * Se entra desde el encabezado de Cobros. No confundir con «Conciliación IA»
 * del sidebar, que es el workspace del micro de agentes.
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { ExtractoBancario } from '@/components/cobros/extracto-bancario/ExtractoBancario';

export default function ExtractoBancarioPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <SectionLabel>Finanzas</SectionLabel>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Extracto bancario</h1>
            <p className="max-w-2xl text-sm text-fg-muted">
              Conciliación bancaria: cada línea del extracto se cruza con los cobros que tienen saldo, y
              conciliarla emite el recibo de caja. Nada entra sin que alguien lo confirme.
            </p>
          </div>
          <Button asChild variant="secondary" hideArrow className="shrink-0">
            <Link href="/panel/inmobiliaria/cobros">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a cobros
            </Link>
          </Button>
        </header>

        <ExtractoBancario />
      </div>
    </PageGuard>
  );
}
