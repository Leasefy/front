/**
 * R2 (revisora r27, 23-10-2026): el mismo número dos veces en las pestañas de
 * estado —«Todas 30 · Por enviar 30», «Activos 1 · Todos 1», «Todas 1 ·
 * Asignadas 1», «Todos 2 · Borrador 2»— y una pestaña sola («Todos 8») que no
 * filtra nada. La pieza compartida (`PestanasDeEstado`) no se toca sin
 * coordinar; esto lo arregla desde cada pantalla con lo que la pieza ya sabe
 * hacer: `cuantos: null` = la pestaña va sin número.
 */
import type { PestanaDeEstado } from '@/components/pantalla/PestanasDeEstado';

/** Las que `PestanasDeEstado` pinta: la misma regla que usa la pieza. */
export function pestanasVisibles<V extends string>(
  pestanas: readonly PestanaDeEstado<V>[],
  valor: V,
): PestanaDeEstado<V>[] {
  return pestanas.filter((p) => p.fija || p.valor === valor || p.cuantos === null || p.cuantos > 0);
}

/**
 * Si otra pestaña visible cuenta lo mismo que la de «todos», la de «todos» va
 * sin número: el número ya está dicho al lado.
 */
export function sinElNumeroRepetido<V extends string>(
  pestanas: readonly PestanaDeEstado<V>[],
  valorDeTodos: V,
  valor: V,
): PestanaDeEstado<V>[] {
  const todos = pestanas.find((p) => p.valor === valorDeTodos);
  if (!todos || todos.cuantos === null) return [...pestanas];
  const repetida = pestanasVisibles(pestanas, valor).some(
    (p) => p.valor !== valorDeTodos && p.cuantos === todos.cuantos,
  );
  return repetida ? pestanas.map((p) => (p.valor === valorDeTodos ? { ...p, cuantos: null } : p)) : [...pestanas];
}

/** Una pestaña sola no filtra nada: no se pinta. */
export function hayQuePintarLasPestanas<V extends string>(
  pestanas: readonly PestanaDeEstado<V>[],
  valor: V,
): boolean {
  return pestanasVisibles(pestanas, valor).length > 1;
}
