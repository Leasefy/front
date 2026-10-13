import { describe, expect, it } from 'vitest';
import { aCentavos, PlataInvalida } from './plata';

describe('aCentavos(number, { talCual }): un número de celda con centavos', () => {
  it.each([
    [1227294.12, 122729412],
    [2899159.66, 289915966],
    [0.29, 29],
    [2350000.29, 235000029],
    [-1227294.12, -122729412],
  ])('%s → %s centavos, exacto', (n, esperado) => {
    expect(aCentavos(n, { talCual: true })).toBe(esperado);
  });

  it('más de dos decimales reales sigue lanzando', () => {
    expect(() => aCentavos(2500000.123, { talCual: true })).toThrow(PlataInvalida);
    expect(() => aCentavos(1.005, { talCual: true })).toThrow(PlataInvalida);
  });

  it('sin talCual el redondeo no cambia', () => {
    expect(aCentavos(1.005)).toBe(101);
    expect(aCentavos(1227294.12)).toBe(122729412);
  });

  it('un valor que no es finito sigue lanzando', () => {
    expect(() => aCentavos(Number.NaN, { talCual: true })).toThrow(PlataInvalida);
    expect(() => aCentavos(Number.POSITIVE_INFINITY, { talCual: true })).toThrow(PlataInvalida);
  });

  it('el ruido del flotante nunca se confunde con un tercer decimal (barrido)', () => {
    for (let c = 1; c < 400000; c += 7) {
      const n = Number((c * 37 + 11).toString().replace(/(\d+)(\d{2})$/, '$1.$2'));
      expect(aCentavos(n, { talCual: true })).toBe(Math.round(n * 100));
    }
  });
});
