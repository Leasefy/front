'use client';

import { Warning } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { textoDeDatosPorCompletar } from '@/lib/propietarios/datos-por-completar';

/**
 * La marca de una ficha incompleta (T-0128): «Datos por completar: documento,
 * tipo de documento». No renderiza nada si no falta nada, así que se puede
 * poner sin condicional en cualquier lista.
 *
 * `onCompletar` es el camino a la edición normal de la ficha: completar un
 * dato NO tiene pantalla propia, es el mismo formulario de siempre.
 */
export function DatosPorCompletar({
  pendientes,
  onCompletar,
  className,
}: {
  pendientes: readonly string[] | null | undefined;
  /** Abre la edición normal. Ausente = sólo informa (el inquilino no tiene edición). */
  onCompletar?: () => void;
  className?: string;
}) {
  const texto = textoDeDatosPorCompletar(pendientes);
  if (!texto) return null;
  return (
    <span className={className ?? 'inline-flex flex-wrap items-center gap-2'} data-testid="datos-por-completar">
      <Badge variant="warning" className="gap-1">
        <Warning className="h-3.5 w-3.5" aria-hidden="true" />
        {texto}
      </Badge>
      {onCompletar ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCompletar();
          }}
          className="text-caption text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Completar
        </button>
      ) : null}
    </span>
  );
}
