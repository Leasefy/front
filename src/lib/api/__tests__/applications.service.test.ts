/**
 * applications.service.test.ts — focused tests for getEvaluationResult normalization
 *
 * Coverage:
 *   (1) credit_check at root level → preserved as-is
 *   (2) credit_check under nested `result` object → lifted to root
 *   (3) absent credit_check → credit_check undefined in result
 *   (4) old evaluation without credit_check field → credit_check undefined
 *   (5) score and level normalization still work alongside credit_check
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { landlordApplicationsApi, applicationsApi } from '../applications.service';
import { ApiError } from '../client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockApiGet(body: unknown) {
  // apiClient.get uses res.text() then JSON.parse — not res.json().
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
}

const BASE_COMPLETED = {
  applicationId: 'app-123',
  status: 'COMPLETED',
  score: 78,
  level: 'B',
  totalScore: 78,
};

const SAMPLE_CREDIT_CHECK = {
  status: 'approved',
  bureauScore: 832,
  monthlyCapacity: 2500000,
  reasonCode: null,
  progressPercentage: null,
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── createGuest — T-0038 §3.3 (WU-2) PROPIEDAD_EN_VENTA code forwarding ──────

describe('applicationsApi.createGuest — forwards the backend error code', () => {
  it('forwards code: PROPIEDAD_EN_VENTA on a 409 (sale-listing postulación gate)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        statusCode: 409,
        message: 'Esta propiedad está en venta. No se puede postular: contactá a la inmobiliaria por chat o agendá una visita.',
        code: 'PROPIEDAD_EN_VENTA',
      }),
    } as unknown as Response);

    await expect(
      applicationsApi.createGuest({ propertyId: 'p1' } as Parameters<typeof applicationsApi.createGuest>[0]),
    ).rejects.toMatchObject({
      status: 409,
      code: 'PROPIEDAD_EN_VENTA',
      message: 'Esta propiedad está en venta. No se puede postular: contactá a la inmobiliaria por chat o agendá una visita.',
    });
  });

  it('rejects with an ApiError instance carrying the code, not just a plain error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ message: 'x', code: 'PROPIEDAD_EN_VENTA' }),
    } as unknown as Response);

    try {
      await applicationsApi.createGuest({ propertyId: 'p1' } as Parameters<typeof applicationsApi.createGuest>[0]);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe('PROPIEDAD_EN_VENTA');
    }
  });

  it('leaves code undefined when the backend does not send one (regression)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Datos inválidos' }),
    } as unknown as Response);

    try {
      await applicationsApi.createGuest({ propertyId: 'p1' } as Parameters<typeof applicationsApi.createGuest>[0]);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as ApiError).code).toBeUndefined();
    }
  });
});

// ── (1) credit_check at root level ───────────────────────────────────────────

describe('getEvaluationResult — credit_check at root level', () => {
  it('preserves credit_check from root when present', async () => {
    globalThis.fetch = mockApiGet({
      ...BASE_COMPLETED,
      credit_check: SAMPLE_CREDIT_CHECK,
    }) as typeof globalThis.fetch;

    const result = await landlordApplicationsApi.getEvaluationResult('app-123');

    expect(result.credit_check).toBeDefined();
    expect(result.credit_check?.status).toBe('approved');
    expect(result.credit_check?.bureauScore).toBe(832);
    expect(result.credit_check?.monthlyCapacity).toBe(2500000);
    expect(result.credit_check?.reasonCode).toBeNull();
    expect(result.credit_check?.progressPercentage).toBeNull();
  });
});

// ── (2) credit_check nested under result ─────────────────────────────────────

describe('getEvaluationResult — credit_check nested under result', () => {
  it('lifts credit_check from nested result object', async () => {
    globalThis.fetch = mockApiGet({
      applicationId: 'app-123',
      status: 'COMPLETED',
      result: {
        score: 78,
        level: 'B',
        credit_check: SAMPLE_CREDIT_CHECK,
      },
    }) as typeof globalThis.fetch;

    const result = await landlordApplicationsApi.getEvaluationResult('app-123');

    expect(result.credit_check).toBeDefined();
    expect(result.credit_check?.status).toBe('approved');
    expect(result.credit_check?.bureauScore).toBe(832);
  });
});

// ── (3) absent credit_check → undefined ──────────────────────────────────────

describe('getEvaluationResult — absent credit_check', () => {
  it('returns credit_check as undefined when field is absent', async () => {
    globalThis.fetch = mockApiGet(BASE_COMPLETED) as typeof globalThis.fetch;

    const result = await landlordApplicationsApi.getEvaluationResult('app-123');

    expect(result.credit_check).toBeUndefined();
  });
});

// ── (4) old evaluation without credit_check ───────────────────────────────────

describe('getEvaluationResult — old evaluation payload', () => {
  it('does not add credit_check when backend omits it (old evaluation)', async () => {
    globalThis.fetch = mockApiGet({
      applicationId: 'app-old',
      status: 'COMPLETED',
      totalScore: 55,
      level: 'C',
      subscores: {
        financialStability: 60,
        rentalHistory: 50,
      },
    }) as typeof globalThis.fetch;

    const result = await landlordApplicationsApi.getEvaluationResult('app-old');

    expect(result.credit_check).toBeUndefined();
    expect(result.totalScore).toBe(55);
    expect(result.level).toBe('C');
  });
});

// ── (5) score/level normalization alongside credit_check ─────────────────────

describe('getEvaluationResult — score normalization with credit_check present', () => {
  it('normalizes status to lowercase and preserves score + credit_check', async () => {
    globalThis.fetch = mockApiGet({
      applicationId: 'app-123',
      status: 'COMPLETED',
      score: 85,
      level: 'A',
      credit_check: {
        status: 'rejected_income',
        bureauScore: null,
        monthlyCapacity: null,
        reasonCode: 'declared_income_insufficient',
        progressPercentage: null,
      },
    }) as typeof globalThis.fetch;

    const result = await landlordApplicationsApi.getEvaluationResult('app-123');

    expect(result.status).toBe('completed');
    expect(result.totalScore).toBe(85);
    expect(result.level).toBe('A');
    expect(result.credit_check?.status).toBe('rejected_income');
    expect(result.credit_check?.reasonCode).toBe('declared_income_insufficient');
  });

  it('credit_check awaiting_authorization preserves progressPercentage', async () => {
    globalThis.fetch = mockApiGet({
      ...BASE_COMPLETED,
      credit_check: {
        status: 'awaiting_authorization',
        bureauScore: null,
        monthlyCapacity: null,
        reasonCode: 'awaiting_habeas_data',
        progressPercentage: 20,
      },
    }) as typeof globalThis.fetch;

    const result = await landlordApplicationsApi.getEvaluationResult('app-123');

    expect(result.credit_check?.status).toBe('awaiting_authorization');
    expect(result.credit_check?.progressPercentage).toBe(20);
  });
});

// ============================================================================
// protection_options normalization
// ============================================================================

const SAMPLE_PROTECTION_OPTIONS = [
  {
    carrier: 'fianly',
    productType: 'fianza',
    status: 'available',
    monthlyPremiumCop: 85000,
    isDemo: true,
    rejectionReason: null,
    maxBackedCanonCop: 1500000,
  },
  {
    carrier: 'sura',
    productType: 'seguro',
    status: 'not_available',
    monthlyPremiumCop: null,
    isDemo: false,
    rejectionReason: 'Score inferior al mínimo requerido',
    maxBackedCanonCop: null,
  },
];

// ── (6) protection_options at root level ─────────────────────────────────────

describe('getEvaluationResult — protection_options at root level', () => {
  it('preserves protection_options array from root when present', async () => {
    globalThis.fetch = mockApiGet({
      ...BASE_COMPLETED,
      protection_options: SAMPLE_PROTECTION_OPTIONS,
    }) as typeof globalThis.fetch;

    const result = await landlordApplicationsApi.getEvaluationResult('app-123');

    expect(result.protection_options).toBeDefined();
    expect(result.protection_options).toHaveLength(2);
    expect(result.protection_options![0].carrier).toBe('fianly');
    expect(result.protection_options![0].productType).toBe('fianza');
    expect(result.protection_options![0].status).toBe('available');
    expect(result.protection_options![0].monthlyPremiumCop).toBe(85000);
    expect(result.protection_options![0].isDemo).toBe(true);
    expect(result.protection_options![0].maxBackedCanonCop).toBe(1500000);
    expect(result.protection_options![1].carrier).toBe('sura');
    expect(result.protection_options![1].rejectionReason).toBe('Score inferior al mínimo requerido');
  });
});

// ── (7) protection_options nested under result ────────────────────────────────

describe('getEvaluationResult — protection_options nested under result', () => {
  it('lifts protection_options from nested result object', async () => {
    globalThis.fetch = mockApiGet({
      applicationId: 'app-123',
      status: 'COMPLETED',
      result: {
        score: 78,
        level: 'B',
        protection_options: SAMPLE_PROTECTION_OPTIONS,
      },
    }) as typeof globalThis.fetch;

    const result = await landlordApplicationsApi.getEvaluationResult('app-123');

    expect(result.protection_options).toBeDefined();
    expect(result.protection_options).toHaveLength(2);
    expect(result.protection_options![0].carrier).toBe('fianly');
  });
});

// ── (8) absent protection_options → undefined ─────────────────────────────────

describe('getEvaluationResult — absent protection_options (old evaluation)', () => {
  it('returns protection_options as undefined when field is absent', async () => {
    globalThis.fetch = mockApiGet(BASE_COMPLETED) as typeof globalThis.fetch;

    const result = await landlordApplicationsApi.getEvaluationResult('app-123');

    expect(result.protection_options).toBeUndefined();
  });

  it('does not add protection_options on old evaluation payload without the field', async () => {
    globalThis.fetch = mockApiGet({
      applicationId: 'app-old',
      status: 'COMPLETED',
      totalScore: 55,
      level: 'C',
      subscores: { financialStability: 60 },
    }) as typeof globalThis.fetch;

    const result = await landlordApplicationsApi.getEvaluationResult('app-old');

    expect(result.protection_options).toBeUndefined();
    expect(result.totalScore).toBe(55);
  });
});
