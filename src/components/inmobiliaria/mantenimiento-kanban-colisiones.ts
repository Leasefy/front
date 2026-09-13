import {
  closestCorners,
  pointerWithin,
  type CollisionDetection,
} from '@dnd-kit/core';

/**
 * Qué columna del tablero es el destino de la tarjeta que se está arrastrando.
 *
 * 🔴 POR QUÉ EXISTE (Nico, 2026-09-13): soltó una tarjeta de «Reportadas» sobre
 * la columna de al lado y el aviso dijo que había intentado moverla a
 * **Aprobada**, que es la TERCERA. No se había equivocado de columna: se
 * equivocó `closestCorners`.
 *
 * `closestCorners` —y `closestCenter`, y `rectIntersection`— miden el RECTÁNGULO
 * de la tarjeta arrastrada, no el puntero. Y ese rectángulo no viaja debajo del
 * dedo: dnd-kit lo desplaza por el mismo delta que el mouse, así que queda
 * corrido respecto del puntero exactamente por donde agarraste la tarjeta. Una
 * tarjeta mide 280 px y una columna ~300 px: agarrarla por el borde izquierdo
 * deja su centro ~140 px a la derecha del puntero, o sea casi media columna. El
 * puntero está sobre «Cotizadas» y el rectángulo ya vota por «Aprobadas».
 *
 * Acá el destino lo decide el PUNTERO, que es lo que la persona está mirando:
 *
 *   1. `pointerWithin` — la columna que está literalmente debajo del cursor.
 *   2. Si el cursor cayó fuera de toda zona de soltar (sobre el encabezado de
 *      una columna, en el espacio entre dos, o más abajo del tablero), gana la
 *      columna cuya BANDA HORIZONTAL contiene la x del cursor. Las columnas son
 *      franjas verticales una al lado de la otra: la x sola alcanza para saber
 *      sobre cuál está, sin volver a mirar el rectángulo corrido.
 *   3. Sin coordenadas de puntero —el arrastre por teclado no tiene— vale
 *      `closestCorners`, que ahí sí es lo correcto: el «puntero» es la tarjeta.
 *
 * `rectIntersection` NO se usa de respaldo, aunque sea la receta habitual: mide
 * el mismo rectángulo corrido que causó el defecto.
 */
export const detectarColumnaDelPuntero: CollisionDetection = (args) => {
  const bajoElPuntero = pointerWithin(args);
  if (bajoElPuntero.length > 0) {
    return bajoElPuntero;
  }

  const puntero = args.pointerCoordinates;
  if (!puntero) {
    return closestCorners(args);
  }

  let elegida: (typeof args.droppableContainers)[number] | null = null;
  let menorDistancia = Number.POSITIVE_INFINITY;

  for (const contenedor of args.droppableContainers) {
    const rect = args.droppableRects.get(contenedor.id);
    if (!rect) continue;

    const derecha = rect.left + rect.width;
    // 0 cuando la x del cursor cae dentro de la banda de la columna.
    const distancia =
      puntero.x < rect.left
        ? rect.left - puntero.x
        : puntero.x > derecha
          ? puntero.x - derecha
          : 0;

    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      elegida = contenedor;
    }
  }

  return elegida
    ? [
        {
          id: elegida.id,
          data: { droppableContainer: elegida, value: menorDistancia },
        },
      ]
    : [];
};
