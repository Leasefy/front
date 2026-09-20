'use client';

/**
 * Reglas de mora — cómo cobra la inmobiliaria cuando un canon se atrasa.
 *
 * Se entra desde el encabezado de Cobros. Permiso: `cobros`/view, el mismo
 * con el que el back protege el listado; crear y editar piden los suyos y la
 * pantalla los respeta.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';
import { PageGuard } from '@/components/auth/PageGuard';
import { SectionLabel } from '@/components/ui/section-label';
import { ReglasDeMora } from '@/components/cobros/reglas-de-mora/ReglasDeMora';
import { destinoDeVolver } from './volver';

const VOLVER_A_COBROS = destinoDeVolver(null);

function EnlaceDeVolver({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
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
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          {/* La vuelta va ARRIBA A LA IZQUIERDA, como el «Volver al portafolio»
              del importador: es de dónde viene la persona, no una acción de la
              pantalla. A la derecha parecía el botón principal (Nico, 2026-09-01). */}
          <Suspense fallback={<EnlaceDeVolver {...VOLVER_A_COBROS} />}>
            <VolverDesde />
          </Suspense>
          <SectionLabel>Pagos · inquilinos</SectionLabel>
          <h1 className="text-h2 text-fg">Reglas de mora</h1>
          <p className="max-w-2xl text-sm text-fg-muted line-clamp-2">
            Se aplican en orden, de arriba abajo, sobre cada cobro vencido: primero corre el interés
            pasados los días de plazo y después, si la regla existe, el gasto administrativo. Lo que
            cada una agrega queda como línea propia en el estado de cuenta del inquilino.
          </p>
          {/* 🔴 El techo (17-09). El interés que se configura acá no puede pasar
              de la usura del mes en que corre (art. 884 del Código de Comercio),
              y esa serie se carga en su propia pantalla: sin ella el interés
              sale SIN topear. Por eso el enlace vive al lado de las reglas. */}
          <Link
            href="/panel/inmobiliaria/pagos/cartera/usura"
            className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            data-testid="ir-a-la-usura"
          >
            Ver la tasa de usura que las topea
          </Link>
        </header>

        <ReglasDeMora />
      </div>
    </PageGuard>
  );
}
