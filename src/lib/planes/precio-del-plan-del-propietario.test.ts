import { describe, expect, it } from 'vitest';

import { getPlanById, PLANS } from '@/lib/constants/subscription-plans';

import { conPrecioDelBack, precioLegible } from './precio-del-plan-del-propietario';

describe('el precio del plan del propietario lo dice el back (QA 23-09)', () => {
  it('🔴 el front no tiene cifras propias para los planes pagos', () => {
    for (const plan of PLANS.filter((p) => p.id !== 'starter')) {
      expect(plan.price).toEqual({ monthly: null, yearly: null });
    }
  });

  it('se toma el precio del back, emparejando por tier', () => {
    const plan = conPrecioDelBack(getPlanById('pro'), [
      { tier: 'pro', monthlyPrice: 149_000, annualPrice: 1_430_000 },
    ]);
    expect(plan.price).toEqual({ monthly: 149_000, yearly: 1_430_000 });
  });

  it('sin la fila del back, «—» y nunca «$ 0»', () => {
    const plan = conPrecioDelBack(getPlanById('pro'), []);
    expect(precioLegible(plan.price.monthly)).toBe('—');
    expect(precioLegible(149_000)).toContain('149.000');
  });
});
