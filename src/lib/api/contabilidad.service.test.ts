/**
 * contabilidad.service — reportes, cierre y detalle.
 *
 * Lo que se fija acá es el CONTRATO con el back: la ruta exacta, el query
 * exacto y el cuerpo exacto. El `ValidationPipe` del back corre con
 * `forbidNonWhitelisted`, así que una clave de más no se ignora: es un 400.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { clienteMock } = vi.hoisted(() => ({
  clienteMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('./client', () => ({ apiClient: clienteMock }));

import { contabilidadApi, CLAVES_DE_CERRAR } from './contabilidad.service';

beforeEach(() => {
  clienteMock.get.mockReset().mockResolvedValue({});
  clienteMock.post.mockReset().mockResolvedValue({});
});

describe('reportes.balanceDePrueba', () => {
  it('sin filtros pega a la ruta pelada', async () => {
    await contabilidadApi.reportes.balanceDePrueba();
    expect(clienteMock.get).toHaveBeenCalledWith('/inmobiliaria/contabilidad/reportes/balance-de-prueba');
  });

  it('manda el rango y soloConMovimiento como texto (el DTO es @IsBooleanString)', async () => {
    await contabilidadApi.reportes.balanceDePrueba({
      desde: '2026-01-01',
      hasta: '2026-01-31',
      soloConMovimiento: false,
    });
    const [ruta] = clienteMock.get.mock.calls[0];
    const url = new URL(ruta, 'http://x');
    expect(url.pathname).toBe('/inmobiliaria/contabilidad/reportes/balance-de-prueba');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      desde: '2026-01-01',
      hasta: '2026-01-31',
      soloConMovimiento: 'false',
    });
  });

  it('no manda claves vacías', async () => {
    await contabilidadApi.reportes.balanceDePrueba({ desde: '', hasta: undefined });
    expect(clienteMock.get).toHaveBeenCalledWith('/inmobiliaria/contabilidad/reportes/balance-de-prueba');
  });
});

describe('reportes.libroAuxiliar', () => {
  it('lleva la cuenta en la ruta y el rango en el query', async () => {
    await contabilidadApi.reportes.libroAuxiliar('c1', { desde: '2026-02-01', hasta: '2026-02-28' });
    const [ruta] = clienteMock.get.mock.calls[0];
    const url = new URL(ruta, 'http://x');
    expect(url.pathname).toBe('/inmobiliaria/contabilidad/reportes/libro-auxiliar/c1');
    expect(Object.fromEntries(url.searchParams)).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
  });

  it('codifica el id en la ruta', async () => {
    await contabilidadApi.reportes.libroAuxiliar('a/b');
    expect(clienteMock.get).toHaveBeenCalledWith(
      '/inmobiliaria/contabilidad/reportes/libro-auxiliar/a%2Fb',
    );
  });
});

describe('reportes.estadoDeCuenta', () => {
  it('manda tipo e id del tercero, obligatorios, más el rango', async () => {
    await contabilidadApi.reportes.estadoDeCuenta({
      terceroTipo: 'PROPIETARIO',
      terceroId: 'p-1',
      hasta: '2026-03-31',
    });
    const [ruta] = clienteMock.get.mock.calls[0];
    const url = new URL(ruta, 'http://x');
    expect(url.pathname).toBe('/inmobiliaria/contabilidad/reportes/estado-de-cuenta');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      terceroTipo: 'PROPIETARIO',
      terceroId: 'p-1',
      hasta: '2026-03-31',
    });
  });
});

describe('asientos.cierre / cerrar / detalle', () => {
  it('cierre es un GET a /asientos/cierre', async () => {
    clienteMock.get.mockResolvedValue({ cerradaHasta: '2026-01-31' });
    const r = await contabilidadApi.asientos.cierre();
    expect(clienteMock.get).toHaveBeenCalledWith('/inmobiliaria/contabilidad/asientos/cierre');
    expect(r.cerradaHasta).toBe('2026-01-31');
  });

  it('cerrar manda SOLO { hasta } — CerrarPeriodoDto no admite nada más', async () => {
    await contabilidadApi.asientos.cerrar('2026-02-28');
    expect(clienteMock.post).toHaveBeenCalledWith('/inmobiliaria/contabilidad/asientos/cerrar', {
      hasta: '2026-02-28',
    });
    expect([...CLAVES_DE_CERRAR]).toEqual(['hasta']);
  });

  it('detalle codifica el id', async () => {
    await contabilidadApi.asientos.detalle('x y');
    expect(clienteMock.get).toHaveBeenCalledWith('/inmobiliaria/contabilidad/asientos/x%20y');
  });
});

describe('mapeo', () => {
  it('obtener pega al GET pelado', async () => {
    await contabilidadApi.mapeo.obtener();
    expect(clienteMock.get).toHaveBeenCalledWith('/inmobiliaria/contabilidad/mapeo');
  });

  it('guardar manda { entradas } con SOLO evento y cuentaId por entrada (forbidNonWhitelisted)', async () => {
    clienteMock.put.mockReset().mockResolvedValue({});
    await contabilidadApi.mapeo.guardar([
      { evento: 'RECIBO_BANCOS', cuentaId: 'c-1', nombre: 'de más' } as never,
    ]);
    expect(clienteMock.put).toHaveBeenCalledWith('/inmobiliaria/contabilidad/mapeo', {
      entradas: [{ evento: 'RECIBO_BANCOS', cuentaId: 'c-1' }],
    });
  });

  it('sembrar hace POST a /mapeo/semilla', async () => {
    await contabilidadApi.mapeo.sembrar();
    expect(clienteMock.post).toHaveBeenCalledWith('/inmobiliaria/contabilidad/mapeo/semilla', {});
  });
});
