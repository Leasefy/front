import { describe, it, expect } from 'vitest';
import { canonParaMostrar } from './InquilinosTable';

/** QA-INQ-95 ronda 2 (T-10): un contrato sin canon decía «$ 0» en la fila. */
describe('el canon de la fila', () => {
  const pesos = (n: number) => `$ ${n.toLocaleString('es-CO')}`;
  it('sin canon (o en cero) es «—», nunca «$ 0»', () => {
    expect(canonParaMostrar(null, pesos)).toBe('—');
    expect(canonParaMostrar(undefined, pesos)).toBe('—');
    expect(canonParaMostrar(0, pesos)).toBe('—');
  });
  it('con canon, el canon', () => {
    expect(canonParaMostrar(1_850_000, pesos)).toBe('$ 1.850.000');
  });
});
