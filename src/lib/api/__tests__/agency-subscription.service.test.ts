/**
 * agency-subscription.service.test.ts — real agency subscription (Wompi PSE).
 *
 * Endpoints (on NEXT_PUBLIC_BACKEND_URL):
 *   GET  /inmobiliaria/subscription
 *   POST /inmobiliaria/subscription/select-plan
 *   POST /inmobiliaria/subscription/charges/:chargeId/pse-checkout
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { agencySubscriptionApi } from '../agency-subscription.service';
import type { ChargePseCheckoutDto } from '../agency-subscription.types';

function mockFetchOnce(body: unknown, status = 200) {
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response);
}

const BASE = 'http://localhost:3000';

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('agencySubscriptionApi.get', () => {
  it('GETs the agency subscription state', async () => {
    const fetchMock = mockFetchOnce({
      subscription: { id: 's1', agencyId: 'a1', planTier: 'PRO', status: 'PAST_DUE' },
      openCharge: { id: 'c1', amount: 149000, status: 'PENDING' },
      status: 'PAST_DUE',
      canOfferRentals: true,
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const res = await agencySubscriptionApi.get();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/inmobiliaria/subscription`);
    expect(init.method).toBe('GET');
    expect(res.openCharge?.id).toBe('c1');
    expect(res.status).toBe('PAST_DUE');
  });
});

describe('agencySubscriptionApi.selectPlan', () => {
  it('POSTs the plan tier and returns the PENDING charge for PRO', async () => {
    const fetchMock = mockFetchOnce({
      subscription: { id: 's1', agencyId: 'a1', planTier: 'PRO', status: 'PAST_DUE' },
      charge: { id: 'c1', amount: 149000, status: 'PENDING' },
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const res = await agencySubscriptionApi.selectPlan('PRO');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/inmobiliaria/subscription/select-plan`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ planTier: 'PRO' });
    expect(res.charge?.id).toBe('c1');
  });

  it('returns charge: null for a free STARTER selection', async () => {
    const fetchMock = mockFetchOnce({
      subscription: { id: 's1', agencyId: 'a1', planTier: 'STARTER', status: 'ACTIVE' },
      charge: null,
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const res = await agencySubscriptionApi.selectPlan('STARTER');
    expect(res.charge).toBeNull();
    expect(res.subscription.status).toBe('ACTIVE');
  });
});

describe('agencySubscriptionApi.chargePseCheckout', () => {
  const dto: ChargePseCheckoutDto = {
    userType: 'NATURAL',
    legalIdType: 'CC',
    legalId: '1020304050',
    financialInstitutionCode: '1051',
    email: 'admin@agencia.com',
    fullName: 'Admin Agencia',
  };

  it('POSTs to the charge pse-checkout path with the DTO', async () => {
    const fetchMock = mockFetchOnce({
      chargeId: 'c1',
      wompiTransactionId: 'wtx-1',
      asyncPaymentUrl: 'https://checkout.wompi.co/async/abc',
      status: 'PENDING',
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const res = await agencySubscriptionApi.chargePseCheckout('c1', dto);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/inmobiliaria/subscription/charges/c1/pse-checkout`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(dto);
    expect(res.asyncPaymentUrl).toBe('https://checkout.wompi.co/async/abc');
  });
});
