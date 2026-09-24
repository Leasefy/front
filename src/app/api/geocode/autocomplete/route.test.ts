/**
 * route.test.ts — security-critical branches of the LocationIQ proxy:
 *   1. missing LOCATIONIQ_API_KEY -> fail-closed 503, key never touched
 *   2. query under the minimum length -> no upstream call at all
 *   3. upstream failure -> 502, key never leaked in the response
 *   4. success -> delegates to normalizeAutocompleteResults
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
const TOKEN_VALIDO = 'jwt-de-prueba';
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getClaims: vi.fn(async (jwt: string) =>
        jwt === TOKEN_VALIDO
          ? { data: { claims: { exp: Math.floor(Date.now() / 1000) + 3600 } }, error: null }
          : { data: null, error: new Error('invalid JWT') },
      ),
    },
  }),
}));

import { GET } from './route';
import { _olvidarSesionesVerificadas } from '@/lib/api/sesion-de-la-ruta';
import { _olvidarCuentas, POLITICAS_DE_LAS_RUTAS } from '@/lib/api/limite-de-la-ruta';

const ORIGINAL_ENV = process.env.LOCATIONIQ_API_KEY;

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://proyecto.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'sb_publishable_prueba';
  _olvidarSesionesVerificadas();
  _olvidarCuentas();
  delete process.env.TRUST_PROXY_HOPS;
});

afterEach(() => {
  process.env.LOCATIONIQ_API_KEY = ORIGINAL_ENV;
});

function requestFor(q: string, token: string | null = TOKEN_VALIDO, xff?: string) {
  return new NextRequest(`http://localhost:3001/api/geocode/autocomplete?q=${encodeURIComponent(q)}`, {
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(xff ? { 'x-forwarded-for': xff } : {}),
    },
  });
}

describe('GET /api/geocode/autocomplete', () => {
  it('returns empty results without calling fetch when the query is under 3 chars', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('Ca'));
    const body = await res.json();

    expect(body).toEqual({ results: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed with 503 when LOCATIONIQ_API_KEY is not configured', async () => {
    delete process.env.LOCATIONIQ_API_KEY;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('Calle 123'));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toEqual({ error: 'geocoding_not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never includes the API key anywhere in the response body', async () => {
    process.env.LOCATIONIQ_API_KEY = 'super-secret-key';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('Calle 123'));
    const rawText = JSON.stringify(await res.json());

    expect(rawText).not.toContain('super-secret-key');
  });

  it('returns 502 when the LocationIQ request throws (network failure)', async () => {
    process.env.LOCATIONIQ_API_KEY = 'a-key';
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('network down')) as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('Calle 123'));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body).toEqual({ error: 'geocoding_unavailable' });
  });

  it('returns 502 when LocationIQ responds with a non-ok, non-404 status', async () => {
    process.env.LOCATIONIQ_API_KEY = 'a-key';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('Calle 123'));
    expect(res.status).toBe(502);
  });

  it('treats a 404 from LocationIQ (no matches) as an empty result set, not an error', async () => {
    process.env.LOCATIONIQ_API_KEY = 'a-key';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Unable to geocode' }),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('Calle 123'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ results: [] });
  });

  it('normalizes a successful LocationIQ response via normalizeAutocompleteResults', async () => {
    process.env.LOCATIONIQ_API_KEY = 'a-key';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [
        {
          place_id: '1',
          lat: '4.6',
          lon: '-74.0',
          display_name: 'Calle 123, Bogotá',
          address: { road: 'Calle 123', city: 'Bogotá' },
        },
      ],
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('Calle 123'));
    const body = await res.json();

    expect(body.results).toEqual([
      { label: 'Calle 123, Bogotá', lat: 4.6, lon: -74.0, placeId: '1', city: 'Bogotá', road: 'Calle 123' },
    ]);
  });
});

/*
 * 🔴 Auditoría de seguridad (23-09): esta ruta gasta la cuota de LocationIQ
 * que pagamos. Antes cualquiera en internet la usaba sin sesión y sin techo.
 */
describe('GET /api/geocode/autocomplete — sesión y límite por IP', () => {
  it.each([
    ['sin Authorization', null],
    ['con un token inventado', 'cualquier-cosa'],
  ])('no llama a LocationIQ %s (401)', async (_caso, token) => {
    process.env.LOCATIONIQ_API_KEY = 'llave';
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    const res = await GET(requestFor('Calle 123', token));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pasado el techo por IP responde 429 con Retry-After, sin llamar a LocationIQ; otra IP sigue', async () => {
    process.env.LOCATIONIQ_API_KEY = 'llave';
    process.env.TRUST_PROXY_HOPS = '1';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const max = POLITICAS_DE_LAS_RUTAS.geocode.maximo;
    for (let i = 0; i < max; i++) {
      // El atacante cambia lo de la izquierda; el proxy agrega la IP real.
      const res = await GET(requestFor('Calle 123', TOKEN_VALIDO, `10.0.0.${i % 250}, 203.0.113.7`));
      expect(res.status).not.toBe(429);
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as unknown as Response);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    const bloqueada = await GET(requestFor('Calle 123', TOKEN_VALIDO, '9.9.9.9, 203.0.113.7'));
    expect(bloqueada.status).toBe(429);
    expect(Number(bloqueada.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await bloqueada.json()).code).toBe('DEMASIADAS_SOLICITUDES');
    expect(fetchMock).not.toHaveBeenCalled();

    const otra = await GET(requestFor('Calle 123', TOKEN_VALIDO, '198.51.100.4'));
    expect(otra.status).not.toBe(429);
  });
});
