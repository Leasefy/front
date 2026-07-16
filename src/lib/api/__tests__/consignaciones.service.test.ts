/**
 * consignaciones.service.test.ts — consignacionesApi wired to the real backend contract.
 *
 * Coverage:
 *   (1) update uses PUT /inmobiliaria/consignaciones/:id (backend route is @Put, not PATCH)
 *   (2) update maps front payload → UpdateConsignacionDto: propertyType/status/availability
 *       to UPPER_SNAKE and STRIPS `agenteId` (not whitelisted; backend key is agenteUserId)
 *   (3) responses are normalized: UPPER enums → lowercase, agenteUserId → agenteId
 *   (4) getById/getAll normalize too; getAll accepts the plain array the backend returns
 *   (5) delete issues DELETE
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { consignacionesApi, normalizeConsignacion } from '../inmobiliaria.service';
import { setAccessToken } from '../client';

const BACKEND_ROW = {
  id: 'con-1',
  propietarioId: 'prop-1',
  agenteUserId: 'user-9',
  propertyTitle: 'Apto Chapinero',
  propertyAddress: 'Calle 53 #13-45',
  propertyCity: 'Bogotá',
  propertyZone: 'Chapinero',
  propertyType: 'APARTMENT',
  monthlyRent: 3200000,
  adminFee: 250000,
  commissionPercent: 10,
  contractDate: '2026-01-15T00:00:00.000Z',
  status: 'ACTIVE',
  availability: 'AVAILABLE',
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
};

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init;
  const fn = vi.fn().mockResolvedValueOnce({
    ok,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
  globalThis.fetch = fn as typeof globalThis.fetch;
  return fn;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
  setAccessToken('test-token');
});

afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

// ── (1)(2) update: PUT + DTO mapping ─────────────────────────────────────────

describe('consignacionesApi.update', () => {
  it('PUTs to /inmobiliaria/consignaciones/:id (not PATCH)', async () => {
    const fetchMock = mockFetchOnce(BACKEND_ROW);

    await consignacionesApi.update('con-1', { propertyTitle: 'Nuevo título' });

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/consignaciones/con-1')).toBe(true);
    expect(opts.method).toBe('PUT');
  });

  it('maps propertyType/status/availability to backend UPPER_SNAKE enums', async () => {
    const fetchMock = mockFetchOnce(BACKEND_ROW);

    await consignacionesApi.update('con-1', {
      propertyType: 'apartment',
      status: 'terminated',
      availability: 'in_process',
      monthlyRent: 3500000,
    });

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.propertyType).toBe('APARTMENT');
    expect(body.status).toBe('TERMINATED');
    expect(body.availability).toBe('IN_PROCESS');
    expect(body.monthlyRent).toBe(3500000);
  });

  it('strips agenteId (backend whitelist would 400; key mismatch agenteUserId)', async () => {
    const fetchMock = mockFetchOnce(BACKEND_ROW);

    await consignacionesApi.update('con-1', {
      propertyTitle: 'T',
      agenteId: 'member-1',
    });

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.agenteId).toBeUndefined();
    expect(body.agenteUserId).toBeUndefined();
    expect(body.propertyTitle).toBe('T');
  });

  // ── (3) response normalization ─────────────────────────────────────────────

  it('normalizes the backend row: lowercase enums, agenteUserId → agenteId', async () => {
    mockFetchOnce({ ...BACKEND_ROW, status: 'TERMINATED', availability: 'RENTED' });

    const result = await consignacionesApi.update('con-1', { status: 'terminated' });

    expect(result.status).toBe('terminated');
    expect(result.availability).toBe('rented');
    expect(result.propertyType).toBe('apartment');
    expect(result.agenteId).toBe('user-9');
  });
});

// ── (4) reads normalize ──────────────────────────────────────────────────────

describe('consignacionesApi reads', () => {
  it('getById normalizes enum casing', async () => {
    mockFetchOnce(BACKEND_ROW);

    const result = await consignacionesApi.getById('con-1');

    expect(result.status).toBe('active');
    expect(result.availability).toBe('available');
    expect(result.propertyType).toBe('apartment');
    expect(result.agenteId).toBe('user-9');
  });

  it('getAll accepts the plain array the backend returns and normalizes rows', async () => {
    mockFetchOnce([BACKEND_ROW]);

    const result = await consignacionesApi.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].availability).toBe('available');
  });
});

// ── (5) delete ───────────────────────────────────────────────────────────────

describe('consignacionesApi.delete', () => {
  it('DELETEs /inmobiliaria/consignaciones/:id', async () => {
    const fetchMock = mockFetchOnce({});

    await consignacionesApi.delete('con-1');

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/consignaciones/con-1')).toBe(true);
    expect(opts.method).toBe('DELETE');
  });
});

describe('normalizeConsignacion', () => {
  it('passes already-lowercase rows through unchanged', () => {
    const row = normalizeConsignacion({
      ...BACKEND_ROW,
      status: 'active',
      availability: 'rented',
      propertyType: 'house',
      agenteUserId: undefined,
      agenteId: 'user-3',
    } as never);

    expect(row.status).toBe('active');
    expect(row.availability).toBe('rented');
    expect(row.propertyType).toBe('house');
    expect(row.agenteId).toBe('user-3');
  });
});
