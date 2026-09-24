/**
 * La regla del scroll del turno, en números (Nico, 23-09, 23:44): la pregunta
 * arriba, la respuesta crece debajo, y el hilo la acompaña sólo hasta que el
 * INICIO de la respuesta llega arriba; de ahí no la empuja más.
 */

import { describe, it, expect } from 'vitest';

import {
  INICIO_DE_LA_RESPUESTA_A_LO_SUMO_PX,
  MARGEN_ARRIBA_PX,
  espacioAlFinal,
  objetivoDelScroll,
  quedaContenidoAbajo,
} from './use-scroll-del-turno';

// Un hilo de 600 px de alto; la pregunta (una línea) empieza en 1000 y la respuesta en 1080.
const CORTA = { pregunta: 1000, respuesta: 1080, alto: 600 };
// Una pregunta larga (pegaron un párrafo): la respuesta empieza 400 px después.
const LARGA = { pregunta: 1000, respuesta: 1400, alto: 600 };

/** Dónde queda el inicio de la respuesta, medido desde el borde de arriba del hilo. */
const enPantalla = (g: { respuesta: number }, objetivo: number) => g.respuesta - objetivo;

describe('objetivoDelScroll', () => {
  it('recién mandada (la respuesta todavía corta): la pregunta queda cerca del borde de arriba', () => {
    const g = { ...CORTA, fin: 1150 };
    const objetivo = objetivoDelScroll(g);
    expect(objetivo).toBe(1000 - MARGEN_ARRIBA_PX);
    // Para poder quedar ahí hace falta un espacio al final.
    expect(espacioAlFinal(objetivo, g)).toBe(984 + 600 - 1150);
  });

  it('llegó de una y es larga (la ficha del contrato #24): la pregunta arriba y el inicio de la respuesta a la vista, nunca el final', () => {
    const g = { ...CORTA, fin: 3000 };
    const objetivo = objetivoDelScroll(g);
    expect(objetivo).toBe(1000 - MARGEN_ARRIBA_PX);
    expect(enPantalla(g, objetivo)).toBeGreaterThanOrEqual(0);
    expect(enPantalla(g, objetivo)).toBeLessThanOrEqual(120);
    expect(espacioAlFinal(objetivo, g)).toBe(0);
  });

  it('con una pregunta larga, acompaña lo que crece hasta que el inicio de la respuesta llega arriba; de ahí no empuja más', () => {
    expect(objetivoDelScroll({ ...LARGA, fin: 1500 })).toBe(984);
    expect(objetivoDelScroll({ ...LARGA, fin: 1700 })).toBe(1100);
    const tope = 1400 - INICIO_DE_LA_RESPUESTA_A_LO_SUMO_PX;
    expect(objetivoDelScroll({ ...LARGA, fin: 2000 })).toBe(tope);
    expect(objetivoDelScroll({ ...LARGA, fin: 9000 })).toBe(tope);
    expect(enPantalla(LARGA, tope)).toBeLessThanOrEqual(120);
  });

  it('la primera pregunta de la conversación: nunca un scroll negativo', () => {
    expect(objetivoDelScroll({ pregunta: 0, respuesta: 60, fin: 200, alto: 600 })).toBe(0);
  });
});

describe('quedaContenidoAbajo («Ver el resto»)', () => {
  it('sólo cuando hay contenido debajo de lo visible (con una tolerancia de 8 px)', () => {
    expect(quedaContenidoAbajo(984, 600, 3000)).toBe(true);
    expect(quedaContenidoAbajo(2400, 600, 3000)).toBe(false);
    expect(quedaContenidoAbajo(2395, 600, 3000)).toBe(false);
  });
});
