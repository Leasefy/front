'use client';

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { LibroDeAsientos } from '@/components/contabilidad/asientos/LibroDeAsientos';

export default function AsientosPage() {
  return (
    <PageGuard module="configuracion">
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
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Asientos</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            El libro, del más reciente al más viejo. Cada asiento se abre con sus líneas; lo que
            está mal se reversa, y un período cerrado ya no admite fechas adentro.
          </p>
        </header>
        <LibroDeAsientos />
      </div>
    </PageGuard>
  );
}
