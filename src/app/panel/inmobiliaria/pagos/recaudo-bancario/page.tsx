'use client';

/**
 * Recaudo por convenio con el banco — `/panel/inmobiliaria/pagos/recaudo-bancario`.
 *
 * Permiso `cobros:view`, el mismo con el que el back protege
 * `/inmobiliaria/tesoreria/convenios` y el mismo de la conciliación bancaria:
 * importar el archivo del banco termina en recibos de caja, y quien puede lo uno
 * puede lo otro. El asesor comercial no ve operación.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { ROLES_QUE_VEN_LOS_BANCOS } from '@/lib/nav/el-auxiliar-de-cartera-no-ve-los-bancos';
import { SectionLabel } from '@/components/ui/section-label';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { RecaudoBancarioPanel } from '@/components/tesoreria/RecaudoBancario';

export default function RecaudoBancarioPage() {
  return (
    // COBRANZA-MANUAL: el auxiliar de cartera no entra a los bancos.
    <PageGuard module="cobros" action="view" roles={[...ROLES_QUE_VEN_LOS_BANCOS]}>
      <div className="space-y-6 p-6 lg:p-8">
        {/* 🔴 La explicación va detrás de un botón que abre un modal, no puesta
            sobre la pantalla: sobre la pantalla empuja hacia abajo lo que la
            persona vino a hacer. Queda UNA línea honesta arriba. */}
        <header className="space-y-1.5">
          <SectionLabel>Tesorería</SectionLabel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-h2 text-fg">Recaudo por convenio con el banco</h1>
            <ParaEntenderMas
              etiqueta="Cómo funciona el recaudo por convenio"
              descripcion="Qué hace el banco, qué hace Leasefy solo y qué decide una persona."
            >
              <div className="space-y-3 text-sm text-fg-muted">
                <p>
                  El inquilino paga en el banco con la <strong className="text-fg">referencia de su
                  contrato o con su cédula</strong>, y el banco te manda cada día un archivo con todo
                  lo que recaudó.
                </p>
                <p>
                  Ese archivo se importa acá y cada línea se cruza de la regla más estricta a la más
                  laxa: primero la referencia del contrato, después la cédula de un inquilino con un
                  solo contrato con deuda. Nunca por el nombre.
                </p>
                <p>
                  <strong className="text-fg">Lo que cruza sin dudas y con el valor exacto de una
                  cuota se concilia solo</strong> y sale su recibo de caja. Lo demás queda «Por
                  conciliar» con su razón y una persona lo concilia con un toque. Lo de antes de
                  facturar en Leasefy se omite.
                </p>
                <p>
                  Lo que necesitas para empezar es el{' '}
                  <strong className="text-fg">diseño de registro</strong> del convenio: el
                  papel donde el banco dice en qué posición del archivo va cada dato. Ningún
                  banco manda el mismo.
                </p>
              </div>
            </ParaEntenderMas>
          </div>
          <p className="max-w-2xl text-sm text-fg-muted">
            Sube el archivo de recaudo del banco: lo que se identifica sin dudas se concilia solo, con su recibo, y
            ves por qué no se concilió lo demás.
          </p>
        </header>
        <RecaudoBancarioPanel />
      </div>
    </PageGuard>
  );
}
