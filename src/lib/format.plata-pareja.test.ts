import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/plata/escribir-plata', async () => {
  const real = await vi.importActual<typeof import('@/lib/plata/escribir-plata')>('@/lib/plata/escribir-plata');
  // Como con la llave de centavos prendida: se muestran si el valor los trae.
  return { ...real, seMuestranLosCentavos: (v: unknown) => typeof v === 'number' && !Number.isInteger(v) };
});

import { plataPareja } from './format';

describe('plataPareja (22-10: los mismos decimales en una franja o columna)', () => {
  it('si una cifra trae centavos, todas los muestran', () => {
    const plata = plataPareja([6_410_000, 43_930_500.5]);
    expect(plata(6_410_000)).toBe('$ 6.410.000,00');
    expect(plata(43_930_500.5)).toBe('$ 43.930.500,50');
  });
  it('sin centavos en ninguna, al peso como siempre', () => {
    const plata = plataPareja([6_410_000, 1_000]);
    expect(plata(6_410_000)).toBe('$ 6.410.000');
  });
});
