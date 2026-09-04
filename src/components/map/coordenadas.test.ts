import { describe, it, expect } from 'vitest';
import { tieneCoordenadas } from './coordenadas';

describe('tieneCoordenadas', () => {
  it('rechaza null y undefined (inmueble sin geocodificar)', () => {
    expect(tieneCoordenadas(null, null)).toBe(false);
    expect(tieneCoordenadas(undefined, undefined)).toBe(false);
    expect(tieneCoordenadas(4.7, null)).toBe(false);
    expect(tieneCoordenadas(null, -74.1)).toBe(false);
  });

  it('rechaza (0,0): es el «sin ubicación» que dejó el mapper viejo', () => {
    expect(tieneCoordenadas(0, 0)).toBe(false);
  });

  it('rechaza NaN e infinitos', () => {
    expect(tieneCoordenadas(Number.NaN, -74.1)).toBe(false);
    expect(tieneCoordenadas(4.7, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('rechaza fuera de rango', () => {
    expect(tieneCoordenadas(91, -74.1)).toBe(false);
    expect(tieneCoordenadas(-91, -74.1)).toBe(false);
    expect(tieneCoordenadas(4.7, 181)).toBe(false);
    expect(tieneCoordenadas(4.7, -181)).toBe(false);
  });

  it('acepta una ubicación real en Colombia', () => {
    expect(tieneCoordenadas(4.711, -74.0721)).toBe(true);
    expect(tieneCoordenadas(6.2442, -75.5812)).toBe(true);
  });

  it('acepta una coordenada con un solo cero (ecuador o meridiano)', () => {
    expect(tieneCoordenadas(0, -74.1)).toBe(true);
    expect(tieneCoordenadas(4.7, 0)).toBe(true);
  });
});
