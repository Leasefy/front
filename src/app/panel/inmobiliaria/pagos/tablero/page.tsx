'use client';

/**
 * Tablero financiero — `/panel/inmobiliaria/pagos/tablero`.
 *
 * Permiso `dashboard:view`, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/tablero` (contrato del 17-09).
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { TableroFinancieroPanel } from '@/components/finanzas/TableroFinanciero';

export default function TableroFinancieroPage() {
  return (
    <PageGuard module="dashboard" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Finanzas</SectionLabel>
          <h1 className="text-h2 text-fg">Tablero financiero</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Lo que entró, lo que deben, lo que hay que girar y lo que quedó. Las cuatro preguntas de
            la mañana, en un mes y en una sede. Cada cifra dice qué mide.
          </p>
        </header>
        <TableroFinancieroPanel />
      </div>
    </PageGuard>
  );
}
