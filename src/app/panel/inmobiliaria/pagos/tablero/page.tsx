'use client';

/**
 * Tablero financiero — `/panel/inmobiliaria/pagos/tablero`.
 *
 * Permiso `dashboard:view`, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/tablero` (contrato del 17-09).
 *
 * GLOW UP (20-10-2026): el encabezado lo pone el panel, porque el mes y la sede
 * —que mandan sobre todo el tablero— van a la derecha del título.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { TableroFinancieroPanel } from '@/components/finanzas/TableroFinanciero';

export default function TableroFinancieroPage() {
  return (
    <PageGuard module="dashboard" action="view">
      <div className="p-6 lg:p-8">
        <TableroFinancieroPanel />
      </div>
    </PageGuard>
  );
}
