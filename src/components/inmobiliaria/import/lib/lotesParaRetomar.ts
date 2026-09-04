/**
 * lotesParaRetomar — qué cargas abiertas vale la pena ofrecer retomar.
 *
 * `GET /lotes` devuelve todo lo no-terminado. De eso:
 *  - Un FALLIDO no se ofrece: retomarlo aterriza en una pantalla de error de
 *    un job muerto cuyos datos ya no están en el wizard — no hay acción
 *    posible salvo empezar de nuevo, que es justo lo que la persona ya está
 *    por hacer.
 *  - El resto se ordena del más reciente al más viejo: si hay varios, el que
 *    la persona dejó a medias hace un rato es casi siempre el que busca.
 */

import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

export function lotesParaRetomar(
  lotes: readonly EstadoDeLoteInmuebles[],
): EstadoDeLoteInmuebles[] {
  return lotes
    .filter((l) => l.estado !== 'FALLIDO')
    .sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : a.creadoEn > b.creadoEn ? -1 : 0));
}
