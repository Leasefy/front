/**
 * `/api/inmuebles/desde-enlace` baja la URL que se le pida desde nuestro
 * servidor. Desde la auditoría de seguridad del 23-09 exige sesión: antes
 * cualquiera en internet la usaba de proxy.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
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
vi.mock('node:dns/promises', () => {
  const lookup = vi.fn().mockResolvedValue([{ address: '203.0.113.10' }]);
  return { lookup, default: { lookup } };
});

import { POST } from './route';
import { _olvidarSesionesVerificadas } from '@/lib/api/sesion-de-la-ruta';
import { _olvidarCuentas, POLITICAS_DE_LAS_RUTAS } from '@/lib/api/limite-de-la-ruta';

function pedir(url: string, token: string | null) {
  return POST(
    new NextRequest('http://localhost/api/inmuebles/desde-enlace', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ url }),
    }),
  );
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://proyecto.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'sb_publishable_prueba';
  _olvidarSesionesVerificadas();
  _olvidarCuentas();
});

describe('POST /api/inmuebles/desde-enlace', () => {
  it.each([
    ['sin Authorization', null],
    ['con un token inventado', 'cualquier-cosa'],
  ])('no baja nada %s (401)', async (_caso, token) => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const res = await pedir('https://example.com/inmueble/1', token);
    expect(res.status).toBe(401);
    expect((await res.json()).motivo).toBe('sin_sesion');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con sesión lee el enlace como antes', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      body: new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode('<html><head><title>Apartamento en Laureles</title></head></html>'));
          c.close();
        },
      }),
    }) as unknown as typeof fetch;
    const res = await pedir('https://example.com/inmueble/1', TOKEN_VALIDO);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});

/*
 * 🔴 Auditoría de seguridad (23-09): con sesión y todo, esta ruta baja páginas
 * de terceros desde nuestro servidor. Sin techo, una IP la usaba para
 * martillar a otro sitio.
 */
describe('POST /api/inmuebles/desde-enlace — límite por IP', () => {
  it('pasado el techo responde 429 sin bajar nada, antes de mirar la sesión', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    for (let i = 0; i < POLITICAS_DE_LAS_RUTAS.desdeEnlace.maximo; i++) {
      await pedir('', TOKEN_VALIDO);
    }
    const res = await pedir('https://example.com/inmueble/1', TOKEN_VALIDO);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
