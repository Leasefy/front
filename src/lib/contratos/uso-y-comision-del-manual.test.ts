import { describe, expect, it } from 'vitest';

import { leerComision, usoPorElTipoDelInmueble } from './uso-y-comision-del-manual';

describe('usoPorElTipoDelInmueble (CONTR-7)', () => {
  it('lo mismo que el back: vivienda, comercial o no se adivina', () => {
    expect(usoPorElTipoDelInmueble('STUDIO')).toBe('VIVIENDA');
    expect(usoPorElTipoDelInmueble('OFFICE')).toBe('COMERCIAL');
    expect(usoPorElTipoDelInmueble(null)).toBeNull();
  });
});

describe('leerComision (CONTR-6)', () => {
  it('acepta 10, 8,5 y 0', () => {
    expect(leerComision('10')).toEqual({ valor: 10, error: null });
    expect(leerComision('8,5')).toEqual({ valor: 8.5, error: null });
    expect(leerComision('0')).toEqual({ valor: 0, error: null });
  });

  it('vacía, con letras, con tres decimales o más de 100: dice qué está mal', () => {
    expect(leerComision('').error).toContain('Escribe la comisión');
    expect(leerComision('diez').error).toContain('porcentaje');
    expect(leerComision('8,555').error).toContain('dos decimales');
    expect(leerComision('120').error).toContain('100 %');
  });
});
