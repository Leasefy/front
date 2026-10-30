'use client';

/**
 * La cabecera de una columna que ordena la tabla (Nico, 28-10-2026: «que todas las tablas tengan lo de ordenamiento
 * general y por columnas»). La pieza común: antes cada tabla armaba su botón a mano (InquilinosTable, PropietarioTable,
 * CarteraTable…). Un toque ordena por esa columna; otro, al revés. `aria-sort` le dice al lector de pantalla cómo va.
 * Se usa con `useOrdenDeLaTabla` (lib/hooks/use-orden-de-la-tabla.ts).
 */

import { CaretUpDown, SortAscending, SortDescending } from '@phosphor-icons/react';

import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { OrdenDeLaTabla } from '@/lib/hooks/use-orden-de-la-tabla';

export function EncabezadoOrdenable<C extends string>({
  campo,
  orden,
  onOrdenar,
  children,
  className,
  alineacion = 'izquierda',
}: {
  campo: C;
  orden: OrdenDeLaTabla<C> | null;
  onOrdenar: (campo: C) => void;
  children: React.ReactNode;
  className?: string;
  alineacion?: 'izquierda' | 'derecha';
}) {
  const activa = orden?.campo === campo;
  const Icono = !activa ? CaretUpDown : orden.sentido === 'asc' ? SortAscending : SortDescending;
  return (
    <TableHead
      className={className}
      aria-sort={activa ? (orden.sentido === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onOrdenar(campo)}
        className={cn(
          'inline-flex items-center gap-1.5 font-[inherit] text-[inherit] uppercase hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          alineacion === 'derecha' && 'ml-auto flex-row-reverse',
        )}
        data-testid={`ordenar-${campo}`}
      >
        {children}
        <Icono className={cn('h-3.5 w-3.5 shrink-0', !activa && 'opacity-40')} aria-hidden="true" />
      </button>
    </TableHead>
  );
}
