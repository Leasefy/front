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
import { agencyApi, inmobiliariaConfigApi, permissionsApi, cobrosApi, mantenimientoApi, documentosApi, propietariosApi, inmueblesApi, normalizeInmuebleSinConsignacion, normalizeConsignacion } from '../inmobiliaria.service';
import { ApiError, setAccessToken } from '../client';
import type { PropietarioFormData, BackendInmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

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

// ── propietariosApi.create/update — bank fields wire mapping (T-0014) ───────
//
// contract.md §3.2/§3.3 (T-0014): the front's own bank slugs (BankCode) and
// account-type values do NOT line up 1:1 with the backend's ColombianBank
// enum / AHORROS|CORRIENTE. `bankCode`/`accountType`/`accountNumber`/
// `accountHolder` never reach the wire as-is — they get renamed AND
// translated at this boundary. `bankName` is backend-derived and must never
// be sent by the front.

const BASE_PROPIETARIO: PropietarioFormData = {
  name: 'Victor Espitia',
  email: 'victor@test.co',
  phone: '+57 300 000 0000',
  documentType: 'CC',
  documentNumber: '123456789',
  bankCode: 'bancolombia',
  accountType: 'savings',
  accountNumber: '49739377771',
  accountHolder: 'victor espitia',
};

describe('propietariosApi.create — maps front bank fields to the wire contract', () => {
  it('renames and translates bankCode/accountType to the wire codes; never sends bankName', async () => {
    const fetchMock = mockFetchOnce({ id: 'prop-1', name: BASE_PROPIETARIO.name });

    await propietariosApi.create(BASE_PROPIETARIO);

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/propietarios')).toBe(true);
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
    expect(body.bankCode).toBe('BANCOLOMBIA');
    expect(body.bankAccountType).toBe('AHORROS');
    expect(body.bankAccountNumber).toBe('49739377771');
    expect(body.bankAccountHolder).toBe('victor espitia');
    // deprecated free-text field is back-derived — the front must never send it
    expect(body.bankName).toBeUndefined();
    // front-only keys must not leak onto the wire
    expect(body.accountType).toBeUndefined();
    expect(body.accountNumber).toBeUndefined();
    expect(body.accountHolder).toBeUndefined();
  });

  it('maps checking to CORRIENTE', async () => {
    const fetchMock = mockFetchOnce({ id: 'prop-1' });
    await propietariosApi.create({ ...BASE_PROPIETARIO, accountType: 'checking' });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.bankAccountType).toBe('CORRIENTE');
  });

  it('maps colpatria to SCOTIABANK — not a toUpperCase() of the slug', async () => {
    const fetchMock = mockFetchOnce({ id: 'prop-1' });
    await propietariosApi.create({ ...BASE_PROPIETARIO, bankCode: 'colpatria' });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.bankCode).toBe('SCOTIABANK');
  });

  it('maps cajasocial to BANCO_CAJA_SOCIAL — not a toUpperCase() of the slug', async () => {
    const fetchMock = mockFetchOnce({ id: 'prop-1' });
    await propietariosApi.create({ ...BASE_PROPIETARIO, bankCode: 'cajasocial' });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.bankCode).toBe('BANCO_CAJA_SOCIAL');
  });

  it('maps the three catalogue-only banks the owner form now surfaces (avvillas/bancoomeva/pichincha)', async () => {
    const cases: [PropietarioFormData['bankCode'], string][] = [
      ['avvillas', 'BANCO_AV_VILLAS'],
      ['bancoomeva', 'BANCOOMEVA'],
      ['pichincha', 'BANCO_PICHINCHA'],
    ];
    for (const [slug, wire] of cases) {
      const fetchMock = mockFetchOnce({ id: 'prop-1' });
      await propietariosApi.create({ ...BASE_PROPIETARIO, bankCode: slug });
      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(body.bankCode).toBe(wire);
    }
  });

  it('throws instead of silently coercing an unmapped bank slug (no toUpperCase fallback, no default)', async () => {
    await expect(
      propietariosApi.create({
        ...BASE_PROPIETARIO,
        bankCode: 'unknown-bank' as unknown as PropietarioFormData['bankCode'],
      }),
    ).rejects.toThrow();
  });

  it('does not send bankCode/bankAccountType when the front value is empty (no bank on file yet)', async () => {
    const fetchMock = mockFetchOnce({ id: 'prop-1' });
    await propietariosApi.create({
      ...BASE_PROPIETARIO,
      bankCode: '',
      accountType: '',
      accountNumber: '',
      accountHolder: '',
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.bankCode).toBeUndefined();
    expect(body.bankAccountType).toBeUndefined();
  });
});

describe('propietariosApi.update — applies the same wire mapping on a partial payload', () => {
  it('PATCHes only the given fields, translated to the wire contract', async () => {
    const fetchMock = mockFetchOnce({ id: 'prop-1' });

    await propietariosApi.update('prop-1', {
      bankCode: 'bbva',
      accountType: 'checking',
      accountNumber: '999',
      accountHolder: 'Juan Perez',
    });

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/propietarios/prop-1')).toBe(true);
    expect(opts.method).toBe('PATCH');
    const body = JSON.parse(opts.body as string);
    expect(body).toEqual({
      bankCode: 'BBVA',
      bankAccountType: 'CORRIENTE',
      bankAccountNumber: '999',
      bankAccountHolder: 'Juan Perez',
    });
  });

  it('leaves non-bank fields untouched when only they are given', async () => {
    const fetchMock = mockFetchOnce({ id: 'prop-1' });

    await propietariosApi.update('prop-1', { name: 'Nuevo Nombre', city: 'Medellin' });

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ name: 'Nuevo Nombre', city: 'Medellin' });
  });

  it('throws instead of silently coercing an unmapped bank slug on update too', async () => {
    await expect(
      propietariosApi.update('prop-1', {
        bankCode: 'unknown-bank' as unknown as PropietarioFormData['bankCode'],
      }),
    ).rejects.toThrow();
  });
});

// ── inmueblesApi.getSinConsignacion / normalizeInmuebleSinConsignacion ──────
// T-0030 WU-2 — contract.md §3.1/§3.2: the second source the portfolio table
// merges in. Two crash traps guarded on the read path here: the ROOM property
// type (no entry in ConsignacionPropertyType) and the empty-string zone.

function backendRow(overrides: Partial<BackendInmuebleSinConsignacion> = {}): BackendInmuebleSinConsignacion {
  return {
    propertyId: 'prop-1',
    propertyTitle: 'Depto Chicó',
    propertyAddress: 'Cra 11 #94-45',
    propertyCity: 'Bogotá',
    propertyZone: 'Chicó',
    propertyType: 'APARTMENT',
    propertyThumbnail: null,
    monthlyRent: 2_500_000,
    adminFee: 0,
    status: 'DRAFT',
    createdAt: '2026-08-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('inmueblesApi.getSinConsignacion — GET /inmobiliaria/inmuebles/sin-consignacion', () => {
  it('GETs the frozen path and normalizes every row', async () => {
    const fetchMock = mockFetchOnce([backendRow()]);

    const result = await inmueblesApi.getSinConsignacion();

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/inmobiliaria/inmuebles/sin-consignacion');
    expect(opts.method).toBe('GET');
    expect(result).toEqual([
      {
        propertyId: 'prop-1',
        propertyTitle: 'Depto Chicó',
        propertyAddress: 'Cra 11 #94-45',
        propertyCity: 'Bogotá',
        propertyZone: 'Chicó',
        propertyType: 'apartment',
        propertyThumbnail: null,
        monthlyRent: 2_500_000,
        adminFee: 0,
        status: 'draft',
        createdAt: '2026-08-20T00:00:00.000Z',
        // T-0038 §3.2 — defaults when the backend fixture omits the new fields.
        department: null,
        listingType: 'rent',
        salePrice: null,
        code: undefined,
      },
    ]);
  });

  it('returns [] on an empty agency, never treats it as an error', async () => {
    mockFetchOnce([]);
    const result = await inmueblesApi.getSinConsignacion();
    expect(result).toEqual([]);
  });
});

describe('normalizeInmuebleSinConsignacion — the ROOM trap and the empty-zone case', () => {
  it('lower-cases ROOM instead of dropping it — no entry in ConsignacionPropertyType', () => {
    const result = normalizeInmuebleSinConsignacion(backendRow({ propertyType: 'ROOM' }));
    expect(result.propertyType).toBe('room');
  });

  it('lower-cases every other PropertyType 1:1', () => {
    expect(normalizeInmuebleSinConsignacion(backendRow({ propertyType: 'WAREHOUSE' })).propertyType).toBe('warehouse');
  });

  it('preserves an empty-string zone as "" — the front decides how to render it, not the mapper', () => {
    const result = normalizeInmuebleSinConsignacion(backendRow({ propertyZone: '' }));
    expect(result.propertyZone).toBe('');
  });

  it('preserves a null thumbnail as null (never coerces to "")', () => {
    const result = normalizeInmuebleSinConsignacion(backendRow({ propertyThumbnail: null }));
    expect(result.propertyThumbnail).toBeNull();
  });

  it('lower-cases status', () => {
    expect(normalizeInmuebleSinConsignacion(backendRow({ status: 'AVAILABLE' })).status).toBe('available');
  });
});

// ── T-0038 §3.2 — department / listingType / salePrice / code / consignedAt ──

describe('normalizeInmuebleSinConsignacion — T-0038 property-sale fields', () => {
  it('maps a SALE row: listingType, salePrice, and null monthlyRent — never 0 (C6)', () => {
    const result = normalizeInmuebleSinConsignacion(
      backendRow({ propertyListingType: 'SALE', propertySalePrice: 300_000_000, monthlyRent: null }),
    );
    expect(result.listingType).toBe('sale');
    expect(result.salePrice).toBe(300_000_000);
    expect(result.monthlyRent).toBeNull();
  });

  it('defaults listingType to "rent" and salePrice/department to null when absent', () => {
    const result = normalizeInmuebleSinConsignacion(backendRow());
    expect(result.listingType).toBe('rent');
    expect(result.salePrice).toBeNull();
    expect(result.department).toBeNull();
  });

  it('throws on an unrecognised listingType instead of defaulting (C19)', () => {
    expect(() => normalizeInmuebleSinConsignacion(backendRow({ propertyListingType: 'LEASE' }))).toThrow();
  });

  it('passes propertyCode through as code — this route is already agency-guarded, always present', () => {
    expect(normalizeInmuebleSinConsignacion(backendRow({ propertyCode: 12 })).code).toBe(12);
  });

  it('passes propertyConsignedAt through verbatim, preserving null vs. absent', () => {
    const withDate = normalizeInmuebleSinConsignacion(backendRow({ propertyConsignedAt: '2026-08-29' }));
    expect(withDate.consignedAt).toBe('2026-08-29');

    const withNull = normalizeInmuebleSinConsignacion(backendRow({ propertyConsignedAt: null }));
    expect('consignedAt' in withNull).toBe(true);
    expect(withNull.consignedAt).toBeNull();

    const absent = normalizeInmuebleSinConsignacion(backendRow());
    expect('consignedAt' in absent).toBe(false);
  });
});

// ── T-0038 contract-addendum-2.md §A.1/§A.2/§A.9.1 — the sale mandate ──────

function rawConsignacion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'owner-1',
    agenteUserId: 'user-1',
    propertyTitle: 'Depto Chicó',
    propertyAddress: 'Cra 11 #94-45',
    propertyCity: 'Bogotá',
    propertyZone: 'Chicó',
    propertyType: 'APARTMENT',
    monthlyRent: 2_500_000,
    adminFee: 0,
    commissionPercent: 10,
    contractDate: '2026-01-01T00:00:00.000Z',
    status: 'ACTIVE',
    availability: 'AVAILABLE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Parameters<typeof normalizeConsignacion>[0];
}

describe('normalizeConsignacion — the reduced sale mandate', () => {
  it('defaults listingType to "rent" when absent (older back build)', () => {
    expect(normalizeConsignacion(rawConsignacion()).listingType).toBe('rent');
  });

  it('maps a SALE row: listingType lower-cased, monthlyRent null preserved, never 0 (C6)', () => {
    const result = normalizeConsignacion(
      rawConsignacion({ listingType: 'SALE', monthlyRent: null, saleCommissionPercent: 3 }),
    );
    expect(result.listingType).toBe('sale');
    expect(result.monthlyRent).toBeNull();
    expect(result.saleCommissionPercent).toBe(3);
  });

  it('throws on an unrecognised listingType instead of defaulting (C19)', () => {
    expect(() => normalizeConsignacion(rawConsignacion({ listingType: 'LEASE' }))).toThrow();
  });

  it('defaults saleCommissionPercent to null when absent — never 0%', () => {
    expect(normalizeConsignacion(rawConsignacion()).saleCommissionPercent).toBeNull();
  });

  it('defaults propertyCode to null when absent (a migrated cartera row with no linked property)', () => {
    expect(normalizeConsignacion(rawConsignacion()).propertyCode).toBeNull();
  });

  it('passes propertyCode through when present', () => {
    expect(normalizeConsignacion(rawConsignacion({ propertyCode: 42 })).propertyCode).toBe(42);
  });
});
