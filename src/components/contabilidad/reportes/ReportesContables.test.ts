/**
 * `?informe=` — la pestaña que abre un enlace de la portada.
 *
 * Lo que se congela: que los cinco nombres que viajan por la URL son los cinco
 * valores del `Tabs`, y que cualquier otra cosa cae al balance en vez de
 * dejar la pantalla sin pestaña activa (un `value` que no existe deja el
 * `Tabs` de Radix sin ningún panel montado: pantalla en blanco).
 */

import { describe, expect, it } from 'vitest';

import { INFORMES, informeDe } from './ReportesContables';

describe('informeDe', () => {
  it('acepta los cinco informes tal como viajan en la URL', () => {
    expect(informeDe('balance')).toBe('balance');
    expect(informeDe('mayor')).toBe('mayor');
    expect(informeDe('auxiliar')).toBe('auxiliar');
    expect(informeDe('terceros')).toBe('terceros');
    expect(informeDe('tercero')).toBe('tercero');
  });

  /*
   * 🔴 `terceros` (la lista) y `tercero` (el estado de cuenta de uno) son dos
   * pestañas distintas y sus nombres se diferencian en una letra. Un enlace que
   * se equivoque cae al balance en silencio —el default— así que este test es la
   * única red: fija que los dos existen y que no colapsan en uno.
   */
  it('«terceros» y «tercero» son pestañas distintas', () => {
    expect(informeDe('terceros')).not.toBe(informeDe('tercero'));
    expect(INFORMES).toContain('terceros');
    expect(INFORMES).toContain('tercero');
  });

  it('lo que no existe cae al balance, no a una pestaña vacía', () => {
    expect(informeDe('lo-que-sea')).toBe('balance');
    expect(informeDe('')).toBe('balance');
    expect(informeDe(null)).toBe('balance');
    expect(informeDe(undefined)).toBe('balance');
  });

  it('la lista no tiene repetidos ni cosas de más, y está en el orden del trabajo', () => {
    // balance (¿cuadra?) → mayor (¿en qué mes?) → auxiliar (¿en qué asiento?)
    // → terceros (¿de quién?) → estado de cuenta (¿qué le pasó?).
    expect(INFORMES).toEqual(['balance', 'mayor', 'auxiliar', 'terceros', 'tercero']);
    expect(new Set(INFORMES).size).toBe(INFORMES.length);
  });
});
