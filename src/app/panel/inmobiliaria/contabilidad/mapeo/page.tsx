'use client';

/**
 * Mapeo contable — `/panel/inmobiliaria/contabilidad/mapeo`.
 *
 * `?parte=rubros` abre la pestaña de rubros del P&G. Lo usa la alerta de la
 * portada («N rubros del P&G sin cuenta del PUC»): mandar a «Mapeo» a secas
 * obligaría a buscar la pestaña a mano después de haber hecho clic en una alerta
 * que ya decía exactamente qué faltaba.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { MapeoContable, parteDe } from '@/components/contabilidad/mapeo/MapeoContable';

export default function MapeoContablePage() {
  const parte = parteDe(useSearchParams().get('parte'));

  return (
    <PageGuard module="reportes" action="view">
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
          <h1 className="text-h2 text-fg">Mapeo contable</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            A qué cuenta del PUC va cada movimiento que el sistema asienta solo —los recibos de caja
            cuando entran, los giros a propietarios cuando el banco paga el lote, y las líneas de una
            factura de proveedor cuando se causa—. Sin una cuenta en un evento, ese asiento no se
            genera. En «Rubros del P&G» se dice, además, qué cuentas se leen para comparar el libro
            contra el presupuesto.
          </p>
        </header>
        {/* `key`: si se llega de nuevo a esta ruta con otra `parte`, Next no
            remonta la página y la pestaña se quedaría en la anterior. */}
        <MapeoContable key={parte} inicial={parte} />
      </div>
    </PageGuard>
  );
}
