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

/**
 * Los rubros del P&G (contrato del 18-09, §1). Lo que se fija: que el PUT
 * reemplaza el juego completo de cuentas de UN rubro con las dos claves del
 * DTO, y que una lista vacía sí viaja — «este rubro no se mide con el libro» es
 * una decisión, y omitirla dejaría el mapeo anterior en pie.
 */
describe('mapeo de rubros', () => {
  it('rubros pega al GET /mapeo/rubros', async () => {
    await contabilidadApi.mapeo.rubros();
    expect(clienteMock.get).toHaveBeenCalledWith('/inmobiliaria/contabilidad/mapeo/rubros');
  });

  it('guardarRubro manda SOLO rubro y cuentaIds (forbidNonWhitelisted)', async () => {
    clienteMock.put.mockReset().mockResolvedValue({});
    await contabilidadApi.mapeo.guardarRubro({
      rubro: 'gastos',
      cuentaIds: ['c-1', 'c-2'],
      nombre: 'de más',
    } as never);
    expect(clienteMock.put).toHaveBeenCalledWith('/inmobiliaria/contabilidad/mapeo/rubros', {
      rubro: 'gastos',
      cuentaIds: ['c-1', 'c-2'],
    });
  });

  it('una lista vacía VIAJA: deja el rubro sin mapear, no lo omite', async () => {
    clienteMock.put.mockReset().mockResolvedValue({});
    await contabilidadApi.mapeo.guardarRubro({ rubro: 'nomina', cuentaIds: [] });
    expect(clienteMock.put).toHaveBeenCalledWith('/inmobiliaria/contabilidad/mapeo/rubros', {
      rubro: 'nomina',
      cuentaIds: [],
    });
  });

  /**
   * 🔴 22-09 · ESTA PRUEBA ES EL EJEMPLO DE POR QUÉ EL CI NO VEÍA EL DEFECTO.
   *
   * Decía `/mapeo/rubros/sembrar` y el back expone `@Post('rubros/semilla')`.
   * Verde durante todo ese tiempo, porque lo único que comprobaba era que le
   * mandáramos al doble de `apiClient` exactamente la ruta equivocada. Al
   * usuario, el botón «Sembrar el preset» le respondía 404.
   *
   * Una prueba que espía al cliente HTTP verifica QUÉ pedimos, nunca si eso
   * existe. Lo segundo lo vigila `rutas-que-el-back-no-tiene.guardian.test.ts`,
   * que compara contra la tabla de rutas real del back.
   */
  it('sembrarRubros hace POST a /mapeo/rubros/semilla', async () => {
    await contabilidadApi.mapeo.sembrarRubros();
    expect(clienteMock.post).toHaveBeenCalledWith(
      '/inmobiliaria/contabilidad/mapeo/rubros/semilla',
      {},
    );
  });

  it('borrarRubro codifica el rubro en la ruta', async () => {
    clienteMock.delete.mockReset().mockResolvedValue(undefined);
    await contabilidadApi.mapeo.borrarRubro('gastos de administración');
    expect(clienteMock.delete).toHaveBeenCalledWith(
      '/inmobiliaria/contabilidad/mapeo/rubros/gastos%20de%20administraci%C3%B3n',
    );
  });
});

/**
 * Los siete eventos de gasto (§2).
 *
 * 🔴 NO son valores del enum `EventoContable`: son texto con CHECK en una tabla
 * propia, porque agregar un valor a un enum de Postgres es irreversible. Por eso
 * tienen su propia ruta (`PUT /mapeo/gastos`), y por eso el test más importante
 * de este bloque es el que comprueba que NO se van por `PUT /mapeo` — los dos
 * cuerpos son idénticos, el tipo no los distingue, y el error saldría como un
 * 400 `EVENTO_DESCONOCIDO` en producción.
 */
describe('los eventos de gasto', () => {
  it('son los siete del contrato, sin repetirse con los de recaudo', async () => {
    const { EVENTOS_DE_GASTO, EVENTOS_CONTABLES } = await import('./contabilidad.service');
    expect([...EVENTOS_DE_GASTO]).toEqual([
      'GASTO_SIN_RUBRO',
      'IVA_DESCONTABLE',
      'GASTO_POR_PAGAR',
      'RETEFUENTE_PRACTICADA',
      'RETEIVA_PRACTICADA',
      'RETEICA_PRACTICADA',
      'EGRESO_BANCOS',
    ]);
    const cruce = EVENTOS_DE_GASTO.filter((e) =>
      (EVENTOS_CONTABLES as readonly string[]).includes(e),
    );
    expect(cruce).toEqual([]);
  });

  /*
   * 🔴 Los de gasto NO son valores del enum `EventoContable` (agregar uno a un
   * enum de Postgres es irreversible): son texto con CHECK en una tabla propia,
   * y por eso tienen su propia ruta. Mandarlos por `PUT /mapeo` es 400
   * `EVENTO_DESCONOCIDO` — un error que se descubriría en producción, porque los
   * dos cuerpos son idénticos y el tipo no los distingue.
   */
  it('🔴 se guardan por SU ruta, no por la de recaudo', async () => {
    clienteMock.put.mockReset().mockResolvedValue({});
    await contabilidadApi.mapeo.guardarGastos([
      { evento: 'IVA_DESCONTABLE', cuentaId: 'c-240810' },
    ]);
    expect(clienteMock.put).toHaveBeenCalledWith('/inmobiliaria/contabilidad/mapeo/gastos', {
      entradas: [{ evento: 'IVA_DESCONTABLE', cuentaId: 'c-240810' }],
    });
    expect(clienteMock.put).not.toHaveBeenCalledWith(
      '/inmobiliaria/contabilidad/mapeo',
      expect.anything(),
    );
  });

  it('la entrada se filtra al DTO igual que la de recaudo', async () => {
    clienteMock.put.mockReset().mockResolvedValue({});
    await contabilidadApi.mapeo.guardarGastos([
      { evento: 'EGRESO_BANCOS', cuentaId: 'c-112005', nombre: 'de más' } as never,
    ]);
    expect(clienteMock.put).toHaveBeenCalledWith('/inmobiliaria/contabilidad/mapeo/gastos', {
      entradas: [{ evento: 'EGRESO_BANCOS', cuentaId: 'c-112005' }],
    });
  });

  it('tienen su propio GET y su propia semilla', async () => {
    await contabilidadApi.mapeo.gastos();
    expect(clienteMock.get).toHaveBeenCalledWith('/inmobiliaria/contabilidad/mapeo/gastos');
    await contabilidadApi.mapeo.sembrarGastos();
    expect(clienteMock.post).toHaveBeenCalledWith(
      '/inmobiliaria/contabilidad/mapeo/gastos/semilla',
      {},
    );
  });

  it('cada uno dice para qué sirve: siete nombres de evento no son una pantalla', async () => {
    const { PARA_QUE_SIRVE_EL_GASTO, EVENTOS_DE_GASTO } = await import('./contabilidad.service');
    for (const e of EVENTOS_DE_GASTO) {
      expect(PARA_QUE_SIRVE_EL_GASTO[e]?.length ?? 0).toBeGreaterThan(15);
    }
  });
});
