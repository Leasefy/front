'use client';

/**
 * T-0129 — las dos piezas con que se muestra un inmueble sin canon:
 *
 *  - `CanonPorConfirmarBadge`: la marca. Lleva a la edición del inmueble, que
 *    es donde se pone el canon (poner uno real quita la marca).
 *  - `AvisoInmuebleSinCanon`: el mensaje cuando una acción choca con él (el 409
 *    `INMUEBLE_SIN_CANON`, o la acción apagada de antemano), con el enlace a
 *    editarlo si se conoce el inmueble.
 */
import Link from 'next/link';
import { Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  ETIQUETA_CANON_POR_CONFIRMAR,
  MENSAJE_INMUEBLE_SIN_CANON,
  inmuebleIdDelError,
  rutaParaPonerElCanon,
} from '@/lib/inmuebles/canon-por-confirmar';

export function CanonPorConfirmarBadge({
  inmuebleId,
  className,
}: {
  /** Con el id la marca es un enlace a editar el inmueble; sin él, sólo una etiqueta. */
  inmuebleId?: string | null;
  className?: string;
}) {
  const estilo = cn(
    'inline-flex items-center gap-1 rounded-sm bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning',
    className,
  );
  if (!inmuebleId) {
    return (
      <span className={estilo} data-testid="canon-por-confirmar">
        <Warning className="h-3 w-3" aria-hidden="true" />
        {ETIQUETA_CANON_POR_CONFIRMAR}
      </span>
    );
  }
  return (
    <Link
      href={rutaParaPonerElCanon(inmuebleId)}
      className={cn(estilo, 'hover:underline')}
      data-testid="canon-por-confirmar"
      onClick={(e) => e.stopPropagation()}
    >
      <Warning className="h-3 w-3" aria-hidden="true" />
      {ETIQUETA_CANON_POR_CONFIRMAR}
    </Link>
  );
}

export function AvisoInmuebleSinCanon({
  inmuebleId,
  error,
  className,
}: {
  /** El inmueble, si ya se sabe de antemano (acción apagada). */
  inmuebleId?: string | null;
  /** O el error 409 que lo trae en `details.inmuebleId`. */
  error?: unknown;
  className?: string;
}) {
  const id = inmuebleId ?? (error ? inmuebleIdDelError(error) : null);
  return (
    <p
      className={cn('text-sm text-warning', className)}
      role="status"
      data-testid="aviso-inmueble-sin-canon"
    >
      {MENSAJE_INMUEBLE_SIN_CANON}
      {id ? (
        <>
          {' '}
          <Link href={rutaParaPonerElCanon(id)} className="font-medium underline">
            Ponerle el canon
          </Link>
        </>
      ) : null}
    </p>
  );
}
