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
 * ── Lo que NO se manda, y es la mitad del valor de este archivo ─────────────
 *
 * `subtotalCop`, `ivaCop`, `ivaDescontableCop`, `netoCop` y el `ivaCop` de cada
 * línea los calcula el back. Mandarlos sería pedirle que confíe en una cuenta
 * que hizo el navegador — y el back los recalcula igual, compara y devuelve 400
 * `TOTALES_NO_CUADRAN`. El test los pone en el objeto de entrada a propósito,
 * para comprobar que se caen en el camino.
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

vi.mock('./client', () => ({ apiClient: clienteMock }));

import {
  gastosApi,
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

/** `CrearFacturaDeProveedorDto`, contrato del 18-09 §3. */
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

/** `LineaDeFacturaDto`. `ivaCop` es calculado: no está. */
const DTO_LINEA = ['descripcion', 'cuentaId', 'baseCop', 'ivaPct'];

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

  it('la línea de la factura no declara el IVA: lo calcula el back', () => {
    expect([...CLAVES_DE_LINEA_DE_FACTURA]).toEqual(DTO_LINEA);
    expect(CLAVES_DE_LINEA_DE_FACTURA).not.toContain('ivaCop');
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

  it('ninguna lista de totales calculados viaja en el cuerpo de la factura', () => {
    for (const calculado of ['subtotalCop', 'ivaCop', 'ivaDescontableCop', 'netoCop']) {
      expect(CLAVES_DE_CREAR_FACTURA).not.toContain(calculado);
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
    totalCop: 476_000,
    // Lo que el back calcula y el cliente NO manda:
    subtotalCop: 400_000,
    ivaCop: 76_000,
    ivaDescontableCop: 76_000,
    netoCop: 462_960,
    estado: 'BORRADOR',
    id: 'no-deberia-viajar',
  } as unknown as FacturaNueva;

  it('deja afuera los totales calculados y el estado', async () => {
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

  it('filtra también cada línea: el IVA de la línea no viaja', async () => {
    await gastosApi.facturas.registrar(conBasura);
    const [, cuerpo] = clienteMock.post.mock.calls[0];
    const lineas = (cuerpo as { lineas: Record<string, unknown>[] }).lineas;
    expect(Object.keys(lineas[0]).sort()).toEqual(
      ['descripcion', 'cuentaId', 'baseCop', 'ivaPct'].sort(),
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

  it('también filtra las líneas: el IVA de la línea lo calcula el back', async () => {
    await gastosApi.facturas.previsualizar({
      lineas: [
        // @ts-expect-error a propósito: es lo que el back calcula.
        { descripcion: 'x', baseCop: 1, ivaPct: 19, ivaCop: 0 },
      ],
    });
    const [, cuerpo] = clienteMock.post.mock.calls[0];
    const lineas = (cuerpo as { lineas: Record<string, unknown>[] }).lineas;
    expect('ivaCop' in lineas[0]).toBe(false);
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
