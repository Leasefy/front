'use client';

/**
 * Reglas de mora — cómo cobra la inmobiliaria cuando un canon se atrasa.
 *
 * Se entra desde el encabezado de Cobros. Permiso: `cobros`/view, el mismo
 * con el que el back protege el listado; crear y editar piden los suyos y la
 * pantalla los respeta.
 */

import { useTr } from '@/lib/i18n/use-tr';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PageGuard } from '@/components/auth/PageGuard';
import { ReglasDeMora } from '@/components/cobros/reglas-de-mora/ReglasDeMora';
import { destinoDeVolver } from './volver';

const VOLVER_A_COBROS = destinoDeVolver(null);

function EnlaceDeVolver({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
    >
      {label}
    </Link>
  );
}

/**
 * «Volver» devuelve a donde estaba la persona: desde la ficha de un contrato
 * se llega con `?volver=` y volvía siempre a Cobros (Nico, 2026-09-08: «yo
 * estaba era en contratos»). `useSearchParams` en Next 14 pide Suspense, por
 * eso vive aparte y el fallback es el enlace de siempre.
 */
function VolverDesde() {
  const params = useSearchParams();
  return <EnlaceDeVolver {...destinoDeVolver(params.get('volver'))} />;
}

export default function ReglasDeMoraPage() {
  // C1 (revisora r25): el sobretítulo es la cara del riel, «Cobrar a inquilinos».
  const tr = useTr();
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          {/* La vuelta va ARRIBA A LA IZQUIERDA: es de dónde viene la persona,
              no una acción de la pantalla (Nico, 2026-09-01). */}
          <Suspense fallback={<EnlaceDeVolver {...VOLVER_A_COBROS} />}>
            <VolverDesde />
          </Suspense>
          {/* 🔴 El techo (17-09): el interés no puede pasar de la usura del mes
              (art. 884 del Código de Comercio); por eso la usura va al lado. */}
          <EncabezadoDePantalla
            seccion={tr('Cobrar a inquilinos')}
            titulo="Reglas de mora"
            descripcion="Lo que se le suma a cada cobro vencido: primero el interés, pasados los días de plazo, y después el gasto administrativo."
            ayuda={
              <ParaEntenderMas etiqueta="Cómo se aplican" titulo="Cómo se aplican las reglas de mora" variante="secundario">
                <p className="text-body-sm text-fg-muted">
                  Se aplican en orden, de arriba abajo, sobre cada cobro vencido: primero corre el
                  interés pasados los días de plazo y después, si la regla existe, el gasto
                  administrativo. Lo que cada una agrega queda como línea propia en el estado de
                  cuenta del inquilino. El interés nunca pasa de la tasa de usura del mes.
                </p>
              </ParaEntenderMas>
            }
            acciones={
              <Link
                href="/panel/inmobiliaria/pagos/cartera/usura"
                className="inline-flex h-8 items-center text-body-sm font-medium text-primary underline-offset-4 hover:underline"
                data-testid="ir-a-la-usura"
              >
                Ver la tasa de usura que las topea
              </Link>
            }
          />
        </div>

        <ReglasDeMora />
      </div>
    </PageGuard>
  );
}
