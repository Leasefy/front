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
import { SectionLabel } from '@/components/ui/section-label';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { RecaudoBancarioPanel } from '@/components/tesoreria/RecaudoBancario';

export default function RecaudoBancarioPage() {
  return (
    <PageGuard module="cobros" action="view">
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
              descripcion="Qué hace el banco, qué hace Leasefy y qué aprueba una persona."
            >
              <div className="space-y-3 text-sm text-fg-muted">
                <p>
                  Cada contrato paga con su <strong className="text-fg">referencia única</strong>,
                  la que se imprime en su recibo. El inquilino paga en el banco o por su
                  canal, y el banco te manda un archivo con todo lo que recaudó.
                </p>
                <p>
                  Ese archivo se importa acá. Lo que calza exacto entra al{' '}
                  <strong className="text-fg">mismo lote</strong> que ya apruebas en
                  Conciliación, y lo que no calza cae en la cola manual de siempre.
                </p>
                <p>
                  <strong className="text-fg">Nada se aplica sin que una persona lo
                  apruebe.</strong> Esta pantalla no emite un solo recibo de caja: los emite
                  quien aprueba el lote.
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
            El archivo del banco entra acá y se aplica en un lote que una persona aprueba.
          </p>
        </header>
        <RecaudoBancarioPanel />
      </div>
    </PageGuard>
  );
}
