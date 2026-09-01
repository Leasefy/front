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

export default function RecaudoPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Finanzas</SectionLabel>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Recaudo</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Lo que llegó, lo que falta, lo que salió a propietarios y lo que queda en la mano, mes
            por mes. Debajo de cada cifra está escrito de qué se compone.
          </p>
        </header>
        <Recaudo />
      </div>
    </PageGuard>
  );
}
