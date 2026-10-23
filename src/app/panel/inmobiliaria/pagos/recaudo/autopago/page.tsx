'use client';

/**
 * Autopago (26-09-2026) — quién cobra su cuota solo, con qué tope y cómo le
 * fue. Sólo lectura: lo maneja el inquilino desde su portal.
 *
 * Vive colgado de Recaudo, como Estudios y Aseguradoras: es otra forma en que
 * ENTRA la plata de los inquilinos.
 *
 * Permiso: `cobros`/view, el mismo del resto de `/inmobiliaria/*` de cobros
 * (`GET /inmobiliaria/autopago`, `payu-api-front.md`).
 */

import Link from 'next/link';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { Button } from '@/components/ui';
import { PageGuard } from '@/components/auth/PageGuard';
import { AutopagosDeLaInmobiliaria } from '@/components/inmobiliaria/pagos/autopago/AutopagosDeLaInmobiliaria';

export default function AutopagoPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Pagos · inquilinos"
          titulo="Autopago"
          descripcion="Los inquilinos que inscribieron el cobro automático de su cuota, con su tope y cómo salió el último intento. Lo inscribe, pausa o cancela el inquilino desde su portal."
          acciones={
            <Button asChild variant="outline" size="sm" hideArrow>
              <Link href="/panel/inmobiliaria/pagos/recaudo">Volver a Recaudo</Link>
            </Button>
          }
        />
        <AutopagosDeLaInmobiliaria />
      </div>
    </PageGuard>
  );
}
