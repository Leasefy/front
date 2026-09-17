'use client';

/**
 * Recaudo — cuánto llegó, cuánto hay disponible y cómo va el mes.
 *
 * Permiso: `cobros`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/recaudo/*`.
 */

import { SectionLabel } from '@/components/ui/section-label';
import { PageGuard } from '@/components/auth/PageGuard';
import { Recaudo } from '@/components/recaudo/Recaudo';
import Link from 'next/link';

export default function RecaudoPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Pagos · inquilinos</SectionLabel>
          <h1 className="text-h2 text-fg">Recaudo</h1>
          <p className="max-w-2xl text-sm text-muted-foreground line-clamp-2">
            Lo que llegó, lo que falta, lo que salió a propietarios y lo que queda en la mano, mes
            por mes. Debajo de cada cifra está escrito de qué se compone.
          </p>
          {/* 17-09-2026: los estudios que pagan los solicitantes, con su recibo. */}
          <div className="flex flex-wrap gap-4">
            <Link className="text-sm underline text-fg" href="/panel/inmobiliaria/pagos/recaudo/estudios">
              Estudios pagados por solicitantes
            </Link>
            {/* D11 (17-09-2026): las aseguradoras que pagan siniestros. */}
            <Link className="text-sm underline text-fg" href="/panel/inmobiliaria/pagos/recaudo/aseguradoras">
              Aseguradoras
            </Link>
          </div>
        </header>
        <Recaudo />
      </div>
    </PageGuard>
  );
}
