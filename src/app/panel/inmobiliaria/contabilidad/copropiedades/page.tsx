'use client';

/**
 * Copropiedades — `/panel/inmobiliaria/contabilidad/copropiedades`.
 *
 * Permiso `reportes`/view, el mismo con el que se abre el resto de
 * Contabilidad: son un TERCERO del libro, no una entrada del directorio.
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { Copropiedades } from '@/components/contabilidad/copropiedades/Copropiedades';

export default function CopropiedadesPage() {
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
          <h1 className="text-h2 text-fg">Copropiedades</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            El conjunto o el edificio donde está el inmueble, con su NIT. Es el dueño de la cuota de
            administración: sin él, esa plata queda en el libro sin decir de quién es, y eso es lo
            que traba la exógena.
          </p>
        </header>
        <Copropiedades />
      </div>
    </PageGuard>
  );
}
