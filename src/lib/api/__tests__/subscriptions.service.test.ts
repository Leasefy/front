/**
 * subscriptions.service.test.ts — contrato 29 · planes dinámicos (Fase C3).
 *
 * `mapSubscription` (via getMySubscription) must PRESERVE the real backend tier
 * slug as `planId`, instead of collapsing anything outside {starter,pro,flex} to
 * 'starter'. Admin-created slugs (e.g. `pro-plus`) must survive.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { subscriptionsApi, mapBootstrapSubscription } from '../subscriptions.service';
import type { BackendSubscriptionMeResponse } from '../subscriptions.types';

function mockFetchOnce(body: unknown, status = 200) {
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response);
}

function meEnvelope(tier: string) {
  return {
    subscription: {
      id: 's1',
      userId: 'u1',
      planId: 'uuid-plan-config',
      status: 'ACTIVE',
      cycle: 'monthly',
      plan: { id: 'uuid-plan-config', planType: 'AGENCY', tier, name: tier, monthlyPrice: 0, annualPrice: 0 },
    },
  };
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('subscriptionsApi.getMySubscription — tier slug is preserved', () => {
  it('preserves an admin-created slug as planId (no collapse to starter)', async () => {
    globalThis.fetch = mockFetchOnce(meEnvelope('PRO-PLUS')) as typeof globalThis.fetch;

    const res = await subscriptionsApi.getMySubscription();

    expect(res.planId).toBe('pro-plus');
  });

  it('keeps the legacy tiers lowercased', async () => {
    globalThis.fetch = mockFetchOnce(meEnvelope('FLEX')) as typeof globalThis.fetch;

    const res = await subscriptionsApi.getMySubscription();

    expect(res.planId).toBe('flex');
  });

  it('falls back to starter when the backend tier is empty', async () => {
    globalThis.fetch = mockFetchOnce(meEnvelope('')) as typeof globalThis.fetch;

    const res = await subscriptionsApi.getMySubscription();

    expect(res.planId).toBe('starter');
  });
});

describe('mapBootstrapSubscription — T-0082 WU-2b, reused by the login bootstrap seed', () => {
  it('maps the same envelope shape getMySubscription maps, byte-identical', () => {
    const result = mapBootstrapSubscription(meEnvelope('PRO-PLUS') as BackendSubscriptionMeResponse);
    expect(result?.planId).toBe('pro-plus');
  });

  it('returns null for a null response — never invents FREE_SUBSCRIPTION', () => {
    expect(mapBootstrapSubscription(null)).toBeNull();
  });

  it('returns null when the envelope has no subscription row (malformed/absent)', () => {
    expect(mapBootstrapSubscription({ subscription: null })).toBeNull();
  });
});
