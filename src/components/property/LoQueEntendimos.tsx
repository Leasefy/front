'use client';

/**
 * LoQueEntendimos — las condiciones que el buscador sacó del texto libre.
 *
 * Sin esto, escribir «un apartamento en medellín de 70 m2» devolvía una lista
 * y no había forma de saber si el metraje se había tenido en cuenta o se había
 * ignorado. Un buscador que entiende y no lo dice se lee igual que uno que no
 * entiende.
 *
 * Las etiquetas vienen del back (`meta.interpretacion`) ya en español y
 * legibles; acá no se traduce ni se reordena, sólo se pinta.
 */

import { Sparkle } from '@phosphor-icons/react';

export interface LoQueEntendimosProps {
  interpretacion?: Record<string, string>;
  className?: string;
}

/** Pares en orden estable, para que no bailen entre búsquedas. */
export function paresLegibles(
  interpretacion: Record<string, string> | undefined,
): Array<[string, string]> {
  if (!interpretacion) return [];
  const orden = [
    'negocio',
    'tipo',
    'ciudad',
    'barrio',
    'habitaciones',
    'baños',
    'parqueaderos',
    'área',
    'estrato',
    'piso',
    'precio',
    'amenidades',
  ];
  return Object.entries(interpretacion)
    .filter(([, valor]) => Boolean(valor))
    .sort(([a], [b]) => {
      const ia = orden.indexOf(a);
      const ib = orden.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
}

export function LoQueEntendimos({ interpretacion, className }: LoQueEntendimosProps) {
  const pares = paresLegibles(interpretacion);
  if (pares.length === 0) return null;

  return (
    <div
      className={className}
      data-testid="lo-que-entendimos"
      aria-label="Condiciones que entendimos de tu búsqueda"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Sparkle className="h-3.5 w-3.5 shrink-0 text-primary" weight="fill" aria-hidden />
        <span className="text-caption text-fg-muted">Entendimos:</span>
        {pares.map(([clave, valor]) => (
          <span
            key={clave}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-caption"
          >
            <span className="text-fg-subtle">{clave}</span>
            <span className="font-medium text-fg">{valor}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
