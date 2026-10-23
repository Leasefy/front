'use client';

import Link from 'next/link';
import { Plus } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { LibroDeAsientos } from '@/components/contabilidad/asientos/LibroDeAsientos';
import { ROLES_DE_LA_CONTABILIDAD } from '@/lib/auth/roles-de-la-contabilidad';

export default function AsientosPage() {
  return (
    <PageGuard module="reportes" roles={ROLES_DE_LA_CONTABILIDAD} seccion="Contabilidad">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Link
          href="/panel/inmobiliaria/contabilidad"
          className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg"
        >
          Contabilidad
        </Link>
        {/* El encabezado lo pinta el libro: la acción principal («Asiento manual») abre su cajón. */}
        <LibroDeAsientos
          encabezado={(abrirAsientoManual) => (
            <EncabezadoDePantalla
              seccion="Contabilidad"
              titulo="Asientos"
              descripcion="Encuentra un asiento, ábrelo con sus líneas y, si está mal, revérsalo."
              ayuda={
                <ParaEntenderMas etiqueta="Para entender más" variante="secundario">
                  <div className="space-y-2 text-body-sm text-fg-muted">
                    <p>Un asiento nunca se edita ni se borra: se reversa, y el libro guarda las dos cosas.</p>
                    <p>Un período cerrado ya no admite asientos con fecha adentro. El cierre se consulta al pie del libro.</p>
                  </div>
                </ParaEntenderMas>
              }
              accionPrincipal={
                <Button size="sm" hideArrow onClick={abrirAsientoManual} data-testid="abrir-asiento-manual">
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Asiento manual
                </Button>
              }
            />
          )}
        />
      </div>
    </PageGuard>
  );
}
