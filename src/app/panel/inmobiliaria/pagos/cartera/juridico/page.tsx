'use client';

/**
 * 🔴 Cobro jurídico (17-09-2026): abogados, lo pactado, los sugeridos (90 días
 * sin póliza), los casos en jurídico y la cuenta por pagar a los abogados.
 *
 * Vive dentro de Cartera porque es el final del camino de la cartera, y con su
 * mismo permiso: `cobros`/view para ver, `cobros`/edit para mover.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { BackButton } from '@/components/ui/back-button';
import { CobroJuridico } from '@/components/cartera/CobroJuridico';

export default function CobroJuridicoPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        {/* La vuelta va arriba, como en toda sub-pantalla (antes era un enlace
            al final de la descripción, fácil de no ver). */}
        <div className="space-y-3">
          <BackButton href="/panel/inmobiliaria/pagos/cartera" label="Volver a Cartera" />
          <EncabezadoDePantalla
            seccion="Pagos · inquilinos"
            titulo="Cobro jurídico"
            descripcion="Lo que ya no se cobra con una llamada. El sistema sugiere desde el día 90 de mora sin póliza; pasar el caso lo decide una persona y queda visible en el contrato y en la cartera."
          />
        </div>
        <CobroJuridico />
      </div>
    </PageGuard>
  );
}
