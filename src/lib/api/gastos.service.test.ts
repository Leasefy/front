/**
 * gastos.service — el contrato con el back, clave por clave.
 *
 * ── Por qué las listas de claves se comparan contra copias A MANO ───────────
 *
 * El `ValidationPipe` del back corre con `forbidNonWhitelisted`, así que una
 * clave que el DTO no declara devuelve 400 y con él la factura entera. Un test
 * que leyera `CLAVES_DE_CREAR_FACTURA` para comprobar que el cuerpo tiene esas
 * claves no probaría nada: pasaría igual con la lista equivocada. Por eso acá
 * están escritas de nuevo, tomadas del contrato del 18-09 §3 y §4: si alguien
 * agrega una clave al servicio sin agregarla al DTO, este archivo se pone rojo.
 *
 * ── 🔴 Lo que NO se manda, y es la mitad del valor de este archivo ──────────
 *
 * De los totales viaja UNO: `totalCop`, que no es un dato sino un CONTROL — el
 * total del papel, que el back compara con lo que suman las líneas (400
 * `TOTALES_NO_CUADRAN` sin registrar nada). Los otros cuatro los liquida el back
 * y mandarlos sería un 400 del request entero.
 *
 * Ése es el defecto del `propertyType`/`type` de la importación de inmuebles: una
 * clave de más rompe la llamada completa, y estuvo seis unidades de trabajo
 * haciéndolo con los dos repos en verde porque cada lado mockeaba al otro. Por eso
 * la copia de abajo está verificada contra el DTO REAL del back, y el test pone
 * los totales calculados en el objeto de entrada a propósito, para comprobar que
 * se caen en el camino.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { clienteMock } = vi.hoisted(() => ({
  clienteMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    getBlob: vi.fn(),
  },
}));

/*
 * `ApiError` REAL y `apiClient` mockeado: el servicio construye el error de
 * `totalesQueNoCuadran` con `instanceof ApiError`, así que una clase inventada en
 * el mock haría que esa función devolviera `null` siempre y el test pasaría
 * probando nada.
 */
vi.mock('./client', async () => {
  const actual = await vi.importActual<typeof import('./client')>('./client');
  return { ...actual, apiClient: clienteMock };
});

import { ApiError } from './client';
import {
  gastosApi,
  totalesQueNoCuadran,
  CLAVES_DE_CREAR_FACTURA,
  CLAVES_DE_LINEA_DE_FACTURA,
  CLAVES_DE_CREAR_EGRESO,
  CLAVES_DE_CREAR_LOTE,
  CLAVES_DE_PAGADO,
  CLAVES_DE_ANULAR,
  CLAVES_DE_CONCILIAR,
  MAX_LIMITE_DE_FACTURAS,
  type FacturaNueva,
} from './gastos.service';

const BASE = '/inmobiliaria/contabilidad';

beforeEach(() => {
  clienteMock.get.mockReset().mockResolvedValue({});
  clienteMock.post.mockReset().mockResolvedValue({});
  clienteMock.put.mockReset().mockResolvedValue({});
  clienteMock.delete.mockReset().mockResolvedValue({});
  clienteMock.getBlob.mockReset().mockResolvedValue(new Blob());
});

// ── Las copias a mano de los DTO del contrato ─────────────────────────────

/**
 * `CrearFacturaDeProveedorDto`, copiado del DTO REAL del back
 * (`inmobiliaria/contabilidad/gastos/dto/index.ts`). 🔴 Con `totalCop` —el
 * control— y sin los cuatro totales que el back liquida.
 */
const DTO_CREAR_FACTURA = [
  'tipo',
  'proveedorId',
  'proveedorNombre',
  'proveedorTipoDocumento',
  'proveedorDocumento',
  'proveedorCiudad',
  'proveedorDireccion',
  'prefijoDelProveedor',
  'numeroDelProveedor',
  'fecha',
  'fechaDeVencimiento',
  'concepto',
  'rubro',
  'sedeId',
  'lineas',
  'retefuenteCop',
  'reteivaCop',
  'reteicaCop',
  'totalCop',
  'causar',
];

/**
 * `LineaDeFacturaDto`: cinco campos. `ivaCop` (el IVA en pesos del renglón)
 * existe y MANDA sobre `ivaPct` — «el documento del proveedor dice lo que dice».
 * Esta pantalla captura un porcentaje, así que no lo usa; está en la lista para
 * que el día que haga falta no haya que descubrir el 400.
 */
const DTO_LINEA = ['descripcion', 'cuentaId', 'baseCop', 'ivaPct', 'ivaCop'];

/** `CrearEgresoDto`, §4. */
const DTO_CREAR_EGRESO = [
  'beneficiarioTipo',
  'beneficiarioId',
  'beneficiarioNombre',
  'beneficiarioTipoDocumento',
  'beneficiarioDocumento',
  'banco',
  'tipoDeCuenta',
  'numeroDeCuenta',
  'facturaId',
  'concepto',
  'valorCop',
  'retefuenteCop',
  'reteivaCop',
  'reteicaCop',
  'rubro',
  'sedeId',
  'fechaDelEgreso',
];

describe('las listas de claves son las del DTO del contrato', () => {
  it('la factura de proveedor', () => {
    expect([...CLAVES_DE_CREAR_FACTURA]).toEqual(DTO_CREAR_FACTURA);
  });

  it('la línea declara los cinco campos, `ivaCop` incluido', () => {
    expect([...CLAVES_DE_LINEA_DE_FACTURA]).toEqual(DTO_LINEA);
  });

  it('el egreso', () => {
    expect([...CLAVES_DE_CREAR_EGRESO]).toEqual(DTO_CREAR_EGRESO);
  });

  it('el lote, el pago, la anulación y la conciliación son de un par de campos', () => {
    expect([...CLAVES_DE_CREAR_LOTE]).toEqual(['concepto', 'egresoIds']);
    expect([...CLAVES_DE_PAGADO]).toEqual(['fecha', 'referenciaBanco']);
    expect([...CLAVES_DE_ANULAR]).toEqual(['motivo']);
    expect([...CLAVES_DE_CONCILIAR]).toEqual(['movimientoBancarioId']);
  });

  it('🔴 de los totales viaja SÓLO el control; los liquidados no', () => {
    expect(CLAVES_DE_CREAR_FACTURA).toContain('totalCop');
    for (const liquidado of ['subtotalCop', 'ivaCop', 'ivaDescontableCop', 'netoCop']) {
      expect(CLAVES_DE_CREAR_FACTURA, liquidado).not.toContain(liquidado);
    }
  });
});

// ── Facturas ───────────────────────────────────────────────────────────────

describe('facturas.listar', () => {
  it('sin filtros pega a la ruta pelada', async () => {
    await gastosApi.facturas.listar();
    expect(clienteMock.get).toHaveBeenCalledWith(`${BASE}/gastos/facturas`);
  });

  it('manda los seis filtros y la paginación como texto', async () => {
    await gastosApi.facturas.listar({
      desde: '2026-09-01',
      hasta: '2026-09-30',
      estado: 'CAUSADA',
      proveedorId: 'p1',
      sedeId: 's1',
      rubro: 'oficina',
      limite: 50,
      desplazamiento: 100,
    });
    const url = new URL(clienteMock.get.mock.calls[0][0], 'http://x');
    expect(url.pathname).toBe(`${BASE}/gastos/facturas`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      desde: '2026-09-01',
      hasta: '2026-09-30',
      estado: 'CAUSADA',
      proveedorId: 'p1',
      sedeId: 's1',
      rubro: 'oficina',
      limite: '50',
      desplazamiento: '100',
    });
  });

  it('recorta el límite al tope del DTO en vez de comerse un 400', async () => {
    await gastosApi.facturas.listar({ limite: 5_000 });
    const url = new URL(clienteMock.get.mock.calls[0][0], 'http://x');
    expect(url.searchParams.get('limite')).toBe(String(MAX_LIMITE_DE_FACTURAS));
  });

  it('no manda claves vacías', async () => {
    await gastosApi.facturas.listar({ desde: '', rubro: undefined });
    expect(clienteMock.get).toHaveBeenCalledWith(`${BASE}/gastos/facturas`);
  });
});

describe('facturas.registrar', () => {
  /** Lo que un formulario completo tendría en la mano, totales calculados incluidos. */
  const conBasura = {
    tipo: 'FACTURA',
    proveedorNombre: 'Ferretería El Tornillo SAS',
    proveedorTipoDocumento: 'NIT',
    proveedorDocumento: '900123456',
    numeroDelProveedor: '4521',
    prefijoDelProveedor: 'FE',
    fecha: '2026-09-05',
    concepto: 'Cerraduras para la oficina',
    rubro: 'oficina',
    lineas: [
      { descripcion: 'Cerradura', cuentaId: 'c1', baseCop: 400_000, ivaPct: 19, ivaCop: 76_000 },
    ],
    retefuenteCop: 10_000,
    reteicaCop: 3_040,
    // El control, que SÍ viaja:
    totalCop: 476_000,
    // Lo que el back liquida y el cliente NO manda:
    subtotalCop: 400_000,
    ivaCop: 76_000,
    ivaDescontableCop: 76_000,
    netoCop: 462_960,
    estado: 'BORRADOR',
    id: 'no-deberia-viajar',
  } as unknown as FacturaNueva;

  it('🔴 manda el control y deja afuera los totales liquidados y el estado', async () => {
    await gastosApi.facturas.registrar(conBasura);
    const [ruta, cuerpo] = clienteMock.post.mock.calls[0];
    expect(ruta).toBe(`${BASE}/gastos/facturas`);
    expect(Object.keys(cuerpo as object).sort()).toEqual(
      [
        'tipo',
        'proveedorNombre',
        'proveedorTipoDocumento',
        'proveedorDocumento',
        'prefijoDelProveedor',
        'numeroDelProveedor',
        'fecha',
        'concepto',
        'rubro',
        'lineas',
        'retefuenteCop',
        'reteicaCop',
        'totalCop',
      ].sort(),
    );
  });

  it('filtra también cada línea a las claves de su DTO', async () => {
    await gastosApi.facturas.registrar(conBasura);
    const [, cuerpo] = clienteMock.post.mock.calls[0];
    const lineas = (cuerpo as { lineas: Record<string, unknown>[] }).lineas;
    // El objeto de entrada traía `ivaCop`, que el DTO SÍ acepta, así que pasa.
    expect(Object.keys(lineas[0]).sort()).toEqual(
      ['descripcion', 'cuentaId', 'baseCop', 'ivaPct', 'ivaCop'].sort(),
    );
  });

  it('`causar: true` viaja: registrar y causar en un paso es del DTO', async () => {
    await gastosApi.facturas.registrar({ ...conBasura, causar: true });
    const [, cuerpo] = clienteMock.post.mock.calls[0];
    expect((cuerpo as { causar?: boolean }).causar).toBe(true);
  });
});

describe('facturas.previsualizar', () => {
  it('🔴 liquida sin escribir: sólo lo que hace falta para la cuenta', async () => {
    await gastosApi.facturas.previsualizar({
      proveedorId: 'p1',
      lineas: [
        { descripcion: 'Cerradura', cuentaId: 'c1', baseCop: 400_000, ivaPct: 19 },
      ],
      retefuenteCop: 10_000,
    });
    const [ruta, cuerpo] = clienteMock.post.mock.calls[0];
    expect(ruta).toBe(`${BASE}/gastos/facturas/previsualizar`);
    expect(Object.keys(cuerpo as object).sort()).toEqual(
      ['proveedorId', 'lineas', 'retefuenteCop'].sort(),
    );
  });

  it('también filtra cada línea a las claves de su DTO', async () => {
    await gastosApi.facturas.previsualizar({
      lineas: [
        { descripcion: 'x', baseCop: 1, ivaPct: 19, ivaCop: 190 },
      ],
    });
    const [, cuerpo] = clienteMock.post.mock.calls[0];
    const lineas = (cuerpo as { lineas: Record<string, unknown>[] }).lineas;
    expect(Object.keys(lineas[0]).sort()).toEqual(
      ['descripcion', 'baseCop', 'ivaPct', 'ivaCop'].sort(),
    );
  });

  it('una clave que el DTO de previsualizar no declara se cae', async () => {
    await gastosApi.facturas.previsualizar({
      lineas: [{ descripcion: 'x', baseCop: 1, ivaPct: 19 }],
      // @ts-expect-error `sedeId` no está en `PrevisualizarFacturaDto`.
      sedeId: 's1',
    });
    const [, cuerpo] = clienteMock.post.mock.calls[0];
    expect('sedeId' in (cuerpo as object)).toBe(false);
  });
});

describe('facturas.causar / anular', () => {
  it('causar es un POST con cuerpo vacío y el id codificado', async () => {
    await gastosApi.facturas.causar('a/b');
    expect(clienteMock.post).toHaveBeenCalledWith(`${BASE}/gastos/facturas/a%2Fb/causar`, {});
  });

  it('anular manda SOLO el motivo', async () => {
    await gastosApi.facturas.anular('f1', 'llegó repetida');
    expect(clienteMock.post).toHaveBeenCalledWith(`${BASE}/gastos/facturas/f1/anular`, {
      motivo: 'llegó repetida',
    });
  });
});

// ── Egresos ────────────────────────────────────────────────────────────────

describe('egresos', () => {
  it('listar manda los cuatro filtros', async () => {
    await gastosApi.egresos.listar({
      estado: 'PENDIENTE',
      desde: '2026-09-01',
      hasta: '2026-09-30',
      beneficiarioTipo: 'PROVEEDOR',
    });
    const url = new URL(clienteMock.get.mock.calls[0][0], 'http://x');
    expect(url.pathname).toBe(`${BASE}/egresos`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      estado: 'PENDIENTE',
      desde: '2026-09-01',
      hasta: '2026-09-30',
      beneficiarioTipo: 'PROVEEDOR',
    });
  });

  it('registrar filtra al DTO: ni numero ni estado ni netoCop viajan', async () => {
    await gastosApi.egresos.registrar({
      beneficiarioTipo: 'TECNICO',
      beneficiarioNombre: 'Juan Pérez',
      concepto: 'Anticipo reparación',
      valorCop: 500_000,
      // @ts-expect-error a propósito: es lo que el back calcula o numera.
      numero: 87,
      estado: 'PENDIENTE',
      netoCop: 500_000,
    });
    const [, cuerpo] = clienteMock.post.mock.calls[0];
    expect(Object.keys(cuerpo as object).sort()).toEqual(
      ['beneficiarioTipo', 'beneficiarioNombre', 'concepto', 'valorCop'].sort(),
    );
  });

  it('conciliar manda SOLO el movimiento del extracto', async () => {
    await gastosApi.egresos.conciliar('e1', 'mb1');
    expect(clienteMock.post).toHaveBeenCalledWith(`${BASE}/egresos/e1/conciliar`, {
      movimientoBancarioId: 'mb1',
    });
  });

  it('comprobante es un GET a su propia ruta', async () => {
    await gastosApi.egresos.comprobante('e1');
    expect(clienteMock.get).toHaveBeenCalledWith(`${BASE}/egresos/e1/comprobante`);
  });
});

// ── Lotes ──────────────────────────────────────────────────────────────────

describe('lotes', () => {
  it('listar sin estado pega a la ruta pelada', async () => {
    await gastosApi.lotes.listar();
    expect(clienteMock.get).toHaveBeenCalledWith(`${BASE}/egresos/lotes`);
  });

  it('crear manda concepto y los ids, nada más', async () => {
    await gastosApi.lotes.crear({
      concepto: 'Proveedores segunda quincena',
      egresoIds: ['e1', 'e2'],
      // @ts-expect-error lo que el back calcula.
      totalCop: 99,
    });
    expect(clienteMock.post).toHaveBeenCalledWith(`${BASE}/egresos/lotes`, {
      concepto: 'Proveedores segunda quincena',
      egresoIds: ['e1', 'e2'],
    });
  });

  it('aprobar no manda aprobador: sale del JWT (y por eso puede ser 409)', async () => {
    await gastosApi.lotes.aprobar('l1');
    expect(clienteMock.post).toHaveBeenCalledWith(`${BASE}/egresos/lotes/l1/aprobar`, {});
  });

  it('el archivo baja como blob, con el formato en el query', async () => {
    await gastosApi.lotes.archivo('l1', 'BANCOLOMBIA_PAB');
    expect(clienteMock.getBlob).toHaveBeenCalledWith(
      `${BASE}/egresos/lotes/l1/archivo?formato=BANCOLOMBIA_PAB`,
    );
  });

  it('sin formato el archivo no lleva query: el lote ya tiene el suyo', async () => {
    await gastosApi.lotes.archivo('l1');
    expect(clienteMock.getBlob).toHaveBeenCalledWith(`${BASE}/egresos/lotes/l1/archivo`);
  });

  /*
   * 🔴 Un asiento POR EGRESO, no uno por lote: con un asiento compartido, anular
   * UN egreso reversaba el pago de los otros ocho, a los que el banco ya les
   * había girado. La pantalla anuncia cuántos quedaron, no «el asiento N.º X».
   */
  it('el pago devuelve un asiento por egreso', async () => {
    clienteMock.post.mockResolvedValueOnce({
      lote: { id: 'l1' },
      asientos: [
        { egresoId: 'e1', id: 'a1', numero: 415 },
        { egresoId: 'e2', id: 'a2', numero: 416 },
      ],
      comprobantes: 2,
    });
    const r = await gastosApi.lotes.pagado('l1', { fecha: '2026-09-20' });
    expect(r.asientos).toHaveLength(2);
    expect(r.asientos[0].egresoId).toBe('e1');
    expect(r.comprobantes).toBe(2);
  });

  it('pagado manda fecha y referencia', async () => {
    await gastosApi.lotes.pagado('l1', { fecha: '2026-09-20', referenciaBanco: 'PAB-771' });
    expect(clienteMock.post).toHaveBeenCalledWith(`${BASE}/egresos/lotes/l1/pagado`, {
      fecha: '2026-09-20',
      referenciaBanco: 'PAB-771',
    });
  });

  it('pagado sin referencia no manda la clave vacía', async () => {
    await gastosApi.lotes.pagado('l1', { fecha: '2026-09-20' });
    expect(clienteMock.post).toHaveBeenCalledWith(`${BASE}/egresos/lotes/l1/pagado`, {
      fecha: '2026-09-20',
    });
  });
});

/**
 * 🔴 `totalesQueNoCuadran` — leer los cuatro números del 400.
 *
 * El cuerpo del error llega entero en `ApiError.detalle` (ver `client.ts`), y de
 * ahí se saca lo que la pantalla necesita para encontrar el renglón mal
 * digitado. Se validan uno por uno y no se castea el cuerpo: un back anterior
 * puede mandar el `code` sin los números, y ahí es mejor caer al mensaje del
 * back que pintar cuatro `$NaN`.
 */
describe('totalesQueNoCuadran', () => {
  const cuerpo = {
    code: 'TOTALES_NO_CUADRAN',
    message: 'El total que dice la factura es $475.900 y las líneas suman $476.000…',
    totalDeLaFacturaCop: 475_900,
    totalDeLasLineasCop: 476_000,
    subtotalCop: 400_000,
    ivaCop: 76_000,
  };

  it('saca los cuatro números del cuerpo del 400', () => {
    const error = new ApiError(400, cuerpo.message, cuerpo.code, cuerpo);
    expect(totalesQueNoCuadran(error)).toEqual({
      totalDeLaFacturaCop: 475_900,
      totalDeLasLineasCop: 476_000,
      subtotalCop: 400_000,
      ivaCop: 76_000,
    });
  });

  it('otro error, aunque sea 400, no es un descuadre', () => {
    expect(
      totalesQueNoCuadran(new ApiError(400, 'otra cosa', 'FACTURA_DE_PROVEEDOR_REPETIDA', {})),
    ).toBeNull();
    expect(totalesQueNoCuadran(new Error('sin red'))).toBeNull();
    expect(totalesQueNoCuadran(null)).toBeNull();
  });

  it('🔴 el código sin los números devuelve null: mejor el mensaje del back que cuatro $NaN', () => {
    const error = new ApiError(400, cuerpo.message, cuerpo.code, { code: cuerpo.code });
    expect(totalesQueNoCuadran(error)).toBeNull();
  });

  it('un número que no es número tampoco pasa', () => {
    const error = new ApiError(400, cuerpo.message, cuerpo.code, {
      ...cuerpo,
      totalDeLasLineasCop: 'muchos',
    });
    expect(totalesQueNoCuadran(error)).toBeNull();
  });
});
