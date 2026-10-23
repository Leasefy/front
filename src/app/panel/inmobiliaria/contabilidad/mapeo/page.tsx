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

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { MapeoContable, parteDe } from '@/components/contabilidad/mapeo/MapeoContable';

export default function MapeoContablePage() {
  const parte = parteDe(useSearchParams().get('parte'));

  return (
    <PageGuard module="reportes" roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]} seccion="Contabilidad" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/contabilidad"
            className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg"
          >
            Contabilidad
          </Link>
          <EncabezadoDePantalla
            seccion="Contabilidad"
            titulo="Mapeo contable"
            descripcion="A qué cuenta del PUC va cada movimiento que el sistema asienta solo —los recibos de caja cuando entran, los giros a propietarios cuando el banco paga el lote, y las líneas de una factura de proveedor cuando se causa—."
            ayuda={
              <ParaEntenderMas etiqueta="Para entender más" variante="secundario">
                <p className="text-body-sm text-fg-muted">Sin una cuenta en un evento, ese asiento no se genera. En «Rubros del P&G» se dice, además, qué cuentas se leen para comparar el libro contra el presupuesto.</p>
              </ParaEntenderMas>
            }
          />
        </div>
        {/* `key`: si se llega de nuevo a esta ruta con otra `parte`, Next no
            remonta la página y la pestaña se quedaría en la anterior. */}
        <MapeoContable key={parte} inicial={parte} />
      </div>
    </PageGuard>
  );
}
