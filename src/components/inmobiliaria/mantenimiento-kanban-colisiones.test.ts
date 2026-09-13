/**
 * El destino de una tarjeta arrastrada lo decide el PUNTERO.
 *
 * 🔴 EL DEFECTO QUE CIERRA (Nico, 2026-09-13): «traté de mover arrastrando la
 * card creada y no deja, sale error» — y el aviso decía que había intentado
 * moverla a **Aprobada**, la TERCERA columna, habiendo soltado sobre la
 * segunda. Cada caso de acá corre las DOS detecciones con la misma geometría:
 * la vieja (`closestCorners`, que mide el rectángulo de la tarjeta) y la nueva.
 * Donde la vieja se equivoca queda escrito qué contestaba.
 */

import { describe, it, expect } from 'vitest';
import { closestCorners, type CollisionDetection } from '@dnd-kit/core';
import { detectarColumnaDelPuntero } from './mantenimiento-kanban-colisiones';

// ── La geometría real del tablero, medida en el navegador ───────────────────
// Cinco columnas de 300 px con 16 px de separación (`gap-4`), empezando en la
// x = 40 del contenido de la página. El alto es el del contenedor con
// `min-h-[200px]`, y el encabezado de la columna queda ARRIBA de la zona de
// soltar (por eso `ARRIBA_DEL_CONTENIDO`).
const COLUMNAS = ['reported', 'quoted', 'approved', 'in_progress', 'completed'];
const ANCHO = 300;
const PASO = ANCHO + 16;
const IZQUIERDA_PRIMERA = 40;
const ARRIBA_DEL_CONTENIDO = 260;
const ALTO = 520;

function rectDeColumna(indice: number) {
  const left = IZQUIERDA_PRIMERA + indice * PASO;
  return {
    left,
    top: ARRIBA_DEL_CONTENIDO,
    width: ANCHO,
    height: ALTO,
    right: left + ANCHO,
    bottom: ARRIBA_DEL_CONTENIDO + ALTO,
  };
}

const RECTS = new Map(COLUMNAS.map((id, i) => [id, rectDeColumna(i)]));

/**
 * El rectángulo de la tarjeta tal como lo calcula dnd-kit: la posición
 * original desplazada por el mismo delta que el puntero. `agarre` es a cuántos
 * píxeles del borde izquierdo de la tarjeta se la agarró — de ahí sale el
 * corrimiento que rompía la detección.
 */
const ANCHO_TARJETA = 284;
const ALTO_TARJETA = 118;

function argsDeSoltar({
  punteroX,
  punteroY = ARRIBA_DEL_CONTENIDO + 120,
  agarre = ANCHO_TARJETA / 2,
}: {
  punteroX: number;
  punteroY?: number;
  agarre?: number;
}) {
  const left = punteroX - agarre;
  const top = punteroY - 40;
  const collisionRect = {
    left,
    top,
    width: ANCHO_TARJETA,
    height: ALTO_TARJETA,
    right: left + ANCHO_TARJETA,
    bottom: top + ALTO_TARJETA,
  };

  return {
    active: { id: 'sol-1', data: { current: undefined }, rect: { current: { initial: null, translated: collisionRect } } },
    collisionRect,
    droppableRects: RECTS,
    droppableContainers: COLUMNAS.map((id) => ({
      id,
      key: id,
      disabled: false,
      node: { current: null },
      rect: { current: RECTS.get(id)! },
      data: { current: { estado: id } },
    })),
    pointerCoordinates: { x: punteroX, y: punteroY },
  } as unknown as Parameters<CollisionDetection>[0];
}

const detectar = (deteccion: CollisionDetection, args: Parameters<CollisionDetection>[0]) =>
  (deteccion(args)[0]?.id as string | undefined) ?? null;

const centroDe = (indice: number) => IZQUIERDA_PRIMERA + indice * PASO + ANCHO / 2;

describe('detectarColumnaDelPuntero — dónde cree el tablero que soltaste', () => {
  describe('las tres soltadas que pidió Nico, sobre «Cotizadas» (2.ª columna)', () => {
    // La tarjeta sale de «Reportadas» y se la agarra cerca de su borde
    // izquierdo, que es lo natural: ahí está el ícono y el título.
    const AGARRE = 40;

    it('en el CENTRO de Cotizadas', () => {
      const args = argsDeSoltar({ punteroX: centroDe(1), agarre: AGARRE });
      expect(detectar(detectarColumnaDelPuntero, args)).toBe('quoted');
      // La vieja acertaba en el centro: por eso el defecto parecía aleatorio.
      expect(detectar(closestCorners, args)).toBe('quoted');
    });

    it('en el borde IZQUIERDO de Cotizadas', () => {
      const args = argsDeSoltar({
        punteroX: rectDeColumna(1).left + 6,
        agarre: AGARRE,
      });
      expect(detectar(detectarColumnaDelPuntero, args)).toBe('quoted');
    });

    it('en el borde DERECHO de Cotizadas — acá la vieja saltaba a «Aprobadas»', () => {
      const args = argsDeSoltar({
        punteroX: rectDeColumna(1).right - 6,
        agarre: AGARRE,
      });
      expect(detectar(detectarColumnaDelPuntero, args)).toBe('quoted');
      expect(detectar(closestCorners, args)).toBe('approved');
    });
  });

  it('agarrar la tarjeta por el borde izquierdo corre el rectángulo media columna', () => {
    // Exactamente el toast de Nico: puntero sobre «Cotizadas», destino
    // «Aprobada».
    const args = argsDeSoltar({ punteroX: centroDe(1) + 40, agarre: 10 });
    expect(detectar(closestCorners, args)).toBe('approved');
    expect(detectarColumnaDelPuntero(args)[0]?.id).toBe('quoted');
  });

  it.each(COLUMNAS.map((id, i) => [id, i] as const))(
    'soltar en el centro de %s detecta %s',
    (id, i) => {
      const args = argsDeSoltar({ punteroX: centroDe(i), agarre: 10 });
      expect(detectar(detectarColumnaDelPuntero, args)).toBe(id);
    },
  );

  it('una columna VACÍA se detecta igual que una llena: el rectángulo de la zona no cambia', () => {
    // Las columnas vacías tienen el mismo `min-h-[200px]` y el mismo ancho: la
    // detección por puntero no depende de cuántas tarjetas haya adentro.
    const args = argsDeSoltar({ punteroX: centroDe(4), agarre: 200 });
    expect(detectar(detectarColumnaDelPuntero, args)).toBe('completed');
  });

  describe('el cursor fuera de toda zona de soltar', () => {
    it('sobre el ENCABEZADO de una columna elige esa columna, no la de al lado', () => {
      const args = argsDeSoltar({
        punteroX: centroDe(2),
        punteroY: ARRIBA_DEL_CONTENIDO - 20,
        agarre: 10,
      });
      expect(detectar(detectarColumnaDelPuntero, args)).toBe('approved');
    });

    it('en la separación entre dos columnas elige la más cercana en horizontal', () => {
      const args = argsDeSoltar({
        punteroX: rectDeColumna(0).right + 4,
        punteroY: ARRIBA_DEL_CONTENIDO - 20,
        agarre: 10,
      });
      expect(detectar(detectarColumnaDelPuntero, args)).toBe('reported');
    });

    it('por debajo del tablero sigue mandando la x', () => {
      const args = argsDeSoltar({
        punteroX: centroDe(3),
        punteroY: ARRIBA_DEL_CONTENIDO + ALTO + 80,
        agarre: 10,
      });
      expect(detectar(detectarColumnaDelPuntero, args)).toBe('in_progress');
    });
  });

  it('sin puntero (arrastre por TECLADO) cae en closestCorners, que ahí sí corresponde', () => {
    const args = argsDeSoltar({ punteroX: centroDe(3), agarre: 10 });
    const sinPuntero = { ...args, pointerCoordinates: null };
    expect(detectar(detectarColumnaDelPuntero, sinPuntero)).toBe(
      detectar(closestCorners, sinPuntero),
    );
    expect(detectar(detectarColumnaDelPuntero, sinPuntero)).not.toBeNull();
  });

  it('sin columnas registradas no inventa un destino', () => {
    const args = argsDeSoltar({ punteroX: centroDe(1), agarre: 10 });
    expect(
      detectarColumnaDelPuntero({
        ...args,
        droppableContainers: [],
        droppableRects: new Map(),
      } as unknown as Parameters<CollisionDetection>[0]),
    ).toEqual([]);
  });
});
