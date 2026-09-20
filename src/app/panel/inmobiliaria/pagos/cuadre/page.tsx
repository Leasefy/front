'use client';

/**
 * Cuadre diario de la plata de terceros — `/panel/inmobiliaria/pagos/cuadre`.
 *
 * Permiso `dispersiones:view`, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/cuadre` (contrato del 17-09, §10). Es plata de
 * propietarios e inquilinos: el asesor comercial no la ve.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { CuadreDeTercerosPanel } from '@/components/finanzas/CuadreDeTerceros';

export default function CuadreDeTercerosPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Finanzas</SectionLabel>
          <h1 className="text-h2 text-fg">Cuadre de la plata de terceros</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            En la cuenta de recaudo casi nada es tuyo: es de propietarios que todavía no cobraron,
            de inquilinos que adelantaron, y de plata que llegó sin nombre. Esto se mira todos los
            días — un descuadre que nadie ve se vuelve imposible de explicar en un mes.
          </p>
        </header>
        <CuadreDeTercerosPanel />
      </div>
    </PageGuard>
  );
}
