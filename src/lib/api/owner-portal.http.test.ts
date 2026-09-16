/**
 * O1: «el portal no está habilitado» no es lo mismo que «falló». Antes todo iba a `null` y el
 * propietario veía «Próximamente» sobre una caída. Estas pruebas fijan qué status es cuál, y que
 * `ownerGet`/`ownerGetBlob` siguen devolviendo `null` en cualquier no-ok (los otros servicios del
 * portal dependen de eso).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./agent-auth', () => ({ agentAuthHeaders: () => ({}) }));

import {
  ownerGet,
  ownerGetBlob,
  ownerGetBlobConEstado,
  ownerGetConEstado,
} from './owner-portal.http';

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agente.test';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const responder = (status: number, cuerpo = '') =>
  fetchMock.mockResolvedValueOnce(new Response(cuerpo || null, { status }));

describe('ownerGetConEstado (O1)', () => {
  it('sin agencyId no llama al portal: no habilitado', async () => {
    
    expect(await ownerGetConEstado(null, '/portafolio')).toEqual({ estado: 'no-habilitado' });
  });

  it('404 y 401 son «no habilitado» (flag apagado, owner-JWT sin cablear)', async () => {
    responder(404);
    expect(await ownerGetConEstado('ag-1', '/portafolio')).toEqual({ estado: 'no-habilitado' });
    responder(401);
    expect(await ownerGetConEstado('ag-1', '/portafolio')).toEqual({ estado: 'no-habilitado' });
  });

  it('🔴 un 500 y un 403 son «falló», con su status', async () => {
    responder(500);
    expect(await ownerGetConEstado('ag-1', '/portafolio')).toMatchObject({ estado: 'fallo', status: 500 });
    responder(403);
    expect(await ownerGetConEstado('ag-1', '/portafolio')).toMatchObject({ estado: 'fallo', status: 403 });
  });

  it('sin red es «falló» con status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await ownerGetConEstado('ag-1', '/portafolio')).toMatchObject({ estado: 'fallo', status: 0 });
  });

  it('una respuesta que no se puede leer es «falló», no «Próximamente»', async () => {
    responder(200, '{roto');
    expect(await ownerGetConEstado('ag-1', '/portafolio')).toMatchObject({ estado: 'fallo', status: 200 });
  });

  it('con datos devuelve ok', async () => {
    responder(200, '{"totalCop":1000}');
    expect(await ownerGetConEstado('ag-1', '/portafolio')).toEqual({ estado: 'ok', data: { totalCop: 1000 } });
  });

  it('ownerGet sigue devolviendo null en cualquier no-ok (los otros servicios cuentan con eso)', async () => {
    responder(500);
    expect(await ownerGet('ag-1', '/perfil')).toBeNull();
    responder(200, '{"a":1}');
    expect(await ownerGet('ag-1', '/perfil')).toEqual({ a: 1 });
  });
});

describe('ownerGetBlobConEstado (O2)', () => {
  it('un 503 es «falló» y ownerGetBlob da null', async () => {
    responder(503);
    expect(await ownerGetBlobConEstado('ag-1', '/informe.pdf')).toMatchObject({ estado: 'fallo', status: 503 });
    responder(503);
    expect(await ownerGetBlob('ag-1', '/informe.pdf')).toBeNull();
  });

  it('con el PDF devuelve ok con el blob', async () => {
    responder(200, '%PDF-1.4');
    const r = await ownerGetBlobConEstado('ag-1', '/informe.pdf');
    expect(r.estado).toBe('ok');
  });
});
