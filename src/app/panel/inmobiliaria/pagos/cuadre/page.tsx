'use client';

/**
 * Cuadre diario de la plata de terceros — `/panel/inmobiliaria/pagos/cuadre`.
 *
 * Permiso `dispersiones:view`, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/cuadre` (contrato del 17-09, §10). Es plata de
 * propietarios e inquilinos: el asesor comercial no la ve.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { CuadreDeTercerosPanel } from '@/components/finanzas/CuadreDeTerceros';

export default function CuadreDeTercerosPage() {
  return (
    <PageGuard module="dispersiones" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        {/* Glow up (revisora r7 + patrón de la ronda 22): el encabezado común; el título es el del menú
            («Cuadre del día») y la sección, la cara del riel («Cuadrar la caja»), como Pendientes. La
            explicación va detrás del botón; ahí también queda en qué se diferencia de Traslados. */}
        {/* Revisora r24 (Cuadre #5): el día va en las acciones del encabezado, como el mes en Giros. */}
        <CuadreDeTercerosPanel
          encabezado={(campoDelDia) => (
            <EncabezadoDePantalla
              acciones={campoDelDia}
              seccion="Cuadrar la caja"
              titulo="Cuadre del día"
              descripcion="Lo que hay en el banco contra la plata que no es tuya: tiene que dar cero."
              ayuda={
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
                      <strong className="text-fg">El cuadre y los traslados no son lo mismo</strong>: el
                      cuadre mide si la plata de terceros está completa; en Traslados de comisión se
                      mueve lo tuyo a tu cuenta propia. Cuando aquí sobra justo tu comisión, el paso
                      siguiente es proponer ese traslado, y con él el cuadre vuelve a cero.
                    </p>
                    <p>
                      Se mira <strong className="text-fg">todos los días</strong>: un descuadre que
                      nadie ve se vuelve imposible de explicar en un mes.
                    </p>
                  </div>
                </ParaEntenderMas>
              }
            />
          )}
        />
      </div>
    </PageGuard>
  );
}
