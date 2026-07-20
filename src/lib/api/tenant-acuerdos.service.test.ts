import { describe, it, expect, vi, afterEach } from 'vitest';
import { acuerdosApi, AcuerdoUnavailableError } from './tenant-acuerdos.service';
import type {
  AcuerdoDetail,
  AcuerdoAcceptResult,
  AcuerdoAcceptInput,
} from './tenant-acuerdos.types';

// A fully-typed server plan record — proves listMine returns the array as-is and
// that saldo/cuota figures are read verbatim from the agent record (never fabricated).
const PLAN: AcuerdoDetail = {
  planId: 'plan-1',
  tenantId: 'tenant-1',
  debtorId: 'debtor-1',
  stage: 'S2',
  status: 'offered',
  paymentProvider: 'wompi',
  paymentUrl: 'https://checkout.wompi.co/l/plan-1',
  totalDueCop: 1_500_000,
  initialAmountCop: 500_000,
  discountAppliedPct: 0,
  discountKind: 'none',
  offeredAt: '2026-07-01T14:00:00.000Z',
  acceptedAt: null,
  defaultedAt: null,
  installments: [
    { number: 1, dueDate: '2026-08-01', amountCop: 500_000, status: 'pending', paidAt: null },
    { number: 2, dueDate: '2026-09-01', amountCop: 500_000, status: 'pending', paidAt: null },
  ],
};

// The agent's accept response — status comes from the AGENT, never set optimistically.
const ACCEPT_RESULT: AcuerdoAcceptResult = {
  planId: 'plan-1',
  status: 'active',
  acceptedAt: '2026-07-02T10:00:00.000Z',
};

const ACCEPT_INPUT: AcuerdoAcceptInput = {
  signatureData: 'data:image/png;base64,iVBORw0KGgo=',
  otpVerificationToken: 'otp-token-xyz',
};

/**
 * Mock a resolved fetch Response. apiClient reads `res.text()` for success bodies
 * and `res.json()` for error bodies, so both are provided.
 */
function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
}

/** Mock fetch REJECTING (network failure) → apiClient wraps it as ApiError(0). */
function mockNetworkFailure() {
  return vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
}

/** Asserts a fetch call never used the agency-scoped IDOR path (A6). */
function expectBffOnly(url: string) {
  expect(url).not.toContain('/api/agency/');
  expect(url).toContain('/cartera/payment-plans');
}

describe('acuerdosApi.listMine', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns the array as-is on 200', async () => {
    globalThis.fetch = mockFetch(200, [PLAN]);
    const res = await acuerdosApi.listMine();
    expect(res).toHaveLength(1);
    expect(res[0].planId).toBe('plan-1');
    expect(res[0].totalDueCop).toBe(1_500_000);
  });

  it('degrades to [] on 404 (route absent) — never a fabricated acuerdo', async () => {
    globalThis.fetch = mockFetch(404, { message: 'not found' });
    expect(await acuerdosApi.listMine()).toEqual([]);
  });

  it('degrades to [] on 403 (not wired for this tenant)', async () => {
    globalThis.fetch = mockFetch(403, { message: 'forbidden' });
    expect(await acuerdosApi.listMine()).toEqual([]);
  });

  it('degrades to [] on network failure (ApiError status 0)', async () => {
    globalThis.fetch = mockNetworkFailure();
    expect(await acuerdosApi.listMine()).toEqual([]);
  });

  it('rethrows any other status (e.g. 500) — does NOT swallow it', async () => {
    globalThis.fetch = mockFetch(500, { message: 'boom' });
    await expect(acuerdosApi.listMine()).rejects.toThrow();
  });

  it('routes through the BFF, never the agency /api/agency path (A6)', async () => {
    const f = mockFetch(200, [PLAN]);
    globalThis.fetch = f;
    await acuerdosApi.listMine();
    for (const call of f.mock.calls) expectBffOnly(String(call[0]));
  });
});

describe('acuerdosApi.getMine (resolve-from-list, anti-IDOR)', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns the matching own plan from the /mine list', async () => {
    globalThis.fetch = mockFetch(200, [PLAN]);
    const res = await acuerdosApi.getMine('plan-1');
    expect(res?.planId).toBe('plan-1');
  });

  it('returns null for an unknown planId (no fabricated acuerdo)', async () => {
    globalThis.fetch = mockFetch(200, [PLAN]);
    expect(await acuerdosApi.getMine('plan-999')).toBeNull();
  });

  it('NEVER issues a fetch-by-id — only hits the /mine list route', async () => {
    const f = mockFetch(200, [PLAN]);
    globalThis.fetch = f;
    await acuerdosApi.getMine('plan-1');
    for (const call of f.mock.calls) {
      const url = String(call[0]);
      expect(url).toContain('/cartera/payment-plans/mine');
      expect(url).not.toContain('/cartera/payment-plans/plan-1');
    }
  });

  it('returns null when the endpoint is not live (list degraded to [])', async () => {
    globalThis.fetch = mockFetch(404, { message: 'not found' });
    expect(await acuerdosApi.getMine('plan-1')).toBeNull();
  });
});

describe('acuerdosApi.getCuotaPaymentUrl (server-provided URL only)', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns the server paymentUrl string on 200', async () => {
    globalThis.fetch = mockFetch(200, { paymentUrl: 'https://checkout.wompi.co/l/cuota-1' });
    expect(await acuerdosApi.getCuotaPaymentUrl('plan-1', 1)).toBe(
      'https://checkout.wompi.co/l/cuota-1',
    );
  });

  it('returns null on 404 (never a fabricated checkout URL)', async () => {
    globalThis.fetch = mockFetch(404, { message: 'not found' });
    expect(await acuerdosApi.getCuotaPaymentUrl('plan-1', 1)).toBeNull();
  });

  it('returns null on 403', async () => {
    globalThis.fetch = mockFetch(403, { message: 'forbidden' });
    expect(await acuerdosApi.getCuotaPaymentUrl('plan-1', 1)).toBeNull();
  });

  it('returns null on network failure (status 0)', async () => {
    globalThis.fetch = mockNetworkFailure();
    expect(await acuerdosApi.getCuotaPaymentUrl('plan-1', 1)).toBeNull();
  });

  it('rethrows any other status (e.g. 500)', async () => {
    globalThis.fetch = mockFetch(500, { message: 'boom' });
    await expect(acuerdosApi.getCuotaPaymentUrl('plan-1', 1)).rejects.toThrow();
  });

  it('routes through the BFF, never the agency /api/agency path (A6)', async () => {
    const f = mockFetch(200, { paymentUrl: 'https://x' });
    globalThis.fetch = f;
    await acuerdosApi.getCuotaPaymentUrl('plan-1', 1);
    for (const call of f.mock.calls) expectBffOnly(String(call[0]));
  });
});

describe('acuerdosApi.accept', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns the agent CarteraPaymentPlanAcceptResponse verbatim on 200 (no optimistic status)', async () => {
    globalThis.fetch = mockFetch(200, ACCEPT_RESULT);
    const res = await acuerdosApi.accept('plan-1', ACCEPT_INPUT);
    // status comes from the AGENT — the client never fabricates "active"/"aceptado".
    expect(res.status).toBe('active');
    expect(res.planId).toBe('plan-1');
    expect(res.acceptedAt).toBe('2026-07-02T10:00:00.000Z');
  });

  it('POSTs the accept body to the BFF plan-accept route (no agency path)', async () => {
    const f = mockFetch(200, ACCEPT_RESULT);
    globalThis.fetch = f;
    await acuerdosApi.accept('plan-1', ACCEPT_INPUT);
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain('/cartera/payment-plans/plan-1/accept');
    expect(String(url)).not.toContain('/api/agency/');
    expect(init?.method).toBe('POST');
  });

  it('throws AcuerdoUnavailableError on 404 (no fake "aceptado")', async () => {
    globalThis.fetch = mockFetch(404, { message: 'not found' });
    await expect(acuerdosApi.accept('plan-1', ACCEPT_INPUT)).rejects.toBeInstanceOf(
      AcuerdoUnavailableError,
    );
  });

  it('throws AcuerdoUnavailableError on 403', async () => {
    globalThis.fetch = mockFetch(403, { message: 'forbidden' });
    await expect(acuerdosApi.accept('plan-1', ACCEPT_INPUT)).rejects.toBeInstanceOf(
      AcuerdoUnavailableError,
    );
  });

  it('throws AcuerdoUnavailableError on network failure (status 0)', async () => {
    globalThis.fetch = mockNetworkFailure();
    await expect(acuerdosApi.accept('plan-1', ACCEPT_INPUT)).rejects.toBeInstanceOf(
      AcuerdoUnavailableError,
    );
  });

  it('rethrows the raw ApiError on any other status (e.g. 500)', async () => {
    globalThis.fetch = mockFetch(500, { message: 'boom' });
    await expect(acuerdosApi.accept('plan-1', ACCEPT_INPUT)).rejects.not.toBeInstanceOf(
      AcuerdoUnavailableError,
    );
    await expect(acuerdosApi.accept('plan-1', ACCEPT_INPUT)).rejects.toThrow();
  });
});

describe('acuerdosApi.requestPremoraPlan', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns the server ack on 200', async () => {
    globalThis.fetch = mockFetch(200, { requestId: 'req-1' });
    const res = await acuerdosApi.requestPremoraPlan({ leaseId: 'lease-1' });
    expect(res.requestId).toBe('req-1');
  });

  it('sends ONLY { leaseId } to the BFF request route (intent-only, no agency path)', async () => {
    const f = mockFetch(200, { requestId: 'req-1' });
    globalThis.fetch = f;
    await acuerdosApi.requestPremoraPlan({ leaseId: 'lease-1' });
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain('/cartera/payment-plans/request');
    expect(String(url)).not.toContain('/api/agency/');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ leaseId: 'lease-1' });
  });

  it('throws AcuerdoUnavailableError on 404 (no fabricated plan)', async () => {
    globalThis.fetch = mockFetch(404, { message: 'not found' });
    await expect(
      acuerdosApi.requestPremoraPlan({ leaseId: 'lease-1' }),
    ).rejects.toBeInstanceOf(AcuerdoUnavailableError);
  });

  it('throws AcuerdoUnavailableError on 403', async () => {
    globalThis.fetch = mockFetch(403, { message: 'forbidden' });
    await expect(
      acuerdosApi.requestPremoraPlan({ leaseId: 'lease-1' }),
    ).rejects.toBeInstanceOf(AcuerdoUnavailableError);
  });

  it('throws AcuerdoUnavailableError on network failure (status 0)', async () => {
    globalThis.fetch = mockNetworkFailure();
    await expect(
      acuerdosApi.requestPremoraPlan({ leaseId: 'lease-1' }),
    ).rejects.toBeInstanceOf(AcuerdoUnavailableError);
  });

  it('rethrows the raw ApiError on any other status (e.g. 500)', async () => {
    globalThis.fetch = mockFetch(500, { message: 'boom' });
    await expect(
      acuerdosApi.requestPremoraPlan({ leaseId: 'lease-1' }),
    ).rejects.toThrow();
  });
});
