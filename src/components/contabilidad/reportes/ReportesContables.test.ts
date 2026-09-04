/**
 * `?informe=` — la pestaña que abre un enlace de la portada.
 *
 * Lo que se congela: que los tres nombres que viajan por la URL son los tres
 * valores del `Tabs`, y que cualquier otra cosa cae al balance en vez de
 * dejar la pantalla sin pestaña activa (un `value` que no existe deja el
 * `Tabs` de Radix sin ningún panel montado: pantalla en blanco).
 */

import { describe, expect, it } from 'vitest';

import { INFORMES, informeDe } from './ReportesContables';

describe('informeDe', () => {
  it('acepta los tres informes tal como viajan en la URL', () => {
    expect(informeDe('balance')).toBe('balance');
    expect(informeDe('auxiliar')).toBe('auxiliar');
    expect(informeDe('tercero')).toBe('tercero');
  });

  it('lo que no existe cae al balance, no a una pestaña vacía', () => {
    expect(informeDe('lo-que-sea')).toBe('balance');
    expect(informeDe('')).toBe('balance');
    expect(informeDe(null)).toBe('balance');
    expect(informeDe(undefined)).toBe('balance');
  });

  it('la lista no tiene repetidos ni cosas de más', () => {
    expect(INFORMES).toEqual(['balance', 'auxiliar', 'tercero']);
    expect(new Set(INFORMES).size).toBe(INFORMES.length);
  });
});
