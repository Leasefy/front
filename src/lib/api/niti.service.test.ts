/**
 * Niti · calidad — las tres rutas de panel del micro, contra el CONTRATO.
 *
 * El micro las construye en paralelo; la forma está fijada en
 * `__tests__/niti-contrato.json` (sección `panel`, copia verbatim de
 * `sesion-2026-09-22/cierre-de-agentes/niti-contrato.json`). Estas pruebas le
 * dan a `agentFetch` los cuerpos de ejemplo del contrato y exigen que el
 * cliente los entregue tal cual: si el contrato cambia y el cliente no, cae.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const agentFetchMock = vi.fn();
vi.mock('./agent-fetch', () => ({ agentFetch: (...a: unknown[]) => agentFetchMock(...a) }));

import contrato from './__tests__/niti-contrato.json';
import { ApiError } from './client';
import { nitiApi, NitiNoDisponibleError } from './niti.service';

const AGENCY = 'a0000000-0000-4000-8000-000000000001';
const panel = contrato.panel;

function respuesta(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  agentFetchMock.mockReset();
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agent.test';
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_AGENT_URL;
});

describe('nitiApi.resumen', () => {
  it('pide GET /api/agency/{agencyId}/calidad/resumen y entrega el cuerpo del contrato tal cual', async () => {
    agentFetchMock.mockResolvedValueOnce(respuesta(200, panel.resumen.cuerpo));

    const r = await nitiApi.resumen(AGENCY);

    expect(agentFetchMock).toHaveBeenCalledOnce();
    const [url, init] = agentFetchMock.mock.calls[0] as [string, RequestInit | undefined];
    expect(url).toBe(`http://agent.test/api/agency/${AGENCY}/calidad/resumen`);
    expect(init?.method ?? 'GET').toBe('GET');
    expect(r).toEqual(panel.resumen.cuerpo);
  });

  it('apagado: `activo: false` llega como tal (la pantalla no pide la lista)', async () => {
    agentFetchMock.mockResolvedValueOnce(
      respuesta(200, { ...panel.resumen.cuerpo, activo: false, ultimaPasada: null, puntajePromedio: null }),
    );
    const r = await nitiApi.resumen(AGENCY);
    expect(r.activo).toBe(false);
    expect(r.ultimaPasada).toBeNull();
    expect(r.puntajePromedio).toBeNull();
  });

  it('sin `fotosIA` (micro más viejo) la IA de fotos se lee apagada, no revienta', async () => {
    const { fotosIA: _fuera, ...sinFotos } = panel.resumen.cuerpo;
    void _fuera;
    agentFetchMock.mockResolvedValueOnce(respuesta(200, sinFotos));
    const r = await nitiApi.resumen(AGENCY);
    expect(r.fotosIA.activo).toBe(false);
  });
});

describe('nitiApi.inmuebles', () => {
  it('pide la página con page, limit y filtro, y entrega los items del contrato tal cual', async () => {
    agentFetchMock.mockResolvedValueOnce(respuesta(200, panel.inmuebles.cuerpo));

    const r = await nitiApi.inmuebles(AGENCY, { page: 2, limit: 50, filtro: 'posible_tomado' });

    const [url] = agentFetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      `http://agent.test/api/agency/${AGENCY}/calidad/inmuebles?page=2&limit=50&filtro=posible_tomado`,
    );
    expect(r).toEqual(panel.inmuebles.cuerpo);
    // Lo que el asesor lee sale VERBATIM del contrato (D-01 del back).
    expect(r.items[0].falta[0].que).toBe('4 fotos más (el aviso necesita al menos 5)');
    expect(r.items[0].href).toBe('/panel/inmobiliaria/inmuebles/f0000000-0000-4000-8000-000000000001');
  });

  it('sin filtros: página 1, 20 por página y «todos» (lo que dice la ruta del contrato)', async () => {
    agentFetchMock.mockResolvedValueOnce(respuesta(200, { items: [], total: 0, page: 1, limit: 20 }));
    await nitiApi.inmuebles(AGENCY);
    const [url] = agentFetchMock.mock.calls[0] as [string];
    expect(url).toBe(`http://agent.test/api/agency/${AGENCY}/calidad/inmuebles?page=1&limit=20&filtro=todos`);
  });

  it('un item sin listas (falta, problemas, fotos, propuestas) se lee con listas vacías', async () => {
    const base = panel.inmuebles.cuerpo.items[0];
    const { falta: _f, problemas: _p, fotosSenaladas: _s, propuestas: _q, ...pelado } = base;
    void _f;
    void _p;
    void _s;
    void _q;
    agentFetchMock.mockResolvedValueOnce(respuesta(200, { items: [pelado], total: 1, page: 1, limit: 20 }));
    const r = await nitiApi.inmuebles(AGENCY);
    expect(r.items[0]).toMatchObject({ falta: [], problemas: [], fotosSenaladas: [], propuestas: [] });
  });

  it('una propuesta con una acción que el front no conoce se conserva, marcada como desconocida', async () => {
    const base = panel.inmuebles.cuerpo.items[0];
    agentFetchMock.mockResolvedValueOnce(
      respuesta(200, {
        ...panel.inmuebles.cuerpo,
        items: [{ ...base, propuestas: [{ id: 'x', tipo: 'aplicable', texto: 'Algo nuevo', accion: 'teletransportar' }] }],
      }),
    );
    const r = await nitiApi.inmuebles(AGENCY);
    expect(r.items[0].propuestas[0]).toEqual({ id: 'x', tipo: 'aplicable', texto: 'Algo nuevo', accion: 'desconocida' });
  });
});

describe('nitiApi.decidir', () => {
  const ID = panel.decidir.respuesta.cuerpo.id;

  it('approve: POST …/calidad/propuestas/{id}/decision con el cuerpo del contrato, y entrega la respuesta', async () => {
    agentFetchMock.mockResolvedValueOnce(respuesta(200, panel.decidir.respuesta.cuerpo));

    const r = await nitiApi.decidir(AGENCY, ID, 'approve');

    const [url, init] = agentFetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://agent.test/api/agency/${AGENCY}/calidad/propuestas/${ID}/decision`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual(panel.decidir.cuerpo);
    expect(r).toEqual(panel.decidir.respuesta.cuerpo);
  });

  it('reject: el cuerpo es el de `otras` del contrato', async () => {
    agentFetchMock.mockResolvedValueOnce(
      respuesta(200, { id: ID, estado: 'rechazada', mensaje: 'Listo: Niti no la vuelve a proponer.' }),
    );
    const r = await nitiApi.decidir(AGENCY, ID, 'reject');
    const [, init] = agentFetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual(panel.decidir.otras[0]);
    expect(r.estado).toBe('rechazada');
  });

  it('`fallida` (el back contestó 409/422/403) llega como respuesta, con el motivo en `mensaje`', async () => {
    agentFetchMock.mockResolvedValueOnce(
      respuesta(200, { id: ID, estado: 'fallida', mensaje: 'El dato cambió desde que Niti lo propuso.' }),
    );
    const r = await nitiApi.decidir(AGENCY, ID, 'approve');
    expect(r).toEqual({ id: ID, estado: 'fallida', mensaje: 'El dato cambió desde que Niti lo propuso.' });
  });

  it('el id viaja codificado en el camino', async () => {
    agentFetchMock.mockResolvedValueOnce(respuesta(200, { id: 'a/b', estado: 'hecha', mensaje: 'ok' }));
    await nitiApi.decidir(AGENCY, 'a/b', 'approve');
    const [url] = agentFetchMock.mock.calls[0] as [string];
    expect(url).toContain('/calidad/propuestas/a%2Fb/decision');
  });
});

describe('errores', () => {
  it('un error del micro sube como ApiError con su status y su mensaje en español', async () => {
    agentFetchMock.mockResolvedValueOnce(respuesta(404, { error: 'Esa propuesta ya no existe.' }));
    const e = await nitiApi.decidir(AGENCY, 'c-1', 'approve').catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).status).toBe(404);
    expect((e as ApiError).message).toBe('Esa propuesta ya no existe.');
  });

  it('un 403 sin mensaje se dice en español', async () => {
    agentFetchMock.mockResolvedValueOnce(respuesta(403, {}));
    const e = await nitiApi.resumen(AGENCY).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).status).toBe(403);
    expect((e as ApiError).message).toMatch(/permiso/i);
  });

  it('un cuerpo que no es el del contrato no se pinta como si lo fuera', async () => {
    agentFetchMock.mockResolvedValueOnce(respuesta(200, '<html>proxy</html>'));
    await expect(nitiApi.inmuebles(AGENCY)).rejects.toBeInstanceOf(Error);
  });

  it('sin NEXT_PUBLIC_AGENT_URL no sale ninguna llamada', async () => {
    delete process.env.NEXT_PUBLIC_AGENT_URL;
    await expect(nitiApi.resumen(AGENCY)).rejects.toBeInstanceOf(NitiNoDisponibleError);
    expect(agentFetchMock).not.toHaveBeenCalled();
  });
});
