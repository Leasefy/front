/**
 * IA-C-01 (QA 04-10): el cliente de Retención ya no cae a datos inventados.
 * 404 «Retención no está habilitada» = apagada; otro fallo = se lanza.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { agentFetchMock } = vi.hoisted(() => ({ agentFetchMock: vi.fn() }));
vi.mock('../agent-fetch', () => ({ agentFetch: agentFetchMock }));

import {
  fetchBandeja,
  fetchCaseBundle,
  fetchDashboard,
  fetchDecisions,
  patchDecisionReview,
  esRetencionApagada,
} from '../retencion';

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });

const APAGADA = { error: 'Retención no está habilitada' };

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro.test');
  agentFetchMock.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe('cliente de Retención sin mock', () => {
  it('404 «no está habilitada» → apagado, sin datos (las cuatro lecturas)', async () => {
    agentFetchMock.mockImplementation(async () => respuesta(404, APAGADA));
    for (const r of [
      await fetchDashboard('ag'),
      await fetchBandeja('ag'),
      await fetchDecisions('ag'),
      await fetchCaseBundle('ag', 'owner:o1'),
    ]) {
      expect(r).toEqual({ data: null, apagado: true });
    }
  });

  it('datos reales pasan tal cual', async () => {
    agentFetchMock.mockResolvedValue(respuesta(200, { cards: [], urgent: [] }));
    expect(await fetchDashboard('ag')).toEqual({ data: { cards: [], urgent: [] }, apagado: false });
  });

  it('🔴 un 500 ya no se tapa con datos inventados: se lanza', async () => {
    agentFetchMock.mockResolvedValue(respuesta(500, { statusCode: 500, message: 'falló' }));
    await expect(fetchDashboard('ag')).rejects.toMatchObject({ status: 500 });
    await expect(fetchBandeja('ag')).rejects.toMatchObject({ status: 500 });
  });

  it('un 404 de «caso inexistente» no es «apagada»', async () => {
    agentFetchMock.mockResolvedValue(respuesta(404, { error: 'Caso no encontrado' }));
    await expect(fetchCaseBundle('ag', 'owner:x')).rejects.toMatchObject({ status: 404 });
  });

  it('revisar una decisión con el micro fallando lanza (antes «revisaba» una inventada)', async () => {
    agentFetchMock.mockResolvedValue(respuesta(500, { message: 'falló' }));
    await expect(patchDecisionReview('ag', 'd1', { reviewOutcome: 'confirmed' as never })).rejects.toBeTruthy();
  });

  it('sin micro configurado → apagada, nunca datos de ejemplo', async () => {
    vi.stubEnv('NEXT_PUBLIC_AGENT_URL', '');
    expect(await fetchDashboard('ag')).toEqual({ data: null, apagado: true });
    expect(agentFetchMock).not.toHaveBeenCalled();
  });

  it('esRetencionApagada', () => {
    expect(esRetencionApagada(404, APAGADA)).toBe(true);
    expect(esRetencionApagada(404, { code: 'RETENCION_NO_HABILITADA' })).toBe(true);
    expect(esRetencionApagada(500, APAGADA)).toBe(false);
    expect(esRetencionApagada(404, null)).toBe(false);
  });
});
