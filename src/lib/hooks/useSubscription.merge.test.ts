/**
 * useSubscription.merge.test.ts — contrato 29 · planes dinámicos (Fase C2).
 *
 * `mergeBackendIntoAgencyPlan` must build the AgencyPlan from the backend
 * columns — id = the real slug, prices/limits/evaluation from the backend — so
 * an admin-created slug (e.g. `pro-plus`) never inherits Starter's data. Legacy
 * slugs reuse their hand-written marketing bullets (presentation only).
 */

import { describe, it, expect } from 'vitest';
import { mergeBackendIntoAgencyPlan } from './useSubscription';
import { AGENCY_PLANS } from '@/lib/constants/subscription-plans';
import type { BackendSubscriptionPlan } from '@/lib/api/subscriptions.types';

function backendPlan(o: Partial<BackendSubscriptionPlan>): BackendSubscriptionPlan {
  return {
    id: o.tier ?? 'x',
    planType: 'AGENCY',
    tier: 'x',
    name: 'X',
    description: null,
    level: 0,
    monthlyPrice: 0,
    annualPrice: 0,
    maxProperties: 0,
    maxUsers: 0,
    maxScoringViews: 0,
    monthlyEvalCap: 0,
    monthlyCreditGrant: 0,
    billingMode: 'FLAT',
    usageFeeBps: 0,
    scoringIncluded: false,
    hasPremiumScoring: false,
    hasApiAccess: false,
    scoringViewPrice: 0,
    evaluationCreditPrice: 0,
    isDefault: false,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    ...o,
  };
}

const STARTER = AGENCY_PLANS.find((p) => p.id === 'starter')!;

describe('mergeBackendIntoAgencyPlan — admin-created slug uses backend columns', () => {
  it('keeps the real slug as id and pulls prices/limits from the backend, not Starter', () => {
    const result = mergeBackendIntoAgencyPlan(
      backendPlan({
        tier: 'pro-plus',
        name: 'Pro Plus',
        description: 'Plan pago custom',
        billingMode: 'FLAT',
        monthlyPrice: 250000,
        annualPrice: 2400000,
        maxProperties: 200,
        maxUsers: 20,
        evaluationCreditPrice: 15000,
        isDefault: false,
      }),
    );

    expect(result.id).toBe('pro-plus');
    expect(result.name).toBe('Pro Plus');
    expect(result.price.monthly).toBe(250000);
    expect(result.price.yearly).toBe(2400000);
    expect(result.limits.properties).toBe(200);
    expect(result.limits.users).toBe(20);
    expect(result.evaluation.price).toBe(15000);
    expect(result.pricingModel).toBe('flat');

    // Must NOT inherit Starter's data.
    expect(result.id).not.toBe('starter');
    expect(result.limits.properties).not.toBe(STARTER.limits.properties);
    expect(result.features).not.toEqual(STARTER.features);
  });

  it('represents a USAGE_CANON plan as a percentage of the canon', () => {
    const result = mergeBackendIntoAgencyPlan(
      backendPlan({
        tier: 'flex-2',
        billingMode: 'USAGE_CANON',
        usageFeeBps: 150, // 1.5%
        monthlyPrice: 0,
        annualPrice: 0,
      }),
    );

    expect(result.pricingModel).toBe('percentage');
    expect(result.canonPercentage).toBe(1.5);
    expect(result.price.monthly).toBeNull();
    expect(result.price.yearly).toBeNull();
  });

  it('maps -1 sentinels to unlimited (null) limits', () => {
    const result = mergeBackendIntoAgencyPlan(
      backendPlan({ tier: 'unlimited', maxProperties: -1, maxUsers: -1, monthlyEvalCap: -1 }),
    );

    expect(result.limits.properties).toBeNull();
    expect(result.limits.users).toBeNull();
    expect(result.evaluation.limit).toBeNull();
  });

  it('derives bullets from the backend columns even for a known legacy slug', () => {
    const proStatic = AGENCY_PLANS.find((p) => p.id === 'pro')!;
    // Backend `pro` is now UNLIMITED — the card must reflect that, NOT the stale
    // static "Hasta 100 propiedades / Hasta 10 usuarios / Hasta 30 evaluaciones".
    const result = mergeBackendIntoAgencyPlan(
      backendPlan({
        tier: 'pro',
        name: 'Pro',
        monthlyPrice: 149000,
        maxProperties: -1,
        maxUsers: -1,
        monthlyEvalCap: -1,
        evaluationCreditPrice: 0,
      }),
    );

    expect(result.id).toBe('pro');
    // Must NOT reuse the static bullets — they contradict the backend columns.
    expect(result.features).not.toEqual(proStatic.features);
    expect(result.features).toContain('Propiedades ilimitadas');
    expect(result.features).toContain('Usuarios ilimitados');
    expect(result.features.some((f) => /Hasta 100|Hasta 10 usuarios|Hasta 30/.test(f))).toBe(false);
    // Prices still come from the backend.
    expect(result.price.monthly).toBe(149000);
  });

  it('shows the real percentage for a USAGE_CANON plan (10% = 1000 bps)', () => {
    const result = mergeBackendIntoAgencyPlan(
      backendPlan({ tier: 'flex', billingMode: 'USAGE_CANON', usageFeeBps: 1000, monthlyPrice: 0 }),
    );
    expect(result.canonPercentage).toBe(10);
    expect(result.features).toContain('Evaluaciones AI ilimitadas incluidas');
  });
});
