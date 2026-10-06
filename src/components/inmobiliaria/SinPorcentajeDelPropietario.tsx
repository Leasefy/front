'use client';

/**
 * 🔴 «Falta el porcentaje» en la lista y la ficha del propietario (Nico,
 * 04-10-2026: copropiedad migrada sin % → «vacío y giro bloqueado»).
 *
 * Una marca por propietario: cuántos de sus inmuebles en copropiedad no tienen
 * el porcentaje de cada dueño y, con uno solo, el enlace a su ficha para
 * ponerlo. No renderiza nada si no le falta a ninguno.
 */

import Link from 'next/link';
import { Warning } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import {
  FALTA_EL_PORCENTAJE,
  rutaParaPonerElPorcentaje,
  type InmuebleSinPorcentaje,
} from '@/lib/inmuebles/participaciones-desconocidas';

export function SinPorcentajeDelPropietario({
  inmuebles,
  className,
}: {
  inmuebles: readonly InmuebleSinPorcentaje[] | null | undefined;
  className?: string;
}) {
  const lista = inmuebles ?? [];
  if (lista.length === 0) return null;
  const texto =
    lista.length === 1
      ? `Falta el porcentaje de los dueños de ${lista[0].propertyTitle}: no se gira`
      : `Falta el porcentaje de los dueños de ${lista.length} inmuebles: no se giran`;
  return (
    <span
      className={className ?? 'inline-flex flex-wrap items-center gap-2'}
      data-testid="sin-porcentaje-del-propietario"
      title={FALTA_EL_PORCENTAJE}
    >
      <Badge variant="warning" className="gap-1">
        <Warning className="h-3.5 w-3.5" aria-hidden="true" />
        {texto}
      </Badge>
      {lista.length === 1 ? (
        <Link
          href={rutaParaPonerElPorcentaje(lista[0].consignacionId)}
          onClick={(e) => e.stopPropagation()}
          className="text-caption font-medium text-primary underline-offset-4 hover:underline"
        >
          Poner los porcentajes
        </Link>
      ) : null}
    </span>
  );
}
