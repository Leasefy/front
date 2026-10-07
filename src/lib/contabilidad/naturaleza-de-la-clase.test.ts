/** CB-27 (QA de Contabilidad, 03-10-2026): la naturaleza de la clase del código. */
import { describe, expect, it } from 'vitest';

import { avisoDeNaturaleza, naturalezaDeLaClase } from './naturaleza-de-la-clase';

describe('naturalezaDeLaClase', () => {
  it('1/5/6/7 débito; 2/3/4 crédito; 8/9 no propone', () => {
    expect(naturalezaDeLaClase('110505')).toBe('DEBITO');
    expect(naturalezaDeLaClase('519595')).toBe('DEBITO');
    expect(naturalezaDeLaClase('28150505')).toBe('CREDITO');
    expect(naturalezaDeLaClase('415510')).toBe('CREDITO');
    expect(naturalezaDeLaClase('8105')).toBeNull();
    expect(naturalezaDeLaClase('')).toBeNull();
  });
});

describe('avisoDeNaturaleza', () => {
  it('🔴 avisa cuando no es la de su clase (sin impedir: hay correctoras)', () => {
    expect(avisoDeNaturaleza('415510', 'DEBITO')).toContain('clase 4 (ingresos) son de naturaleza crédito');
    expect(avisoDeNaturaleza('415510', 'CREDITO')).toBeNull();
    expect(avisoDeNaturaleza('8105', 'DEBITO')).toBeNull();
  });
});
