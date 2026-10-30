import { describe, expect, it } from 'vitest';
import { elMasReciente } from './useBorradorDelContratoNuevo';

describe('borrador de «Nuevo contrato»: gana el más reciente', () => {
  const viejo = { datos: { a: 1 }, actualizadoEn: '2026-10-29T10:00:00.000Z' };
  const nuevo = { datos: { a: 2 }, actualizadoEn: '2026-10-29T11:00:00.000Z' };
  it('elige el más reciente entre el navegador y el back', () => {
    expect(elMasReciente(viejo, nuevo)).toBe(nuevo);
    expect(elMasReciente(nuevo, viejo)).toBe(nuevo);
  });
  it('si sólo hay uno, ése', () => {
    expect(elMasReciente(null, viejo)).toBe(viejo);
    expect(elMasReciente(viejo, null)).toBe(viejo);
    expect(elMasReciente(null, null)).toBeNull();
  });
});
