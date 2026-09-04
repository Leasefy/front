'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { ReportesContables, informeDe } from '@/components/contabilidad/reportes/ReportesContables';

export default function ReportesContablesPage() {
  const informe = informeDe(useSearchParams().get('informe'));

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
          <h1 className="text-h2 text-fg">Reportes contables</h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
            Todo sale de los movimientos, sin saldos guardados aparte: lo que se ve es lo que hay en
            el libro.
          </p>
        </header>
        {/* `key`: si se llega de nuevo a esta ruta con otro `informe`, Next no
            remonta la página y la pestaña se quedaría en la anterior. */}
        <ReportesContables key={informe} inicial={informe} />
      </div>
    </PageGuard>
  );
}
