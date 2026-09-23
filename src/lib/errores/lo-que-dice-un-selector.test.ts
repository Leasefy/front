/**
 * Un selector vacío no es lo mismo que uno que no pudo cargar.
 *
 * 🔴 Visto en la pantalla el 21-09: con la base atrasada una columna, el
 * selector de inmuebles de «Generar documento» decía «No hay inmuebles» y
 * había 2.965.
 */

import { describe, it, expect } from 'vitest';
import { loQueDiceUnSelector, elSelectorSirve } from './lo-que-dice-un-selector';

const BASE = {
  queSon: 'los inmuebles',
  pista: 'Busca por título o dirección',
  cuandoNoHay: 'Todavía no tienes inmuebles',
};

describe('loQueDiceUnSelector', () => {
  it('mientras carga, no afirma nada', () => {
    expect(loQueDiceUnSelector({ ...BASE, cargando: true, cuantos: 0 })).toBe(
      'Cargando los inmuebles…',
    );
  });

  it('🔴 si falló, lo dice — aunque la lista haya quedado en cero', () => {
    expect(
      loQueDiceUnSelector({ ...BASE, cargando: false, error: new Error('503'), cuantos: 0 }),
    ).toBe('No pudimos traer los inmuebles');
  });

  it('🔴 el error va ANTES del vacío: es el orden lo que evita la mentira', () => {
    const conError = loQueDiceUnSelector({
      ...BASE,
      cargando: false,
      error: { status: 503 },
      cuantos: 0,
    });
    // Con el vacío primero, este mismo caso diría «Todavía no tienes inmuebles».
    expect(conError).not.toBe(BASE.cuandoNoHay);
  });

  it('vacío de verdad: lo que esa pantalla tenga que decir', () => {
    expect(loQueDiceUnSelector({ ...BASE, cargando: false, cuantos: 0 })).toBe(
      'Todavía no tienes inmuebles',
    );
  });

  it('con opciones, la pista de búsqueda', () => {
    expect(loQueDiceUnSelector({ ...BASE, cargando: false, cuantos: 12 })).toBe(
      'Busca por título o dirección',
    );
  });

  it('un error que llega como `false` no cuenta como error', () => {
    // Varios hooks devuelven `errorCrudo: null` y algunos `false`: ninguno de
    // los dos puede disparar el mensaje de fallo.
    expect(loQueDiceUnSelector({ ...BASE, cargando: false, error: false, cuantos: 5 })).toBe(
      BASE.pista,
    );
    expect(loQueDiceUnSelector({ ...BASE, cargando: false, error: null, cuantos: 5 })).toBe(
      BASE.pista,
    );
  });
});

describe('elSelectorSirve', () => {
  it('sólo con la lista cargada, sana y con algo adentro', () => {
    expect(elSelectorSirve({ cargando: false, cuantos: 3 })).toBe(true);
    expect(elSelectorSirve({ cargando: true, cuantos: 3 })).toBe(false);
    expect(elSelectorSirve({ cargando: false, error: new Error('x'), cuantos: 3 })).toBe(false);
    expect(elSelectorSirve({ cargando: false, cuantos: 0 })).toBe(false);
  });

  it('🔴 un selector caído queda APAGADO: abierto sobre una lista vacía vuelve a parecer «no hay»', () => {
    expect(elSelectorSirve({ cargando: false, error: { status: 503 }, cuantos: 0 })).toBe(false);
  });
});
