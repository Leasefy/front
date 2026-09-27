/**
 * pagare.service.test.ts — T-0109 contract.md §3.1.E.
 *
 * Coverage:
 *   (1) codeudoresApi CRUD hits the exact routes with the exact methods
 *   (2) pagareApi.emitir POSTs an empty body to E6
 *   (3) pagareApi.documento GETs E8 with the `:tipo` segment
 *   (4) pagareApi.miFirma GETs E9
 *   (5) a 409 CODEUDOR_DUPLICADO surfaces its code
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { codeudoresApi, pagareApi } from '../pagare.service';
import { setAccessToken } from '../client';

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
  setAccessToken('sesion-token');
});

afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

describe('codeudoresApi', () => {
  it('list GETs /contracts/:id/codeudores', async () => {
    const fetchMock = mockFetchOnce([]);
    await codeudoresApi.list('c-1');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/contracts/c-1/codeudores')).toBe(true);
    expect(opts.method).toBe('GET');
  });

  it('create POSTs the CodeudorDto', async () => {
    const fetchMock = mockFetchOnce({ id: 'k-1' });
    await codeudoresApi.create('c-1', {
      nombre: 'Pedro',
      tipoDeDocumento: 'CC',
      documento: '123',
      email: 'p@x.com',
      celular: '+573001234567',
    });
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/contracts/c-1/codeudores')).toBe(true);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toEqual({
      nombre: 'Pedro',
      tipoDeDocumento: 'CC',
      documento: '123',
      email: 'p@x.com',
      celular: '+573001234567',
    });
  });

  it('update PATCHes a partial dto', async () => {
    const fetchMock = mockFetchOnce({ id: 'k-1' });
    await codeudoresApi.update('c-1', 'k-1', { email: 'nuevo@x.com' });
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/contracts/c-1/codeudores/k-1')).toBe(true);
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body as string)).toEqual({ email: 'nuevo@x.com' });
  });

  it('remove DELETEs', async () => {
    const fetchMock = mockFetchOnce({ id: 'k-1' });
    await codeudoresApi.remove('c-1', 'k-1');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/contracts/c-1/codeudores/k-1')).toBe(true);
    expect(opts.method).toBe('DELETE');
  });

  it('surfaces the 409 CODEUDOR_DUPLICADO code', async () => {
    mockFetchOnce({ message: 'Ya existe', code: 'CODEUDOR_DUPLICADO' }, { ok: false, status: 409 });
    await expect(
      codeudoresApi.create('c-1', { nombre: 'X', tipoDeDocumento: 'CC', documento: '1', email: 'x@x.com', celular: '+573001234567' }),
    ).rejects.toMatchObject({ status: 409, code: 'CODEUDOR_DUPLICADO' });
  });
});

describe('pagareApi', () => {
  it('obtener GETs /contracts/:id/pagare', async () => {
    const fetchMock = mockFetchOnce({ pagare: null, disponible: false });
    await pagareApi.obtener('c-1');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/contracts/c-1/pagare')).toBe(true);
    expect(opts.method).toBe('GET');
  });

  it('emitir POSTs an empty body', async () => {
    const fetchMock = mockFetchOnce({ id: 'p-1', estado: 'CREANDO' });
    await pagareApi.emitir('c-1');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/contracts/c-1/pagare')).toBe(true);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toEqual({});
  });

  it('documento GETs E8 with the :tipo segment', async () => {
    const fetchMock = mockFetchOnce({ url: 'https://x/y.pdf', expiresAt: '2026-01-01T00:00:00Z', firmado: false });
    await pagareApi.documento('c-1', 'carta-de-instrucciones');
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/contracts/c-1/pagare/documentos/carta-de-instrucciones')).toBe(true);
  });

  it('miFirma GETs E9', async () => {
    const fetchMock = mockFetchOnce({ pagareId: null, estado: null, miEstado: null, urlDeFirma: null, esSandbox: false });
    await pagareApi.miFirma('c-1');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/contracts/c-1/pagare/mi-firma')).toBe(true);
    expect(opts.method).toBe('GET');
  });

  it('simular POSTs { accion } to the dev-only route', async () => {
    const fetchMock = mockFetchOnce({ id: 'p-1', estado: 'FIRMADO' });
    await pagareApi.simular('p-1', 'f-1', 'FIRMAR');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/desarrollo/pagares/p-1/firmantes/f-1/simular')).toBe(true);
    expect(JSON.parse(opts.body as string)).toEqual({ accion: 'FIRMAR' });
  });
});
