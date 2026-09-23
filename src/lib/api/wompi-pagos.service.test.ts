/**
 * El contrato de Wompi · Pagos a terceros con el back, congelado: ruta, verbo
 * y el juego EXACTO de claves de cada cuerpo (el back valida con
 * `forbidNonWhitelisted`). Las rutas existen en el back: están en
 * `rutas-del-back.json` (lo vigila `rutas-que-el-back-no-tiene.guardian`).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setAccessToken } from './client';
import { wompiPagosApi } from './wompi-pagos.service';
import rutas from './rutas-del-back.json';

const BASE = 'http://localhost:3000/inmobiliaria/wompi-pagos';
const LOTE = '6b0f2e2c-1d4a-4a2b-9c3e-0f1a2b3c4d5e';

function mockFetch(body: unknown = {}, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
  globalThis.fetch = fn as typeof globalThis.fetch;
  return fn;
}

function llamada(fetchMock: ReturnType<typeof vi.fn>, n = 0) {
  const [url, init] = fetchMock.mock.calls[n] as [string, RequestInit];
  return { url, metodo: init.method, cuerpo: init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined };
}

beforeEach(() => setAccessToken(null));
afterEach(() => vi.restoreAllMocks());

describe('wompiPagosApi', () => {
  it('guardar las llaves es un PUT con exactamente ambiente, apiKey y usuarioPrincipalId (sin espacios)', async () => {
    const f = mockFetch({ disponible: true, motivo: null, conexion: null });
    await wompiPagosApi.guardarConexion({ ambiente: 'PRODUCCION', apiKey: ' prv_prod_x ', usuarioPrincipalId: ' up-1 ' });
    expect(llamada(f)).toEqual({
      url: `${BASE}/conexion`,
      metodo: 'PUT',
      cuerpo: { ambiente: 'PRODUCCION', apiKey: 'prv_prod_x', usuarioPrincipalId: 'up-1' },
    });
  });

  it('el secreto de eventos viaja sólo si se escribió', async () => {
    const f = mockFetch({});
    await wompiPagosApi.guardarConexion({ ambiente: 'SANDBOX', apiKey: 'k', usuarioPrincipalId: 'u', secretoDeEventos: 's' });
    expect(llamada(f).cuerpo).toEqual({ ambiente: 'SANDBOX', apiKey: 'k', usuarioPrincipalId: 'u', secretoDeEventos: 's' });
  });

  it('enviar el lote es un POST sin claves de más; facturarAhora sólo si se decidió', async () => {
    const f = mockFetch({});
    await wompiPagosApi.enviar(LOTE);
    await wompiPagosApi.enviar(LOTE, true);
    expect(llamada(f, 0)).toEqual({ url: `${BASE}/lotes/${LOTE}/enviar`, metodo: 'POST', cuerpo: {} });
    expect(llamada(f, 1).cuerpo).toEqual({ facturarAhora: true });
  });

  it('ver, probar y consultar van a sus rutas', async () => {
    const f = mockFetch({});
    await wompiPagosApi.verConexion();
    await wompiPagosApi.probarConexion();
    await wompiPagosApi.verLote(LOTE);
    await wompiPagosApi.consultar(LOTE);
    expect([0, 1, 2, 3].map((n) => `${llamada(f, n).metodo} ${llamada(f, n).url}`)).toEqual([
      `GET ${BASE}/conexion`,
      `POST ${BASE}/conexion/probar`,
      `GET ${BASE}/lotes/${LOTE}`,
      `POST ${BASE}/lotes/${LOTE}/consultar`,
    ]);
  });

  it('🔴 cada ruta que se pide EXISTE en el back', () => {
    const delBack = new Set(rutas.rutas);
    for (const r of [
      'GET /inmobiliaria/wompi-pagos/conexion',
      'PUT /inmobiliaria/wompi-pagos/conexion',
      'POST /inmobiliaria/wompi-pagos/conexion/probar',
      'GET /inmobiliaria/wompi-pagos/lotes/:id',
      'POST /inmobiliaria/wompi-pagos/lotes/:id/enviar',
      'POST /inmobiliaria/wompi-pagos/lotes/:id/consultar',
    ]) {
      expect(delBack.has(r), r).toBe(true);
    }
  });
});
