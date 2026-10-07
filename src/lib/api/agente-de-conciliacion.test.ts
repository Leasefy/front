/**
 * Seguimiento 6: la lectura de lo que propone el agente (micro). 404 = esta
 * versión del micro no lo tiene; 409 = el agente está apagado para la
 * inmobiliaria; otro error = `ApiError` con el sobre (lo pinta el traductor).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { agentFetch } = vi.hoisted(() => ({ agentFetch: vi.fn() }));
vi.mock('./agent-fetch', () => ({ agentFetch }));

import { leerLoQuePropone, rechazarLoQuePropone } from './agente-de-conciliacion';
import { ApiError } from './client';

const respuesta = (status: number, cuerpo: unknown = {}) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => cuerpo }) as Response;

beforeEach(() => {
  agentFetch.mockReset();
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro.test');
});

describe('lo que propone el agente', () => {
  it('pide la ruta del agente de ESA línea', async () => {
    agentFetch.mockResolvedValue(respuesta(200, { movimientoId: 'm-1', propuestas: [] }));
    const r = await leerLoQuePropone('a-1', 'm-1');
    expect(agentFetch).toHaveBeenCalledWith(
      'http://micro.test/api/agency/a-1/piloto/conciliacion/movimientos/m-1/agente',
      expect.anything(),
    );
    expect(r).toMatchObject({ estado: 'listo', analisis: { movimientoId: 'm-1' } });
  });

  it('404 es «no disponible», 409 es «apagado» y un 500 trae el sobre como ApiError', async () => {
    agentFetch.mockResolvedValueOnce(respuesta(404));
    expect((await leerLoQuePropone('a-1', 'm-1')).estado).toBe('no-disponible');
    agentFetch.mockResolvedValueOnce(respuesta(409, { code: 'AGENTE_APAGADO', message: 'Apagado' }));
    expect((await leerLoQuePropone('a-1', 'm-1')).estado).toBe('apagado');
    agentFetch.mockResolvedValueOnce(respuesta(500, { code: 'ERROR_INTERNO', message: 'Falló de nuestro lado', referencia: 'abcd1234' }));
    const r = await leerLoQuePropone('a-1', 'm-1');
    expect(r.estado).toBe('error');
    expect((r as { fallo: unknown }).fallo).toBeInstanceOf(ApiError);
  });

  it('sin la URL del micro no pregunta nada', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '');
    expect((await leerLoQuePropone('a-1', 'm-1')).estado).toBe('no-disponible');
    expect(agentFetch).not.toHaveBeenCalled();
  });

  it('«No es esta persona» manda la opción y la bandera', async () => {
    agentFetch.mockResolvedValue(respuesta(200, { ok: true }));
    await rechazarLoQuePropone('a-1', 'm-1', { tipo: 'contrato', ids: ['k-1'] }, true);
    const [url, init] = agentFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://micro.test/api/agency/a-1/piloto/conciliacion/movimientos/m-1/agente/rechazar');
    expect(JSON.parse(String(init.body))).toEqual({ opcion: { tipo: 'contrato', ids: ['k-1'] }, noEsLaPersona: true });
  });
});
