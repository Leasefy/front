/**
 * deduccionesApi.registrar — el descuento viaja como multipart con su soporte,
 * y el rechazo del back llega con su motivo y su código, sin retocar.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...real,
    getAccessToken: () => 'token-de-prueba',
    apiClient: { get: vi.fn(), post: vi.fn() },
  };
});

import { ApiError, apiClient } from '@/lib/api/client';
import { deduccionesApi } from '../deducciones.service';

const fetchReal = globalThis.fetch;
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = fetchReal;
});

const SOPORTE = new File(['%PDF'], 'predial.pdf', { type: 'application/pdf' });

describe('deduccionesApi.registrar', () => {
  it('manda motivo, valor, inmueble y el soporte como formulario, con el token', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ grupoId: 'g-1', deducciones: [] }), { status: 201 }));

    const r = await deduccionesApi.registrar('p1', {
      motivo: 'Predial 2026',
      valorCop: 350_000,
      consignacionId: 'c1',
      soporte: SOPORTE,
    });

    expect(r.grupoId).toBe('g-1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/inmobiliaria\/propietarios\/p1\/deducciones$/);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer token-de-prueba' });
    const cuerpo = init.body as FormData;
    expect(cuerpo.get('motivo')).toBe('Predial 2026');
    expect(cuerpo.get('valorCop')).toBe('350000');
    expect(cuerpo.get('consignacionId')).toBe('c1');
    expect((cuerpo.get('soporte') as File).name).toBe('predial.pdf');
  });

  it('sin inmueble no manda el campo', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ grupoId: 'g-1', deducciones: [] }), { status: 201 }));
    await deduccionesApi.registrar('p1', { motivo: 'Servicios', valorCop: 1000, consignacionId: null, soporte: SOPORTE });
    const cuerpo = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData;
    expect(cuerpo.has('consignacionId')).toBe(false);
  });

  it('🔴 un 400 del back llega con su motivo y su código', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ message: 'Adjunta el soporte del descuento', code: 'SOPORTE_OBLIGATORIO' }),
        { status: 400 },
      ),
    );

    const error = await deduccionesApi
      .registrar('p1', { motivo: 'Servicios', valorCop: 1000, soporte: SOPORTE })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).message).toBe('Adjunta el soporte del descuento');
    expect((error as ApiError).code).toBe('SOPORTE_OBLIGATORIO');
  });

  it('sin red dice que no se pudo conectar, no «registrado»', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await deduccionesApi
      .registrar('p1', { motivo: 'Servicios', valorCop: 1000, soporte: SOPORTE })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });
});

describe('deduccionesApi — lectura y anulación', () => {
  it('anular manda el motivo al grupo', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ anuladas: 2 });
    await deduccionesApi.anular('p1', 'g-1', 'Lo asumió la inmobiliaria');
    expect(apiClient.post).toHaveBeenCalledWith('/inmobiliaria/propietarios/p1/deducciones/g-1/anular', {
      motivo: 'Lo asumió la inmobiliaria',
    });
  });

  it('el soporte se pide por deducción', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ url: 'https://firmada', nombre: 'predial.pdf' });
    await deduccionesApi.urlDelSoporte('p1', 'ded-1');
    expect(apiClient.get).toHaveBeenCalledWith('/inmobiliaria/propietarios/p1/deducciones/ded-1/soporte');
  });
});

describe('deduccionesApi — la deuda del propietario y su cuenta de cobro', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it('pide la deuda del propietario, la cartera de los que deben y la cuenta de cobro a sus rutas', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({});
    vi.mocked(apiClient.post).mockResolvedValue({});

    await deduccionesApi.deuda('p1');
    await deduccionesApi.deudasDeLaAgencia();
    await deduccionesApi.cuentaDeCobro('p1', 'c9');
    await deduccionesApi.generarCuentaDeCobro('p1');

    expect(vi.mocked(apiClient.get).mock.calls.map((c) => c[0])).toEqual([
      '/inmobiliaria/propietarios/p1/deuda',
      '/inmobiliaria/deudas-de-propietarios',
      '/inmobiliaria/propietarios/p1/cuenta-de-cobro/c9',
    ]);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/inmobiliaria/propietarios/p1/cuenta-de-cobro',
      {},
    );
  });
});
