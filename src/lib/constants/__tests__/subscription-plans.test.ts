/**
 * subscription-plans.test.ts — `agencyPlanToDisplayPlan` maps a live-catalog
 * `AgencyPlan` (see `useAgencyPlans()`) into the generic `Plan` shape the
 * landlord-oriented UI (PlanHeader's popover) renders, so an admin-created
 * tier (contrato 29, e.g. "pro-plus") displays with its REAL name/features
 * instead of silently falling back to Starter.
 */
import { describe, it, expect } from 'vitest';
import { agencyPlanToDisplayPlan, getPlanById } from '../subscription-plans';
import type { AgencyPlan } from '@/lib/types/subscription';

const PRO_PLUS: AgencyPlan = {
  id: 'pro-plus',
  name: 'Pro Plus',
  description: 'Todo en Pro, más cupo',
  pricingModel: 'flat',
  price: { monthly: 249000, yearly: null },
  evaluation: { price: 15000, discount: 64, limit: 60 },
  canonPercentage: undefined,
  limits: { properties: 200, users: 20 },
  features: ['Hasta 200 propiedades', 'Hasta 20 usuarios', 'Scoring premium'],
  level: 2,
  isDefault: false,
};

describe('agencyPlanToDisplayPlan', () => {
  it('maps the live catalog plan into a Plan with every feature marked included', () => {
    const plan = agencyPlanToDisplayPlan(PRO_PLUS);
    expect(plan.id).toBe('pro-plus');
    expect(plan.name).toBe('Pro Plus');
    expect(plan.description).toBe('Todo en Pro, más cupo');
    expect(plan.price).toEqual({ monthly: 249000, yearly: 0 });
    expect(plan.features).toHaveLength(3);
    expect(plan.features.every((f) => f.included)).toBe(true);
    expect(plan.features.map((f) => f.name)).toEqual([
      'Hasta 200 propiedades',
      'Hasta 20 usuarios',
      'Scoring premium',
    ]);
  });

  it('defaults null monthly/yearly price to 0 (percentage/custom plans)', () => {
    const plan = agencyPlanToDisplayPlan({
      ...PRO_PLUS,
      id: 'flex',
      price: { monthly: null, yearly: null },
    });
    expect(plan.price).toEqual({ monthly: 0, yearly: 0 });
  });
});

describe('getPlanById — regression (unaffected by the agencyPlanToDisplayPlan extraction)', () => {
  it('still resolves a landlord plan by id', () => {
    expect(getPlanById('pro').name).toBe('Propietario');
  });

  it('still falls back to the static AGENCY_PLANS entry for a known agency tier', () => {
    expect(getPlanById('flex').name).toBe('Flex');
  });

  it('still falls back to Starter for an unknown id', () => {
    expect(getPlanById('unknown-tier').id).toBe('starter');
  });
});
