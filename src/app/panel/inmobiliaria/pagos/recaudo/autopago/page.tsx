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

import { useTr } from '@/lib/i18n/use-tr';
import Link from 'next/link';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { PageGuard } from '@/components/auth/PageGuard';
import { AutopagosDeLaInmobiliaria } from '@/components/inmobiliaria/pagos/autopago/AutopagosDeLaInmobiliaria';

export default function AutopagoPage() {
  // C1 (revisora r25): el sobretítulo es la cara del riel, «Cobrar a inquilinos».
  const tr = useTr();
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        {/* Ronda 26 (revisora r25, Autopago): la vuelta ARRIBA a la izquierda, como en las demás
            sub-pantallas (navegar no es una acción); la descripción en una línea (lo de que lo inscribe
            el inquilino desde su portal ya lo dice el vacío). */}
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/pagos/recaudo"
            className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
            data-testid="volver-a-recaudo"
          >
            Volver a Recaudo
          </Link>
          <EncabezadoDePantalla
            seccion={tr('Cobrar a inquilinos')}
            titulo="Autopago"
            descripcion="Los inquilinos con cobro automático, su tope y el último intento."
          />
        </div>
        <AutopagosDeLaInmobiliaria />
      </div>
    </PageGuard>
  );
}
