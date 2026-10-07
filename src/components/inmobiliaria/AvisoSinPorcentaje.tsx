'use client';

/**
 * 🔴 «Falta el porcentaje de cada propietario» (Nico, 04-10-2026: copropiedad
 * migrada sin % → «vacío y giro bloqueado»).
 *
 * Lo pintan Liquidaciones y «Generar dispersión» cuando el back dice que un
 * inmueble no se gira por eso (`sinPorcentaje`): qué inmueble, cuánto queda
 * sin girar y el enlace a su ficha para ponerlo. Sin inmuebles, nada.
 */

import Link from 'next/link';
import { Warning } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import {
  FALTA_EL_PORCENTAJE,
  rutaParaPonerElPorcentaje,
  type InmuebleSinPorcentaje,
} from '@/lib/inmuebles/participaciones-desconocidas';
import { formatCurrency } from '@/lib/types/inmobiliaria';

export function AvisoSinPorcentaje({
  inmuebles,
}: {
  inmuebles: readonly InmuebleSinPorcentaje[] | undefined;
}) {
  const lista = inmuebles ?? [];
  return (
    <Presence show={lista.length > 0} initial={false}>
      <div
        className="rounded-lg border border-border bg-warning-soft p-4 text-sm text-fg"
        data-testid="aviso-sin-porcentaje"
        role="status"
      >
        <p className="flex items-center gap-2 font-medium text-warning">
          <Warning className="h-4 w-4 shrink-0" aria-hidden="true" />
          {lista.length === 1
            ? `1 inmueble no se gira: ${FALTA_EL_PORCENTAJE.toLowerCase()}`
            : `${lista.length} inmuebles no se giran: ${FALTA_EL_PORCENTAJE.toLowerCase()}`}
        </p>
        <p className="mt-1 text-fg-muted">
          Vinieron de la migración con varios dueños y el archivo no dice cuánto es de cada uno. No
          se reparte en partes iguales a ciegas: pon el porcentaje en la ficha del inmueble (que
          sumen 100 %) y el giro sale en la siguiente liquidación.
        </p>
        <ul className="mt-2 space-y-1">
          {lista.map((inmueble) => (
            <li
              key={inmueble.consignacionId}
              className="flex flex-wrap items-baseline gap-x-2"
              data-testid="inmueble-sin-porcentaje"
            >
              <span className="font-medium">{inmueble.propertyTitle}</span>
              {inmueble.pendienteCop ? (
                <span className="font-mono tabular-nums text-fg-muted">
                  {formatCurrency(inmueble.pendienteCop)} sin girar
                </span>
              ) : null}
              <Link
                href={rutaParaPonerElPorcentaje(inmueble.consignacionId)}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Poner los porcentajes
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Presence>
  );
}
