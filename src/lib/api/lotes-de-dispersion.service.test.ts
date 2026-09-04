/**
 * El contrato de los lotes de dispersión, congelado.
 *
 * Son giros de cientos de millones: la ruta, el verbo y el juego EXACTO de
 * claves de cada cuerpo no pueden derivar sin que algo se ponga rojo. El back
 * valida con `forbidNonWhitelisted` — una clave de más es un 400 en
 * producción con la suite en verde.
 *
 * 🔴 La base es `/inmobiliaria/lotes-de-dispersion`, NO
 * `/inmobiliaria/dispersiones/lotes`: colgado de dispersiones, `GET .../lotes`
 * entra al `GET :id` de ese controller como `id="lotes"` y da 400.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setAccessToken } from './client';
import { lotesDeDispersionApi } from './lotes-de-dispersion.service';

const BACKEND_URL = 'http://localhost:3000';
const BASE = `${BACKEND_URL}/inmobiliaria/lotes-de-dispersion`;
const ID = '6b0f2e2c-1d4a-4a2b-9c3e-0f1a2b3c4d5e';

const LOTE = {
  id: ID,
  month: '2026-08',
  estado: 'BORRADOR',
  totalCop: 34_000_000,
  cantidad: 3,
  creadoPorUserId: 'u-1',
  aprobadoPorUserId: null,
  items: [],
};

function mockFetch(body: unknown = LOTE, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
  globalThis.fetch = fn as typeof globalThis.fetch;
  return fn;
}

function cuerpoDe(fetchMock: ReturnType<typeof vi.fn>, llamada = 0): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[llamada] as [string, RequestInit];
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

beforeEach(() => {
  // `request()` espera al AuthProvider con un tope de 3 s; sin esto cada test se lo come.
  setAccessToken(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('lotesDeDispersionApi.armar', () => {
  it('POST a la base con SÓLO `month`', async () => {
    const fetchMock = mockFetch({ lote: LOTE, excluidos: [] });

    const r = await lotesDeDispersionApi.armar('2026-08');

    expect(r.lote.id).toBe(ID);
    expect(fetchMock).toHaveBeenCalledWith(BASE, expect.objectContaining({ method: 'POST' }));
    expect(cuerpoDe(fetchMock)).toEqual({ month: '2026-08' });
  });
});

describe('lotesDeDispersionApi.listar', () => {
  it('GET a la base sin query cuando no hay filtros', async () => {
    const fetchMock = mockFetch([LOTE]);

    const r = await lotesDeDispersionApi.listar();

    expect(r).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(BASE, expect.objectContaining({ method: 'GET' }));
  });

  it('manda `month` y `estado` como query, y acepta la lista envuelta en { data }', async () => {
    const fetchMock = mockFetch({ data: [LOTE] });

    const r = await lotesDeDispersionApi.listar({ month: '2026-08', estado: 'APROBADO' });

    expect(r).toEqual([LOTE]);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}?month=2026-08&estado=APROBADO`);
  });
});

describe('lotesDeDispersionApi.ver', () => {
  it('GET /:id y devuelve la vista tal cual (lote, excluidos, intentos, bloqueado)', async () => {
    const vista = { lote: LOTE, excluidos: [], intentosRestantes: 5, bloqueado: false };
    const fetchMock = mockFetch(vista);

    const r = await lotesDeDispersionApi.ver(ID);

    expect(r).toEqual(vista);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/${ID}`);
  });
});

describe('lotesDeDispersionApi.solicitarAprobacion', () => {
  it('POST /:id/solicitar-aprobacion sin cuerpo', async () => {
    const fetchMock = mockFetch({
      lote: { ...LOTE, estado: 'ESPERANDO_APROBACION' },
      exigeCodigo: true,
      motivoDelCodigo: 'La inmobiliaria tiene prendido el PIN para todos los lotes.',
      expiraAt: '2026-09-01T15:10:00.000Z',
      enviadoA: ['con***@portofino.co'],
    });

    const r = await lotesDeDispersionApi.solicitarAprobacion(ID);

    expect(r.enviadoA).toEqual(['con***@portofino.co']);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/${ID}/solicitar-aprobacion`);
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });
});

describe('lotesDeDispersionApi.aprobar', () => {
  it('POST /:id/aprobar con `codigo` cuando hay', async () => {
    const fetchMock = mockFetch({ ...LOTE, estado: 'APROBADO' });

    await lotesDeDispersionApi.aprobar(ID, ' 048213 ');

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/${ID}/aprobar`);
    expect(cuerpoDe(fetchMock)).toEqual({ codigo: '048213' });
  });

  it('🔴 sin código manda un cuerpo VACÍO — `codigo: undefined` también es una clave de más', async () => {
    const fetchMock = mockFetch({ ...LOTE, estado: 'APROBADO' });

    await lotesDeDispersionApi.aprobar(ID);
    await lotesDeDispersionApi.aprobar(ID, '   ');

    expect(cuerpoDe(fetchMock, 0)).toEqual({});
    expect(cuerpoDe(fetchMock, 1)).toEqual({});
  });
});

describe('lotesDeDispersionApi.generarArchivo', () => {
  const ARCHIVO = {
    nombreArchivo: 'lote-2026-08-bancolombia_pab-SIN-VERIFICAR-6b0f2e2c.txt',
    contenido: '...',
    hash: 'abc',
    formato: 'BANCOLOMBIA_PAB',
    cantidad: 3,
    totalCop: 34_000_000,
    excluidos: [],
    advertencias: [],
    layoutVerificado: false,
    pendienteDeConfirmar: [],
    reenvio: false,
  };

  it('POST /:id/archivo con `formato` cuando se elige uno', async () => {
    const fetchMock = mockFetch(ARCHIVO);

    const r = await lotesDeDispersionApi.generarArchivo(ID, 'BANCOLOMBIA_PAB');

    expect(r.layoutVerificado).toBe(false);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/${ID}/archivo`);
    expect(cuerpoDe(fetchMock)).toEqual({ formato: 'BANCOLOMBIA_PAB' });
  });

  it('sin formato manda un cuerpo vacío (el back usa el del lote o el de la inmobiliaria)', async () => {
    const fetchMock = mockFetch(ARCHIVO);

    await lotesDeDispersionApi.generarArchivo(ID);

    expect(cuerpoDe(fetchMock)).toEqual({});
  });
});

describe('lotesDeDispersionApi.descargarArchivo', () => {
  it('GET /:id/archivo y devuelve el Blob tal cual', async () => {
    const blob = new Blob(['01234567890'], { type: 'text/plain' });
    const fn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => blob,
      json: async () => ({}),
    } as unknown as Response);
    globalThis.fetch = fn as typeof globalThis.fetch;

    const r = await lotesDeDispersionApi.descargarArchivo(ID);

    expect(r).toBe(blob);
    expect(fn).toHaveBeenCalledWith(`${BASE}/${ID}/archivo`, expect.objectContaining({ method: 'GET' }));
  });

  it('relanza el mensaje del back cuando el lote no está en ARCHIVO_GENERADO', async () => {
    mockFetch({ message: 'El lote está en BORRADOR: primero generá el archivo con POST /:id/archivo.' }, 400);

    await expect(lotesDeDispersionApi.descargarArchivo(ID)).rejects.toThrow(
      'El lote está en BORRADOR',
    );
  });
});

describe('lotesDeDispersionApi.marcarPagado', () => {
  it('POST /:id/pagado con SÓLO `referenciaBanco`, recortada', async () => {
    const fetchMock = mockFetch({ ...LOTE, estado: 'PAGADO' });

    await lotesDeDispersionApi.marcarPagado(ID, '  BC-20260907-00123 ');

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/${ID}/pagado`);
    expect(cuerpoDe(fetchMock)).toEqual({ referenciaBanco: 'BC-20260907-00123' });
  });
});

describe('lotesDeDispersionApi.anular', () => {
  it('POST /:id/anular con SÓLO `motivo`', async () => {
    const fetchMock = mockFetch({ ...LOTE, estado: 'ANULADO' });

    await lotesDeDispersionApi.anular(ID, 'Dos propietarios cambiaron de cuenta ');

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/${ID}/anular`);
    expect(cuerpoDe(fetchMock)).toEqual({ motivo: 'Dos propietarios cambiaron de cuenta' });
  });

  it('el mensaje del back llega tal cual (un lote pagado no se anula)', async () => {
    mockFetch(
      { message: 'El lote ya está pagado: la plata salió. Un pago hecho se corrige con una contrapartida, no anulando el lote.' },
      400,
    );

    await expect(lotesDeDispersionApi.anular(ID, 'porque sí, cinco')).rejects.toThrow(
      'El lote ya está pagado',
    );
  });
});
