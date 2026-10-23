'use client';

/**
 * Tasas de usura — `/panel/inmobiliaria/pagos/cartera/usura`.
 *
 * Vive bajo Cartera porque es el techo del interés que la cartera genera, y se
 * entra desde Reglas de mora, que es donde se decide cuánto se cobra.
 *
 * Permiso: `cobros`/view, el mismo con el que el back protege
 * `GET /inmobiliaria/finanzas/usura` (contrato del 17-09).
 */

import Link from 'next/link';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PageGuard } from '@/components/auth/PageGuard';
import { TasasDeUsuraPanel } from '@/components/finanzas/TasasDeUsura';

export default function UsuraPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/pagos/cartera/reglas-de-mora"
            className="inline-flex items-center gap-1.5 text-body-sm text-fg-muted transition-colors hover:text-fg"
          >
            Reglas de mora
          </Link>
          <EncabezadoDePantalla
            seccion="Pagos · inquilinos"
            titulo="Tasa de usura"
            descripcion="El techo legal del interés de mora, mes a mes: un mes sin tasa cargada es un mes sin techo."
            ayuda={
              <ParaEntenderMas etiqueta="De dónde sale" titulo="De dónde sale la tasa de usura" variante="secundario">
                <p className="text-body-sm text-fg-muted">
                  El art. 884 del Código de Comercio amarra el interés de mora a lo que certifica la
                  Superfinanciera. Un mes sin tasa cargada es un mes en el que el interés se liquida
                  sin techo.
                </p>
              </ParaEntenderMas>
            }
          />
        </div>
        <TasasDeUsuraPanel />
      </div>
    </PageGuard>
  );
}
