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
import { agencyApi, inmobiliariaConfigApi, permissionsApi, cobrosApi, mantenimientoApi, documentosApi } from '../inmobiliaria.service';
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

// ── (6) team-action HTTP verbs ───────────────────────────────────────────────

describe('team-action HTTP verbs match the backend routes', () => {
  it('updateMemberRole → PUT /inmobiliaria/agency/members/:id/role { role }', async () => {
    const fetchMock = mockFetchOnce({ id: 'm-1' });
    await permissionsApi.updateMemberRole('m-1', 'AGENTE');

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/agency/members/m-1/role')).toBe(true);
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body as string)).toEqual({ role: 'AGENTE' });
  });

  it('updateMemberStatus → PUT /inmobiliaria/agency/members/:id/status { active }', async () => {
    const fetchMock = mockFetchOnce({ id: 'm-1' });
    await permissionsApi.updateMemberStatus('m-1', false);

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/agency/members/m-1/status')).toBe(true);
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body as string)).toEqual({ active: false });
  });

  it('toggleIntegration → PUT /inmobiliaria/agency/integrations/:id { isEnabled }', async () => {
    const fetchMock = mockFetchOnce({ id: 'int-1', isEnabled: true });
    await inmobiliariaConfigApi.toggleIntegration('int-1', true);

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/agency/integrations/int-1')).toBe(true);
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body as string)).toEqual({ isEnabled: true });
  });

  it('deleteUser → DELETE /inmobiliaria/agency/members/:id (works with the member id)', async () => {
    const fetchMock = mockFetchOnce({}, { status: 204 });
    await inmobiliariaConfigApi.deleteUser('m-1');

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/agency/members/m-1')).toBe(true);
    expect(opts.method).toBe('DELETE');
  });

  it('updateMemberRole surfaces the backend message on a non-2xx (ApiError)', async () => {
    mockFetchOnce({ message: 'Solo un administrador puede cambiar roles' }, { ok: false, status: 403 });
    await expect(permissionsApi.updateMemberRole('m-1', 'ADMIN')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Solo un administrador puede cambiar roles',
    });
  });
});

// ── (7) audit fixes: verb/path corrections against the real back routes ─────

describe('cobrosApi.registerPayment — matches backend @Post(:id/payment)', () => {
  it('POSTs to /inmobiliaria/cobros/:id/payment with the payment body', async () => {
    const fetchMock = mockFetchOnce({ id: 'cobro-1', status: 'PAID' });
    const payment = {
      paidAmount: 1_500_000,
      paymentDate: '2026-08-10',
      paymentMethod: 'TRANSFER',
      paymentReference: 'ref-123',
    };

    await cobrosApi.registerPayment('cobro-1', payment);

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/cobros/cobro-1/payment')).toBe(true);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toEqual(payment);
  });
});

describe('cobrosApi.sendReminder — matches backend @Put(:id/send-reminder)', () => {
  it('PUTs to /inmobiliaria/cobros/:id/send-reminder with no body', async () => {
    const fetchMock = mockFetchOnce({}, { status: 204 });

    await cobrosApi.sendReminder('cobro-1');

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/cobros/cobro-1/send-reminder')).toBe(true);
    expect(opts.method).toBe('PUT');
    expect(opts.body).toBeUndefined();
  });
});

describe('mantenimientoApi.approveQuote — matches backend @Put(:id/select-quote)', () => {
  it('PUTs to /inmobiliaria/mantenimiento/:id/select-quote with { quoteId }', async () => {
    const fetchMock = mockFetchOnce({ id: 'sol-1', status: 'IN_PROGRESS' });

    await mantenimientoApi.approveQuote('sol-1', 'quote-9');

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/mantenimiento/sol-1/select-quote')).toBe(true);
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body as string)).toEqual({ quoteId: 'quote-9' });
  });
});

describe('mantenimientoApi.updateStatus — maps to real backend transitions (no generic /status route)', () => {
  it("'approved' → PUT :id/approve", async () => {
    const fetchMock = mockFetchOnce({ id: 'sol-1', status: 'APPROVED' });
    await mantenimientoApi.updateStatus('sol-1', 'approved');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/mantenimiento/sol-1/approve')).toBe(true);
    expect(opts.method).toBe('PUT');
  });

  it("'completed' → PUT :id/complete", async () => {
    const fetchMock = mockFetchOnce({ id: 'sol-1', status: 'COMPLETED' });
    await mantenimientoApi.updateStatus('sol-1', 'completed');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/mantenimiento/sol-1/complete')).toBe(true);
    expect(opts.method).toBe('PUT');
  });

  it("'cancelled' → PUT :id/cancel", async () => {
    const fetchMock = mockFetchOnce({ id: 'sol-1', status: 'CANCELLED' });
    await mantenimientoApi.updateStatus('sol-1', 'cancelled');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/mantenimiento/sol-1/cancel')).toBe(true);
    expect(opts.method).toBe('PUT');
  });

  it('throws on a status with no backend transition (reported/quoted/in_progress)', async () => {
    await expect(mantenimientoApi.updateStatus('sol-1', 'in_progress')).rejects.toThrow();
  });
});

describe('documentosApi.getTemplates — matches backend @Controller(inmobiliaria/documents) @Get(templates)', () => {
  it('GETs /inmobiliaria/documents/templates', async () => {
    const fetchMock = mockFetchOnce([{ id: 'tpl-1', name: 'Contrato' }]);

    const result = await documentosApi.getTemplates();

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/documents/templates')).toBe(true);
    expect(opts.method).toBe('GET');
    expect(result).toEqual([{ id: 'tpl-1', name: 'Contrato' }]);
  });
});
