import { useCallback, useMemo, useState } from 'react';

/**
 * El orden de una tabla (Nico, 28-10-2026: «que todas las tablas tengan lo de ordenamiento general y por columnas»).
 * Ordena en el navegador la lista que ya se tiene (para la que pagina el servidor, el orden se le pide al back).
 *   · Texto: alfabético en español, sin importar tildes ni mayúsculas, y «Apto 2» antes que «Apto 10».
 *   · Números y fechas (ISO o `Date`): de menor a mayor.
 *   · Lo vacío (`null`, `undefined`, '') siempre al final, vaya el orden para donde vaya.
 * Un toque en la misma columna invierte el sentido; en otra, empieza de menor a mayor (o el que diga `primero`).
 */

export type SentidoDelOrden = 'asc' | 'desc';
export interface OrdenDeLaTabla<C extends string> {
  campo: C;
  sentido: SentidoDelOrden;
}
export type ValorParaOrdenar = string | number | Date | boolean | null | undefined;

const COLADOR = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

function vacio(v: ValorParaOrdenar): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (typeof v === 'number' && Number.isNaN(v));
}

/** Compara dos valores de una columna. Lo vacío no se compara aquí: lo pone al final `ordenarFilas`. */
export function compararValores(a: ValorParaOrdenar, b: ValorParaOrdenar): number {
  if (a instanceof Date || b instanceof Date) return new Date(a as Date).getTime() - new Date(b as Date).getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return COLADOR.compare(String(a), String(b));
}

/** Ordena sin tocar la lista original; los empates conservan el orden en que venían. */
export function ordenarFilas<T, C extends string>(
  filas: readonly T[],
  orden: OrdenDeLaTabla<C> | null,
  columnas: Record<C, (fila: T) => ValorParaOrdenar>,
): T[] {
  if (!orden) return [...filas];
  const leer = columnas[orden.campo];
  if (!leer) return [...filas];
  const signo = orden.sentido === 'asc' ? 1 : -1;
  return filas
    .map((fila, i) => ({ fila, i, v: leer(fila) }))
    .sort((x, y) => {
      const vx = vacio(x.v);
      const vy = vacio(y.v);
      if (vx || vy) return vx === vy ? x.i - y.i : vx ? 1 : -1;
      return compararValores(x.v, y.v) * signo || x.i - y.i;
    })
    .map((x) => x.fila);
}

export function useOrdenDeLaTabla<T, C extends string>(
  filas: readonly T[],
  columnas: Record<C, (fila: T) => ValorParaOrdenar>,
  // Las columnas salen de `columnas`; el orden inicial y el primer sentido sólo pueden nombrar ésas.
  opciones: { inicial?: OrdenDeLaTabla<NoInfer<C>> | null; primero?: Partial<Record<NoInfer<C>, SentidoDelOrden>> } = {},
) {
  const [orden, setOrden] = useState<OrdenDeLaTabla<C> | null>(opciones.inicial ?? null);
  const primero = opciones.primero;
  const ordenarPor = useCallback(
    (campo: C) =>
      setOrden((actual) =>
        actual?.campo === campo
          ? { campo, sentido: actual.sentido === 'asc' ? 'desc' : 'asc' }
          : { campo, sentido: primero?.[campo] ?? 'asc' },
      ),
    [primero],
  );
  // `columnas` suele escribirse en línea: el orden se recalcula con las filas y el orden, no con cada pintada.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ordenadas = useMemo(() => ordenarFilas(filas, orden, columnas), [filas, orden]);
  return { ordenadas, orden, ordenarPor, setOrden };
}
