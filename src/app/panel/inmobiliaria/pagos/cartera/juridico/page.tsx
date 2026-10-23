'use client';

/**
 * 🔴 Cobro jurídico (17-09-2026): abogados, lo pactado, los sugeridos (90 días
 * sin póliza), los casos en jurídico y la cuenta por pagar a los abogados.
 *
 * Vive dentro de Cartera porque es el final del camino de la cartera, y con su
 * mismo permiso: `cobros`/view para ver, `cobros`/edit para mover.
 */

import { useTr } from '@/lib/i18n/use-tr';
import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import Link from 'next/link';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { CobroJuridico } from '@/components/cartera/CobroJuridico';

export default function CobroJuridicoPage() {
  // C1 (revisora r25): el sobretítulo es la cara del riel, «Cobrar a inquilinos».
  const tr = useTr();
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        {/* La vuelta va arriba, como en toda sub-pantalla (antes era un enlace
            al final de la descripción, fácil de no ver). */}
        <div className="space-y-3">
          <Link href="/panel/inmobiliaria/pagos/cartera" className="inline-flex items-center text-body-sm text-fg-muted hover:text-fg">
            Cartera
          </Link>
          <EncabezadoDePantalla
            seccion={tr('Cobrar a inquilinos')}
            titulo="Cobro jurídico"
            descripcion="Lo que ya no se cobra con una llamada: pásalo a un abogado y lleva sus honorarios."
            ayuda={
              <ParaEntenderMas etiqueta="Para entender más" variante="secundario">
                <p className="text-body-sm text-fg-muted">
                  El sistema sugiere desde el día 90 de mora sin póliza; pasar el caso lo decide una
                  persona y queda visible en el contrato y en la cartera. Los honorarios son plata del
                  abogado: no son ingreso de la inmobiliaria ni del propietario.
                </p>
              </ParaEntenderMas>
            }
          />
        </div>
        <CobroJuridico />
      </div>
    </PageGuard>
  );
}
