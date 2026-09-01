'use client';

/**
 * Reglas de mora — cómo cobra la inmobiliaria cuando un canon se atrasa.
 *
 * Se entra desde el encabezado de Cobros. Permiso: `cobros`/view, el mismo
 * con el que el back protege el listado; crear y editar piden los suyos y la
 * pantalla los respeta.
 */

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { ReglasDeMora } from '@/components/cobros/reglas-de-mora/ReglasDeMora';

export default function ReglasDeMoraPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <SectionLabel>Finanzas</SectionLabel>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Reglas de mora</h1>
            <p className="max-w-2xl text-sm text-fg-muted">
              Se aplican en orden, de arriba abajo, sobre cada cobro vencido: primero corre el interés
              pasados los días de plazo y después, si la regla existe, el gasto administrativo. Lo que
              cada una agrega queda como línea propia en el estado de cuenta del inquilino.
            </p>
          </div>
          <Button asChild variant="secondary" hideArrow className="shrink-0">
            <Link href="/panel/inmobiliaria/cobros">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a cobros
            </Link>
          </Button>
        </header>

        <ReglasDeMora />
      </div>
    </PageGuard>
  );
}
