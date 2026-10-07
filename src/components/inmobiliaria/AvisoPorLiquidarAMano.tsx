'use client';

/**
 * 🔴 N-19 (QA-PAGOS, 05-10-2026; Nico, con la recomendada): «por liquidar a mano».
 *
 * Un inmueble con varios dueños cuya cuota lleva IVA o retenciones liquidados
 * para UN solo perfil tributario no se reparte: antes hacía que la vista previa
 * y «Generar» respondieran 400 para toda la inmobiliaria, aunque se destildara.
 * Ahora la corrida sigue sin él y el back lo manda aparte (`porLiquidarAMano`)
 * con el inmueble y el motivo en palabras. Esto lo dice en voz alta. Sin
 * cuotas apartadas, nada.
 */

import { Warning } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import type { CuotaPorLiquidarAMano } from '@/lib/types/inmobiliaria';

export function AvisoPorLiquidarAMano({
  cuotas,
}: {
  cuotas: readonly CuotaPorLiquidarAMano[] | undefined;
}) {
  const lista = cuotas ?? [];
  return (
    <Presence show={lista.length > 0} initial={false}>
      <div
        className="rounded-lg border border-border bg-warning-soft p-4 text-sm text-fg"
        data-testid="aviso-por-liquidar-a-mano"
        role="status"
      >
        <p className="flex items-center gap-2 font-medium text-warning">
          <Warning className="h-4 w-4 shrink-0" aria-hidden="true" />
          {lista.length === 1
            ? '1 inmueble queda por liquidar a mano: no entra en esta corrida'
            : `${lista.length} inmuebles quedan por liquidar a mano: no entran en esta corrida`}
        </p>
        <p className="mt-1 text-fg-muted">
          Tienen varios dueños y la cuota lleva IVA o retenciones liquidados para un solo perfil
          tributario. Leasefy no los reparte a ciegas ni gira nada de ellos; el resto de la
          corrida sale normal.
        </p>
        <ul className="mt-2 space-y-1">
          {lista.map((c) => (
            <li key={c.cuotaId} data-testid="cuota-por-liquidar-a-mano">
              <span className="font-medium">{c.propertyTitle}</span>
              <span className="text-fg-muted"> · {c.motivo}</span>
            </li>
          ))}
        </ul>
      </div>
    </Presence>
  );
}
