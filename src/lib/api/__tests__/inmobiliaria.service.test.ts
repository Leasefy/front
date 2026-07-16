/**
 * inmobiliaria.service.test.ts — agency profile + logo endpoints.
 *
 * Coverage:
 *   (1) agencyApi.getMyAgency → GET /inmobiliaria/agency
 *   (2) agencyApi.updateAgency → PUT /inmobiliaria/agency with only the given fields
 *   (3) agencyApi.uploadAgencyLogo → POST multipart (field `file`) to /inmobiliaria/agency/logo
 *   (4) uploadAgencyLogo error path → ApiError with the backend message
 *   (5) the phantom PATCH /inmobiliaria/config* mutations are gone
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { agencyApi, inmobiliariaConfigApi } from '../inmobiliaria.service';
import { ApiError, setAccessToken } from '../client';

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

// ── (1) getMyAgency ──────────────────────────────────────────────────────────

describe('agencyApi.getMyAgency', () => {
  it('GETs /inmobiliaria/agency and returns the agency object', async () => {
    const agency = { id: 'ag-1', name: 'Inmobiliaria ABC', memberRole: 'ADMIN' };
    const fetchMock = mockFetchOnce(agency);

    const result = await agencyApi.getMyAgency();

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/inmobiliaria/agency');
    expect(opts.method).toBe('GET');
    expect(result.name).toBe('Inmobiliaria ABC');
    expect(result.memberRole).toBe('ADMIN');
  });
});

// ── (2) updateAgency ─────────────────────────────────────────────────────────

describe('agencyApi.updateAgency', () => {
  it('PUTs only the provided fields to /inmobiliaria/agency', async () => {
    const fetchMock = mockFetchOnce({ id: 'ag-1', name: 'Nuevo Nombre' });

    await agencyApi.updateAgency({ name: 'Nuevo Nombre', city: 'Bogota' });

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    // BACKEND_URL is resolved at module load — assert the path, not the host.
    expect(url.endsWith('/inmobiliaria/agency')).toBe(true);
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body as string)).toEqual({
      name: 'Nuevo Nombre',
      city: 'Bogota',
    });
  });

  it('accepts profile, legal and defaults fields supported by the backend DTO', async () => {
    const fetchMock = mockFetchOnce({ id: 'ag-1' });

    await agencyApi.updateAgency({
      nit: '901234567-8',
      phone: '+57 601 345 6789',
      email: 'contacto@agencia.co',
      address: 'Cra 11 #82-76',
      legalRepresentative: 'Juan Perez',
      legalDocumentNumber: '80123456',
      defaultCommissionPercent: 10,
      defaultLateFeePercent: 2,
      paymentDueDay: 5,
      disbursementDay: 15,
      logoUrl: 'https://cdn.test/logo.png',
      // Backend UpdateAgencyDto accepts day-offset ARRAYS (@IsArray + @IsInt each)
      reminderDaysBefore: [3, 1],
      reminderDaysAfter: [1, 3, 7, 15],
    });

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.legalRepresentative).toBe('Juan Perez');
    expect(body.paymentDueDay).toBe(5);
    expect(body.reminderDaysBefore).toEqual([3, 1]);
    expect(body.reminderDaysAfter).toEqual([1, 3, 7, 15]);
  });
});

// ── (3) uploadAgencyLogo happy path ──────────────────────────────────────────

describe('agencyApi.uploadAgencyLogo', () => {
  it('POSTs multipart FormData with field `file` to /inmobiliaria/agency/logo', async () => {
    const fetchMock = mockFetchOnce({ logoUrl: 'https://cdn.test/agency-logo.webp' });
    const file = new File(['fake-bytes'], 'logo.png', { type: 'image/png' });

    const result = await agencyApi.uploadAgencyLogo(file);

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/agency/logo')).toBe(true);
    expect(opts.method).toBe('POST');
    expect(opts.body).toBeInstanceOf(FormData);
    expect((opts.body as FormData).get('file')).toBe(file);
    // Content-Type must NOT be forced — the browser sets the multipart boundary.
    expect((opts.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
    expect(result).toEqual({ logoUrl: 'https://cdn.test/agency-logo.webp' });
  });

  // ── (4) error path ─────────────────────────────────────────────────────────

  it('throws ApiError with the backend message on non-2xx', async () => {
    mockFetchOnce(
      { message: 'Solo los administradores pueden actualizar la agencia' },
      { ok: false, status: 403 },
    );
    const file = new File(['x'], 'logo.png', { type: 'image/png' });

    await expect(agencyApi.uploadAgencyLogo(file)).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Solo los administradores pueden actualizar la agencia',
    });
  });

  it('wraps network failures in ApiError(0)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError('fetch failed')) as typeof globalThis.fetch;
    const file = new File(['x'], 'logo.png', { type: 'image/png' });

    const error = await agencyApi.uploadAgencyLogo(file).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });
});

// ── (5) phantom config mutations removed ─────────────────────────────────────

describe('inmobiliariaConfigApi — nonexistent backend routes removed', () => {
  it('no longer exposes PATCH /inmobiliaria/config mutations', () => {
    const api = inmobiliariaConfigApi as unknown as Record<string, unknown>;
    expect(api.update).toBeUndefined();
    expect(api.updateBranding).toBeUndefined();
    expect(api.updateDefaults).toBeUndefined();
  });
});
