/**
 * 🔴 23-09, Nico: «que el reparto pida una certificación por cada cuenta
 * nueva». El back empareja cada archivo con su cuenta por el NOMBRE del campo
 * (`certificacion_<i>`, i = la posición en el reparto), no por el orden: si el
 * formulario mandara «un archivo por cuenta nueva, en orden», una discrepancia
 * sobre cuál es nueva correría todas las demás sin error. Esto congela esos
 * nombres, y que la descarga de la de cada cuenta va a una ruta que existe.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setAccessToken } from './client';
import { mandatoApi } from './mandato.service';
import rutas from './rutas-del-back.json';

function mockFetch(body: unknown = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
  globalThis.fetch = fn as typeof globalThis.fetch;
  return fn;
}

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

beforeEach(() => setAccessToken(null));
afterEach(() => vi.restoreAllMocks());

describe('las certificaciones del reparto viajan en su campo', () => {
  it('certificacion_<i> en la posición de cada cuenta nueva; las vigentes no mandan nada', async () => {
    const f = mockFetch({ cambio: {} });
    await mandatoApi.solicitarCambioDeCuenta('p1', {
      reparto: [
        { bankCode: 'BANCOLOMBIA', bankAccountType: 'AHORROS', bankAccountNumber: '1', titularDeLaCuenta: 'PROPIETARIO', porcentaje: 50 },
        { bankCode: 'NU_COLOMBIA', bankAccountType: 'AHORROS', bankAccountNumber: '2', titularDeLaCuenta: 'PROPIETARIO', porcentaje: 20 },
        { bankCode: 'BANCO_OCCIDENTE', bankAccountType: 'CORRIENTE', bankAccountNumber: '3', titularDeLaCuenta: 'PROPIETARIO', porcentaje: 30 },
      ],
      certificacionesPorCuenta: [null, pdf('nubank.pdf'), pdf('occidente.pdf')],
    });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/inmobiliaria\/propietarios\/p1\/cambios-de-cuenta$/);
    const cuerpo = init.body as FormData;
    const archivos = [...cuerpo.entries()]
      .filter(([, v]) => typeof v !== 'string')
      .map(([k, v]) => [k, (v as File).name]);
    expect(archivos).toEqual([
      ['certificacion_1', 'nubank.pdf'],
      ['certificacion_2', 'occidente.pdf'],
    ]);
    expect(cuerpo.has('certificacion')).toBe(false);
  });

  it('una sola cuenta sigue mandando `certificacion`', async () => {
    const f = mockFetch({ cambio: {} });
    await mandatoApi.solicitarCambioDeCuenta('p1', {
      bankCode: 'DAVIVIENDA',
      bankAccountType: 'AHORROS',
      bankAccountNumber: '450011223344',
      certificacion: pdf('davivienda.pdf'),
    });
    const cuerpo = (f.mock.calls[0] as [string, RequestInit])[1].body as FormData;
    expect((cuerpo.get('certificacion') as File).name).toBe('davivienda.pdf');
  });

  it('la certificación de la cuenta i se baja de …/certificacion-<i>, una ruta que el back tiene', async () => {
    const f = mockFetch({ url: 'https://x', nombre: 'nubank.pdf' });
    await mandatoApi.archivoDelCambio('p1', 'c1', 1);
    expect((f.mock.calls[0] as [string])[0]).toMatch(/\/inmobiliaria\/propietarios\/p1\/cambios-de-cuenta\/c1\/certificacion-1$/);
    expect(rutas.rutas).toContain(
      'GET /inmobiliaria/propietarios/:propietarioId/cambios-de-cuenta/:cambioId/:archivo',
    );
  });
});
