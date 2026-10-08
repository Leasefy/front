/**
 * IA-C-01 (QA 04-10): el cliente de Retención (Vinci) no cae a datos inventados.
 * 404 «… no está habilitado» = `RetencionApagadaError`; otro fallo = `ErrorDeVinci`
 * (un `ApiError`, que lee `EstadoDeDatos`). Va por `agentFetch`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from '../client';

const { agentFetchMock } = vi.hoisted(() => ({ agentFetchMock: vi.fn() }));
vi.mock('../agent-fetch', () => ({ agentFetch: agentFetchMock }));

import {
  ErrorDeVinci,
  RetencionApagadaError,
  esCuerpoDeRetencionApagada,
  esRetencionApagada,
  fetchDecisiones,
  fetchMetricas,
  fetchPlan,
  fetchRiesgo,
  revisarDecision,
} from '../retencion';

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });

// Lo que responde hoy el micro con RETENCION_ENABLED apagada (agency-retencion-vinci.ts).
const APAGADA = { error: 'Vinci (retención) no está habilitado en este entorno (RETENCION_ENABLED).' };

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro.test');
  agentFetchMock.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe('cliente de Retención (Vinci) sin mock', () => {
  it('404 «no está habilitado» → RetencionApagadaError en las lecturas, sin datos ni el texto del micro', async () => {
    agentFetchMock.mockImplementation(async () => respuesta(404, APAGADA));
    for (const leer of [() => fetchRiesgo('ag'), () => fetchMetricas('ag'), () => fetchDecisiones('ag'), () => fetchPlan('ag', 'p1')]) {
      const err = await leer().then(
        () => null,
        (e: unknown) => e,
      );
      expect(esRetencionApagada(err)).toBe(true);
      expect((err as Error).message).not.toMatch(/RETENCION_ENABLED/);
    }
  });

  it('va por agentFetch (bearer y token renovado), a la ruta de la inmobiliaria', async () => {
    agentFetchMock.mockResolvedValue(respuesta(200, { casos: [] }));
    expect(await fetchRiesgo('ag 1')).toEqual({ casos: [] });
    expect(agentFetchMock).toHaveBeenCalledWith('http://micro.test/api/agency/ag%201/retencion/riesgo', expect.anything());
  });

  it('🔴 un 500 ya no se tapa con datos inventados: se lanza como ApiError con su status y su frase', async () => {
    agentFetchMock.mockResolvedValue(respuesta(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Algo falló de nuestro lado.' }));
    const err = await fetchRiesgo('ag').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ErrorDeVinci);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 500, code: 'ERROR_INTERNO', message: 'Algo falló de nuestro lado.' });
    expect(esRetencionApagada(err)).toBe(false);
  });

  it('un 404 de «caso inexistente» no es «apagada»', async () => {
    agentFetchMock.mockResolvedValue(respuesta(404, { error: 'Ese caso no es de Vinci (inquilino:<contrato> o propietario:<id>).', code: 'no_existe' }));
    const err = await fetchPlan('ag', 'x').catch((e: unknown) => e);
    expect(esRetencionApagada(err)).toBe(false);
    expect(err).toMatchObject({ status: 404, code: 'no_existe' });
  });

  it('revisar una decisión con el micro fallando lanza (antes «revisaba» una inventada)', async () => {
    agentFetchMock.mockResolvedValue(respuesta(500, { message: 'falló' }));
    await expect(revisarDecision('ag', 'd1', 'confirmed' as never)).rejects.toBeInstanceOf(ErrorDeVinci);
  });

  it('sin micro configurado → apagada, nunca datos de ejemplo', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '');
    // `base()` lanza antes de pedir: en la carga (`await` dentro del try) es lo mismo que un rechazo.
    await expect((async () => fetchRiesgo('ag'))()).rejects.toBeInstanceOf(RetencionApagadaError);
    expect(agentFetchMock).not.toHaveBeenCalled();
  });

  it('esCuerpoDeRetencionApagada', () => {
    expect(esCuerpoDeRetencionApagada(404, APAGADA)).toBe(true);
    expect(esCuerpoDeRetencionApagada(404, { error: 'Retención no está habilitada' })).toBe(true);
    expect(esCuerpoDeRetencionApagada(404, { code: 'RETENCION_NO_HABILITADA' })).toBe(true);
    expect(esCuerpoDeRetencionApagada(500, APAGADA)).toBe(false);
    expect(esCuerpoDeRetencionApagada(404, null)).toBe(false);
  });
});
