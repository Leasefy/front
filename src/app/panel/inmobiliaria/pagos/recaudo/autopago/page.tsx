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

import { PageGuard } from '@/components/auth/PageGuard';
import { AutopagosDeLaInmobiliaria } from '@/components/inmobiliaria/pagos/autopago/AutopagosDeLaInmobiliaria';
import { SectionLabel } from '@/components/ui/section-label';

export default function AutopagoPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Pagos · inquilinos</SectionLabel>
          <h1 className="text-h2 text-fg">Autopago</h1>
          <p className="max-w-2xl text-sm text-fg-muted">
            Los inquilinos que inscribieron el cobro automático de su cuota, con el tope que pusieron y cómo salió el
            último intento. Acá sólo se mira: el autopago lo inscribe, lo pausa o lo cancela el inquilino desde su
            portal.{' '}
            <Link className="underline" href="/panel/inmobiliaria/pagos/recaudo">
              Volver a Recaudo
            </Link>
          </p>
        </header>
        <AutopagosDeLaInmobiliaria />
      </div>
    </PageGuard>
  );
}
