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
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { RecaudoBancarioPanel } from '@/components/tesoreria/RecaudoBancario';

export default function RecaudoBancarioPage() {
  return (
    // COBRANZA-MANUAL: el auxiliar de cartera no entra a los bancos.
    <PageGuard module="cobros" action="view" roles={[...ROLES_QUE_VEN_LOS_BANCOS]}>
      <div className="space-y-6 p-6 lg:p-8">
        {/* 🔴 La explicación va detrás de un botón que abre su cajón, no puesta
            sobre la pantalla: empuja hacia abajo lo que la persona vino a hacer.
            GLOW UP (20-10): el encabezado común; los pasos van debajo. */}
        <EncabezadoDePantalla
          seccion="Tesorería"
          titulo="Recaudo por convenio con el banco"
          descripcion="Sube el archivo de recaudo del banco: lo que se identifica sin dudas se concilia solo, con su recibo, y ves por qué no se concilió lo demás."
          ayuda={
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
                      Ese archivo se importa aquí y cada línea se cruza de la regla más estricta a la más
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
          }
        />
        <RecaudoBancarioPanel />
      </div>
    </PageGuard>
  );
}
