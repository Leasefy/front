'use client';

/**
 * La explicación de un evento del mapeo, en UNA línea y con forma de leerla
 * entera (QA de Contabilidad, CB-05, 03-10-2026).
 *
 * La regla de Nico (2026-09-03) sigue: nueve filas de tres renglones eran media
 * pantalla de párrafos, así que la explicación va en una línea. Pero cortada
 * con «…» y el texto completo sólo en un `title` no se podía leer (ni con el
 * teclado ni en un teléfono). Ahora la línea es un botón: «Leer completo»
 * la abre en su lugar y «Ver menos» la vuelve a cerrar, con el fundido del
 * sistema de movimiento.
 */

import { useId, useState } from 'react';
import { CrossFade } from '@leasefy/cadence';
import { conLaPlataPegada } from '@/lib/plata/plata-pegada';

export function ExplicacionDelEvento({ texto, testId }: { texto: string; testId?: string }) {
  const [abierta, setAbierta] = useState(false);
  const id = useId();
  if (!texto) return null;
  return (
    <div className="text-caption text-fg-muted" data-testid={testId}>
      <CrossFade swapKey={abierta ? 'abierta' : 'cerrada'} mode="popLayout">
        {abierta ? (
          <p id={id} className="whitespace-normal leading-relaxed">
            {conLaPlataPegada(texto)}{' '}
            <button
              type="button"
              onClick={() => setAbierta(false)}
              aria-expanded
              aria-controls={id}
              className="font-medium text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Ver menos
            </button>
          </p>
        ) : (
          <p id={id} className="flex min-w-0 items-baseline gap-1.5">
            <span className="min-w-0 truncate">{conLaPlataPegada(texto)}</span>
            <button
              type="button"
              onClick={() => setAbierta(true)}
              aria-expanded={false}
              aria-controls={id}
              aria-label={`Leer completo: ${texto}`}
              className="shrink-0 font-medium text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Leer completo
            </button>
          </p>
        )}
      </CrossFade>
    </div>
  );
}
