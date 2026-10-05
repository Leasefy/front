/**
 * TB-04 (FALTANTES, 05-10-2026): la tasa del tablero se pinta «12,5 %», como se
 * escribe en Colombia, y no «12.5%».
 */
import { describe, it, expect } from 'vitest';
import { SIN_MEDIR, tasaEnPantalla } from './tasas';

describe('tasaEnPantalla', () => {
  it('coma decimal, el espacio antes del % y los decimales fijos', () => {
    expect(tasaEnPantalla(12.5)).toBe('12,5 %');
    expect(tasaEnPantalla(100)).toBe('100,0 %');
    expect(tasaEnPantalla(33.333, 0)).toBe('33 %');
  });
  it('el signo sólo cuando se pide y la cifra sube', () => {
    expect(tasaEnPantalla(4.25, 1, { conSigno: true })).toBe('+4,3 %');
    expect(tasaEnPantalla(-8.25, 1, { conSigno: true })).toBe('-8,3 %');
    expect(tasaEnPantalla(0, 1, { conSigno: true })).toBe('0,0 %');
  });
  it('lo que no se midió es una raya, nunca «0 %»', () => {
    expect(tasaEnPantalla(null)).toBe(SIN_MEDIR);
    expect(tasaEnPantalla(Number.NaN)).toBe(SIN_MEDIR);
  });
});
