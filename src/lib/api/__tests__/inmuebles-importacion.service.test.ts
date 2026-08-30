/**
 * inmuebles-importacion.service.test.ts — T-0038 WU-6.
 *
 * Pins the route table wu-4-report.md §6 froze: server-issued lote (never
 * sent by the client), the activation loop's `restantes` shape, and the
 * discard 409/404 pass-through (never retried silently).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inmueblesImportacionApi } from '../inmuebles-importacion.service';
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

describe('inmueblesImportacionApi.preparar — never sends a client-invented lote', () => {
  it('POSTs to /inmobiliaria/inmuebles/importar/preparar with the rows and no lote field', async () => {
    const fetchMock = mockFetchOnce({
      lote: 'lote-1', estado: 'ENCOLADO', total: 2, procesadas: 0, pendientes: 0,
      listos: 0, activados: 0, descartados: 0, jobId: 'job-1', error: null, creadoEn: '2026-08-29T00:00:00.000Z',
    });
    const result = await inmueblesImportacionApi.preparar([{ title: 'Depto' }, { title: 'Casa' }], 'idem-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/inmobiliaria/inmuebles/importar/preparar');
    const body = JSON.parse(init?.body as string);
    expect(body.inmuebles).toHaveLength(2);
    expect(body.idempotencyKey).toBe('idem-1');
    expect('lote' in body).toBe(false);
    expect(result.lote).toBe('lote-1');
    expect(result.estado).toBe('ENCOLADO');
  });

  it('omits idempotencyKey entirely when not supplied, never sends undefined/null', async () => {
    const fetchMock = mockFetchOnce({
      lote: 'lote-2', estado: 'ENCOLADO', total: 1, procesadas: 0, pendientes: 0,
      listos: 0, activados: 0, descartados: 0, jobId: null, error: null, creadoEn: '2026-08-29T00:00:00.000Z',
    });
    await inmueblesImportacionApi.preparar([{ title: 'Depto' }]);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect('idempotencyKey' in body).toBe(false);
  });
});

describe('inmueblesImportacionApi — the review loop', () => {
  it('filas() sends lote/pagina/porPagina/estado as query params', async () => {
    const fetchMock = mockFetchOnce({ filas: [], total: 0, pagina: 1, porPagina: 25 });
    await inmueblesImportacionApi.filas('lote-1', { pagina: 1, porPagina: 25, estado: 'PENDIENTE' });
    const [url] = fetchMock.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.pathname).toContain('/inmobiliaria/inmuebles/importar/filas');
    expect(parsed.searchParams.get('lote')).toBe('lote-1');
    expect(parsed.searchParams.get('pagina')).toBe('1');
    expect(parsed.searchParams.get('porPagina')).toBe('25');
    expect(parsed.searchParams.get('estado')).toBe('PENDIENTE');
  });

  it('resolver() PATCHes a single row with the given changes', async () => {
    const fetchMock = mockFetchOnce({
      id: 'fila-1', lote: 'lote-1', fila: 1, estado: 'LISTO', faltantes: [], overrides: [], candidatos: [], propertyId: null, datos: {},
    });
    await inmueblesImportacionApi.resolver('fila-1', { title: 'Depto Chicó', monthlyRent: null });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/inmobiliaria/inmuebles/importar/filas/fila-1');
    expect(init?.method).toBe('PATCH');
    const body = JSON.parse(init?.body as string);
    expect(body.title).toBe('Depto Chicó');
    // null clears the value — must survive JSON.stringify, not be dropped.
    expect(body.monthlyRent).toBeNull();
  });

  it('resolverMasivo() PATCHes the plural route with ids + shared changes', async () => {
    const fetchMock = mockFetchOnce({ total: 2, resueltas: 2, fallidas: 0, resultados: [] });
    await inmueblesImportacionApi.resolverMasivo(['f1', 'f2'], { department: 'Antioquia' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/inmobiliaria/inmuebles/importar/filas');
    expect(String(url)).not.toContain('/filas/f1');
    const body = JSON.parse(init?.body as string);
    expect(body.ids).toEqual(['f1', 'f2']);
    expect(body.department).toBe('Antioquia');
  });

  it('descartarFila() DELETEs the single row', async () => {
    const fetchMock = mockFetchOnce({
      id: 'fila-1', lote: 'lote-1', fila: 1, estado: 'DESCARTADO', faltantes: [], overrides: [], candidatos: [], propertyId: null, datos: {},
    });
    await inmueblesImportacionApi.descartarFila('fila-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/filas/fila-1');
    expect(init?.method).toBe('DELETE');
  });
});

describe('inmueblesImportacionApi.descartarLote — 409/404 pass through, never retried silently', () => {
  it('resolves with the discard summary on success', async () => {
    mockFetchOnce({ lote: 'lote-1', descartadas: 5, activadas: 2, yaDescartadas: 0 });
    const result = await inmueblesImportacionApi.descartarLote('lote-1');
    expect(result).toEqual({ lote: 'lote-1', descartadas: 5, activadas: 2, yaDescartadas: 0 });
  });

  it('surfaces a 409 LOTE_EN_PROCESO as an ApiError, not a silent failure', async () => {
    mockFetchOnce({ code: 'LOTE_EN_PROCESO', message: 'El lote todavía se está procesando.' }, { ok: false, status: 409 });
    await expect(inmueblesImportacionApi.descartarLote('lote-1')).rejects.toBeInstanceOf(ApiError);
  });

  it('surfaces a 404 on an unknown lote', async () => {
    mockFetchOnce({ message: 'Lote no encontrado' }, { ok: false, status: 404 });
    await expect(inmueblesImportacionApi.descartarLote('lote-nope')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('inmueblesImportacionApi.activar — the restantes loop shape', () => {
  it('POSTs { lote } only — no row ids, no count', async () => {
    const fetchMock = mockFetchOnce({ lote: 'lote-1', activados: 500, omitidas: [], restantes: 300 });
    const result = await inmueblesImportacionApi.activar('lote-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/inmobiliaria/inmuebles/importar/activar');
    expect(JSON.parse(init?.body as string)).toEqual({ lote: 'lote-1' });
    expect(result.restantes).toBe(300);
  });

  it('a zero-restantes response signals the loop is done', async () => {
    mockFetchOnce({ lote: 'lote-1', activados: 42, omitidas: [{ id: 'f1', fila: 3, faltantes: ['canon'] }], restantes: 0 });
    const result = await inmueblesImportacionApi.activar('lote-1');
    expect(result.restantes).toBe(0);
    expect(result.omitidas).toHaveLength(1);
  });
});
