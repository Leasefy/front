'use client';

/**
 * La ranura VIVA del muro: lo que un paso necesita que siga funcionando
 * mientras el resto está congelado.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * El muro pone `inert` sobre todo el contenido del paso mientras hay una
 * operación en vuelo. `inert` congela clics, foco y teclado de TODO el
 * subárbol, y **no se puede desactivar en un descendiente**: no hay
 * `inert="false"` que valga, ni un portal que escape — `inert` es del DOM, así
 * que un `createPortal` a un nodo de adentro nace igual de muerto.
 *
 * Eso dejaba a la barra de progreso sin salida. La de geocodificación puede
 * durar 53 minutos sobre 2.864 inmuebles, y su botón de parar tenía que vivir
 * lejos, en el pie del muro, porque era el único sitio fuera del `inert`.
 * Nico, 2026-09-10: «ese detener carga está súper mal ubicado, debería estar
 * mucho más cerca de la progress bar y quizás hacer parte de la progress bar».
 *
 * Tenía razón: un control a dos secciones de distancia de lo que controla no
 * se encuentra cuando se necesita. La ranura invierte la solución — en vez de
 * mandar el botón lejos, el paso manda ACÁ el bloque entero (barra, conteo,
 * tiempo restante y botón), y el muro lo dibuja fuera del `inert`, pegado al
 * contenido. Viajan juntos y los dos quedan vivos.
 *
 * `null` = no hay muro (la página suelta `/inmuebles/importar`): allá no hay
 * `inert` y el paso dibuja su bloque donde siempre.
 */

import { createContext, useContext } from 'react';

export const RanuraVivaContext = createContext<HTMLElement | null>(null);

/**
 * El nodo donde portalizar lo que tiene que seguir vivo, o `null` si no hay
 * muro. Quien lo use tiene que aguantar el `null`: la ranura no existe en el
 * primer render ni fuera del muro.
 */
export function useRanuraViva(): HTMLElement | null {
  return useContext(RanuraVivaContext);
}
