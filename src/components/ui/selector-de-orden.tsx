'use client';

/**
 * El orden GENERAL de una tabla, en la barra de arriba (Nico, 28-10-2026: «ordenamiento general y por columnas»): un
 * selector «Ordenar por» con las formas que tienen sentido para esa lista («Más recientes», «Nombre A–Z»…). Va con el
 * mismo `useOrdenDeLaTabla` que las cabeceras: elegir aquí marca la columna, y tocar una columna cambia lo de aquí.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import type { OrdenDeLaTabla, SentidoDelOrden } from '@/lib/hooks/use-orden-de-la-tabla';

export interface FormaDeOrdenar<C extends string> {
  campo: C;
  sentido: SentidoDelOrden;
  etiqueta: string;
}

export function SelectorDeOrden<C extends string>({
  formas,
  orden,
  onCambiar,
  className,
}: {
  formas: readonly FormaDeOrdenar<C>[];
  orden: OrdenDeLaTabla<C> | null;
  onCambiar: (orden: OrdenDeLaTabla<C>) => void;
  className?: string;
}) {
  const clave = (o: { campo: string; sentido: string }) => `${o.campo}:${o.sentido}`;
  const actual = orden ? formas.find((f) => clave(f) === clave(orden)) : undefined;
  return (
    <Select
      value={actual ? clave(actual) : ''}
      onValueChange={(v) => {
        const f = formas.find((x) => clave(x) === v);
        if (f) onCambiar({ campo: f.campo, sentido: f.sentido });
      }}
    >
      <SelectTrigger className={className ?? 'w-52'} aria-label="Ordenar por" data-testid="ordenar-por">
        <SelectValue placeholder="Ordenar por" />
      </SelectTrigger>
      <SelectContent>
        {formas.map((f) => (
          <SelectItem key={clave(f)} value={clave(f)}>
            {f.etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
