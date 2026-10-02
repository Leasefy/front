/**
 * lotesParaRetomar — qué cargas abiertas vale la pena ofrecer retomar.
 *
 * `GET /lotes` devuelve todo lo no-terminado. De eso:
 *  - T-0130: TODO lo que el back lista se ofrece, también un FALLIDO. Antes se
 *    escondía porque no había acción posible salvo empezar de nuevo; ahora el
 *    back guarda las filas y un lote fallido (o con filas que no se pudieron
 *    crear) se retoma con «Reintentar». Esconderlo era justo lo que obligaba a
 *    empezar de cero.
 *  - Se ordena del más reciente al más viejo: si hay varios, el que la persona
 *    dejó a medias hace un rato es casi siempre el que busca.
 */

import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

export function lotesParaRetomar(
  lotes: readonly EstadoDeLoteInmuebles[],
): EstadoDeLoteInmuebles[] {
  return [...lotes].sort((a, b) =>
    a.creadoEn < b.creadoEn ? 1 : a.creadoEn > b.creadoEn ? -1 : 0,
  );
}
