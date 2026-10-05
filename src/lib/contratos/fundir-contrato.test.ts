import { describe, it, expect } from 'vitest';
import type { Contract } from '@/lib/types/contract';
import { fundirContrato } from './fundir-contrato';

describe('fundirContrato (QA-CONT-95, B-29)', () => {
  it('🔴 lo que la respuesta del PATCH no trae se conserva (la regla de cobro)', () => {
    const antes = { id: 'c1', comisionPorcentaje: 10, reglaDeCobro: { plazoSinFijar: true } } as unknown as Contract;
    const patch = { id: 'c1', comisionPorcentaje: 8, reglaDeCobro: undefined } as unknown as Contract;
    const r = fundirContrato(antes, patch) as unknown as Record<string, unknown>;
    expect(r.comisionPorcentaje).toBe(8);
    expect(r.reglaDeCobro).toEqual({ plazoSinFijar: true });
  });
  it('un null que llega sí borra (es un dato, no una ausencia)', () => {
    const antes = { id: 'c1', diasDePlazo: 5 } as unknown as Contract;
    const r = fundirContrato(antes, { id: 'c1', diasDePlazo: null } as unknown as Contract);
    expect(r.diasDePlazo).toBeNull();
  });
});
