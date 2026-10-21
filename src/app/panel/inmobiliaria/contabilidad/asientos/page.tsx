'use client';

import Link from 'next/link';
import { ArrowLeft, Plus } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { LibroDeAsientos } from '@/components/contabilidad/asientos/LibroDeAsientos';
import { ROLES_DE_LA_CONTABILIDAD } from '@/lib/auth/roles-de-la-contabilidad';

export default function AsientosPage() {
  return (
    <PageGuard module="reportes" roles={ROLES_DE_LA_CONTABILIDAD} seccion="Contabilidad">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Link
          href="/panel/inmobiliaria/contabilidad"
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Contabilidad
        </Link>
        {/* El encabezado lo pinta el libro: la acción principal («Asiento manual») abre su cajón. */}
        <LibroDeAsientos
          encabezado={(abrirAsientoManual) => (
            <EncabezadoDePantalla
              seccion="Finanzas"
              titulo="Asientos"
              descripcion="Encuentra un asiento, ábrelo con sus líneas y, si está mal, revérsalo. Un período cerrado ya no admite fechas adentro."
              accionPrincipal={
                <Button hideArrow onClick={abrirAsientoManual} data-testid="abrir-asiento-manual">
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
