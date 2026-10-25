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
      {/* Glow up 22-10: un renglón que se parte (el chip no se partía y a 390 se salía del borde).
          Frena el giro: va en tinta de aviso, no en gris. */}
      <span className="inline-flex min-w-0 items-baseline gap-1.5 text-caption text-warning-ink">
        <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-warning-500" aria-hidden="true" />
        <span className="min-w-0">{texto}</span>
      </span>
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
