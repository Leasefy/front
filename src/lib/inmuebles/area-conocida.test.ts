import { describe, it, expect } from 'vitest';
import { areaConocida } from './area-conocida';

describe('areaConocida (QA-INQ-95, PI-03)', () => {
  it('cero, negativo, null o NaN no son un área que se muestre', () => {
    for (const a of [0, -5, null, undefined, Number.NaN]) expect(areaConocida(a)).toBe(false);
  });
  it('un área de verdad sí', () => {
    expect(areaConocida(54)).toBe(true);
    expect(areaConocida(0.5)).toBe(true);
  });
});
