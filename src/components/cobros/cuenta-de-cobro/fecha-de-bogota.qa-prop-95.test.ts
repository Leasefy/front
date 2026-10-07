import { describe, expect, it } from 'vitest';
import { fechaEnPalabras } from './lineas';

describe('QA-PROP-95 · la cuenta de cobro se emite con el día de Bogotá (C-32)', () => {
  it('emitida el 4 de octubre a las 9:31 p. m. (5 de octubre en UTC) dice «4 de octubre de 2026»', () => {
    expect(fechaEnPalabras('2026-10-05T02:31:31.046Z')).toBe('4 de octubre de 2026');
  });
  it('una fecha civil sigue igual', () => {
    expect(fechaEnPalabras('2026-10-05')).toBe('5 de octubre de 2026');
  });
});
