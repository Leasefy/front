/**
 * pse-checkout.service.test.ts — real PSE (Wompi) checkout for tenant rent.
 *
 * Endpoints (on NEXT_PUBLIC_BACKEND_URL, NOT /pse-mock):
 *   GET  /leases/pse/financial-institutions
 *   POST /leases/:leaseId/pse/checkout
 *   GET  /leases/:leaseId/payment-requests/:requestId
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pseCheckoutApi } from '../pse-checkout.service';
import type { PseCheckoutDto } from '../pse-checkout.types';

function mockFetchOnce(body: unknown, status = 200) {
  // apiClient reads res.text() then JSON.parse (never res.json()).
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response);
}

// apiClient binds BACKEND_URL at import time; env has no override → built-in default.
const BASE = 'http://localhost:3000';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('pseCheckoutApi.getFinancialInstitutions', () => {
  it('GETs the live PSE bank catalog', async () => {
    const banks = [
      { financial_institution_code: '1051', financial_institution_name: 'Bancolombia' },
      { financial_institution_code: '1007', financial_institution_name: 'Bancolombia (otro)' },
    ];
    const fetchMock = mockFetchOnce(banks);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const result = await pseCheckoutApi.getFinancialInstitutions();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/leases/pse/financial-institutions`);
    expect(init.method).toBe('GET');
    expect(result[0].financial_institution_code).toBe('1051');
  });
});

describe('pseCheckoutApi.checkout', () => {
  const dto: PseCheckoutDto = {
    amount: 1_500_000,
    periodMonth: 7,
    periodYear: 2026,
    userType: 'NATURAL',
    legalIdType: 'CC',
    legalId: '1020304050',
    financialInstitutionCode: '1051',
    email: 'tenant@example.com',
    fullName: 'Juan Pérez',
  };

  it('POSTs to the lease checkout path with the full DTO', async () => {
    const fetchMock = mockFetchOnce({
      paymentRequestId: 'req-1',
      wompiTransactionId: 'wtx-1',
      asyncPaymentUrl: 'https://checkout.wompi.co/async/abc',
      status: 'PROCESSING',
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const res = await pseCheckoutApi.checkout('lease-1', dto);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/leases/lease-1/pse/checkout`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(dto);
    expect(res.paymentRequestId).toBe('req-1');
    expect(res.asyncPaymentUrl).toBe('https://checkout.wompi.co/async/abc');
    expect(res.status).toBe('PROCESSING');
  });

  it('surfaces a null asyncPaymentUrl (URL not ready yet)', async () => {
    const fetchMock = mockFetchOnce({
      paymentRequestId: 'req-2',
      wompiTransactionId: 'wtx-2',
      asyncPaymentUrl: null,
      status: 'PROCESSING',
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const res = await pseCheckoutApi.checkout('lease-1', dto);
    expect(res.asyncPaymentUrl).toBeNull();
  });
});

describe('pseCheckoutApi.getRequestStatus', () => {
  it('GETs the single payment-request path for polling', async () => {
    const fetchMock = mockFetchOnce({
      id: 'req-1',
      leaseId: 'lease-1',
      amount: 1_500_000,
      status: 'APPROVED',
      paymentId: 'pay-1',
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const res = await pseCheckoutApi.getRequestStatus('lease-1', 'req-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/leases/lease-1/payment-requests/req-1`);
    expect(init.method).toBe('GET');
    expect(res.status).toBe('APPROVED');
    expect(res.paymentId).toBe('pay-1');
  });
});
