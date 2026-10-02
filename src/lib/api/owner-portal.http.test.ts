/**
 * O1: «el portal no está habilitado» no es lo mismo que «falló». Antes todo iba a `null` y el
 * propietario veía «Próximamente» sobre una caída. Estas pruebas fijan qué status es cuál, y que
 * `ownerGet`/`ownerGetBlob` siguen devolviendo `null` en cualquier no-ok (los otros servicios del
 * portal dependen de eso).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./agent-auth', () => ({ agentAuthHeaders: () => ({}) }));

import {
  CODIGO_RESPUESTA_ILEGIBLE,
  ownerGet,
  ownerGetBlob,
  ownerGetBlobConEstado,
  ownerGetConEstado,
  ownerPost,
} from './owner-portal.http';
import { ApiError } from './client';
import { camposDelError, leerFallo, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { falloDeLaAccionDelPortal } from '@/components/landlord/portal/fallo-de-la-accion';

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

  it('una respuesta que no se puede leer es «falló» (nuestro, 500), no «Próximamente»', async () => {
    responder(200, '{roto');
    expect(await ownerGetConEstado('ag-1', '/portafolio')).toMatchObject({ estado: 'fallo', status: 500 });
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

/**
 * 02-10-2026 · «Arréglalos con el traductor» (Nico). Antes el cuerpo del error se tiraba
 * («El portal respondió 500.») y, en `ownerPost`, un cuerpo que no era JSON —también en un 2xx—
 * se reportaba como red caída (status 0, 'network').
 */
const HTML_DEL_PROXY = '<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>';

const SOBRE_400 = {
  statusCode: 400,
  code: 'DATOS_INVALIDOS',
  message: ['La descripción no puede pasar de 2000 caracteres.'],
  campos: [{ campo: 'descripcion', regla: 'maximo', mensaje: 'La descripción no puede pasar de 2000 caracteres.' }],
};

const SOBRE_500 = {
  statusCode: 500,
  code: 'ERROR_INTERNO',
  message: 'Error interno del servidor.',
  referencia: 'ab12cd34',
};

const responderJson = (status: number, cuerpo: unknown) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } }),
  );

describe('ownerGetConEstado — el fallo entero, por el traductor', () => {
  it('🔴 un 2xx con un cuerpo HTML no es «sin conexión»: es nuestro (500) y nunca status 0', async () => {
    responder(200, HTML_DEL_PROXY);
    const r = await ownerGetConEstado('ag-1', '/portafolio');
    expect(r.estado).toBe('fallo');
    if (r.estado !== 'fallo') return;
    expect(r.status).not.toBe(0);
    expect(r.error).toBeInstanceOf(ApiError);
    expect(r.error.status).toBe(500);
    expect(r.error.code).toBe(CODIGO_RESPUESTA_ILEGIBLE);
    expect(r.error.detalle).toMatchObject({ statusRecibido: 200 });
    expect(leerFallo(r.error).tipo).toBe('nuestro');
    expect(r.mensaje).toMatch(/de nuestro lado/);
    expect(r.mensaje).not.toMatch(/conexi[oó]n/i);
  });

  it('un 400 del sobre conserva status, code y campos en el error', async () => {
    responderJson(400, SOBRE_400);
    const r = await ownerGetConEstado('ag-1', '/portafolio');
    if (r.estado !== 'fallo') throw new Error(`esperaba un fallo y llegó ${r.estado}`);
    expect(r.status).toBe(400);
    expect(r.error.code).toBe('DATOS_INVALIDOS');
    expect(r.error.detalle).toMatchObject(SOBRE_400);
    expect(camposDelError(r.error)).toEqual([
      { campo: 'descripcion', regla: 'maximo', mensaje: 'La descripción no puede pasar de 2000 caracteres.' },
    ]);
    expect(r.mensaje).toBe('La descripción no puede pasar de 2000 caracteres.');
  });

  it('🔴 un 500 con referencia dice «de nuestro lado» con la referencia (no «El portal respondió 500.»)', async () => {
    responderJson(500, SOBRE_500);
    const r = await ownerGetConEstado('ag-1', '/portafolio');
    if (r.estado !== 'fallo') throw new Error(`esperaba un fallo y llegó ${r.estado}`);
    expect(r.error.status).toBe(500);
    expect(leerFallo(r.error).referencia).toBe('ab12cd34');
    expect(r.mensaje).toMatch(/de nuestro lado/);
    expect(r.mensaje).toContain('ab12cd34');
    expect(r.mensaje).not.toContain('respondió 500');
  });

  it('sin red (el fetch no salió) es el único caso de «conexión»: status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const r = await ownerGetConEstado('ag-1', '/portafolio');
    if (r.estado !== 'fallo') throw new Error(`esperaba un fallo y llegó ${r.estado}`);
    expect(r.error.status).toBe(0);
    expect(leerFallo(r.error).tipo).toBe('sinRespuesta');
    expect(r.mensaje).toMatch(/conexi[oó]n/i);
  });
});

describe('ownerPost — el fallo entero, por el traductor', () => {
  it('🔴 un 2xx con cuerpo HTML no es «network» ni status 0: es nuestro', async () => {
    responder(200, HTML_DEL_PROXY);
    const r = await ownerPost('ag-1', '/solicitudes', { tipo: 'reparacion' });
    expect(r.ok).toBe(false);
    expect(r.status).not.toBe(0);
    expect(r.error).not.toBe('network');
    expect(r.error).toBe(CODIGO_RESPUESTA_ILEGIBLE);
    expect(r.fallo?.status).toBe(500);
    expect(r.fallo?.detalle).toMatchObject({ statusRecibido: 200 });
    const texto = mensajeParaLaPersona(r.fallo, { accion: 'enviar la solicitud' });
    expect(texto).toMatch(/^No pudimos enviar la solicitud: algo falló de nuestro lado/);
    expect(texto).not.toMatch(/conexi[oó]n/i);
  });

  it('🔴 un 502 con el HTML del balanceador conserva su status: no es la red', async () => {
    responder(502, HTML_DEL_PROXY);
    const r = await ownerPost('ag-1', '/solicitudes', {});
    expect(r.status).toBe(502);
    expect(r.error).not.toBe('network');
    expect(r.fallo?.status).toBe(502);
    expect(leerFallo(r.fallo).tipo).not.toBe('sinRespuesta');
  });

  it('un 400 del sobre trae el fallo con code y campos; la pantalla dice qué está mal', async () => {
    responderJson(400, SOBRE_400);
    const r = await ownerPost('ag-1', '/solicitudes', {});
    expect(r.status).toBe(400);
    expect(r.fallo?.code).toBe('DATOS_INVALIDOS');
    expect(camposDelError(r.fallo)).toHaveLength(1);
    const fallo = falloDeLaAccionDelPortal(r, { accion: 'enviar la solicitud', porDefecto: 'Prueba de nuevo.' });
    expect(fallo).toEqual({ tipo: 'mensaje', texto: 'La descripción no puede pasar de 2000 caracteres.' });
  });

  it('un 500 con referencia: la acción dice «de nuestro lado» con la referencia', async () => {
    responderJson(500, SOBRE_500);
    const r = await ownerPost('ag-1', '/procesos/p1/eleccion', {});
    const fallo = falloDeLaAccionDelPortal(r, { accion: 'registrar la elección', porDefecto: 'Prueba de nuevo.' });
    expect(fallo.tipo === 'mensaje' && fallo.texto).toMatch(/^No pudimos registrar la elección: algo falló de nuestro lado/);
    expect(fallo.tipo === 'mensaje' && fallo.texto).toContain('ab12cd34');
  });

  it('el código del micro (`terms_changed`) sigue en `error` para decidir, y nunca se muestra', async () => {
    responderJson(409, { error: 'terms_changed' });
    const r = await ownerPost('ag-1', '/procesos/p1/eleccion', {});
    expect(r.status).toBe(409);
    expect(r.error).toBe('terms_changed');
    expect(r.fallo?.code).toBe('terms_changed');
    const fallo = falloDeLaAccionDelPortal(r, { accion: 'registrar la elección', porDefecto: 'Prueba de nuevo.' });
    expect(fallo).toEqual({ tipo: 'mensaje', texto: 'Prueba de nuevo.' });
  });

  it('sin red: `network`, status 0 y un fallo que habla de la conexión', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const r = await ownerPost('ag-1', '/solicitudes', {});
    expect(r).toMatchObject({ ok: false, status: 0, error: 'network' });
    expect(r.fallo?.status).toBe(0);
    expect(mensajeParaLaPersona(r.fallo)).toMatch(/conexi[oó]n/i);
  });

  it('sin agencyId: «unavailable» sin fallo (Próximamente)', async () => {
    const r = await ownerPost(null, '/solicitudes', {});
    expect(r).toEqual({ ok: false, status: 0, data: null, error: 'unavailable' });
    expect(falloDeLaAccionDelPortal(r, { accion: 'x', porDefecto: 'y' })).toEqual({ tipo: 'no-habilitado' });
  });

  it('con un 2xx legible devuelve ok con los datos', async () => {
    responderJson(201, { id: 'sol-1' });
    expect(await ownerPost('ag-1', '/solicitudes', {})).toEqual({ ok: true, status: 201, data: { id: 'sol-1' }, error: null });
  });
});
