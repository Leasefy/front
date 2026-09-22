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
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { CuadreDeTercerosPanel } from '@/components/finanzas/CuadreDeTerceros';

export default function CuadreDeTercerosPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        {/* La explicación va detrás de un botón, no puesta sobre la pantalla:
            acá arriba lo que hace falta saber es qué se está mirando. */}
        <header className="space-y-1.5">
          <SectionLabel>Finanzas</SectionLabel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-h2 text-fg">Cuadre de la plata de terceros</h1>
            <ParaEntenderMas
              etiqueta="Qué se está cuadrando, y contra qué"
              descripcion="La identidad que tiene que dar cero todos los días, término por término."
            >
              <div className="space-y-3 text-sm text-fg-muted">
                <p>
                  En la cuenta de recaudo <strong className="text-fg">casi nada es tuyo</strong>:
                  es de propietarios que todavía no cobraron, de inquilinos que adelantaron, de
                  garantías de servicios, y de plata que llegó sin nombre.
                </p>
                <p>
                  El cuadre compara <strong className="text-fg">lo que el banco dice que
                  hay</strong> contra <strong className="text-fg">la suma de lo que no es
                  tuyo</strong>. Los cuatro términos salen de fuentes distintas, así que si uno
                  está mal, la diferencia lo delata.
                </p>
                <p>
                  Lo que sobre suele ser tu comisión sin trasladar; lo que falte es plata que
                  salió y no debía. Cualquiera de las dos, con nombre.
                </p>
                <p>
                  Se mira <strong className="text-fg">todos los días</strong>: un descuadre que
                  nadie ve se vuelve imposible de explicar en un mes.
                </p>
              </div>
            </ParaEntenderMas>
          </div>
          <p className="max-w-2xl text-sm text-fg-muted">
            Lo que el banco tiene, contra la plata que no es tuya. Tiene que dar cero.
          </p>
        </header>
        <CuadreDeTercerosPanel />
      </div>
    </PageGuard>
  );
}
