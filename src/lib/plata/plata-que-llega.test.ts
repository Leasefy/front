import { describe, expect, it } from 'vitest';

import { plataQueLlega } from './plata-que-llega';

describe('🔴 Portofino (14-10) · el contador de plata termina en la cifra exacta', () => {
  const formatear = (n: number) => String(n);

  it('al llegar escribe los centavos (no redondea el final)', () => {
    expect(plataQueLlega(1_230_101.96, formatear)(1_230_101.96)).toBe('1230101.96');
  });

  it('mientras cuenta, pesos enteros', () => {
    expect(plataQueLlega(1_230_101.96, formatear)(615_050.4321)).toBe('615050');
  });

  it('un entero queda igual que antes', () => {
    expect(plataQueLlega(1_845_151, formatear)(1_845_151)).toBe('1845151');
  });
});
