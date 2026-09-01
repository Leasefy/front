/**
 * contabilidad.service.test.ts — los pasos 4 y 5 de la migración.
 *
 * 🔴 Por qué cada test compara contra una lista escrita a mano y no contra lo
 * que le pasamos: `back-erp/src/main.ts` monta el `ValidationPipe` global con
 * `forbidNonWhitelisted: true`. Una clave que el DTO no declara devuelve 400 y
 * con él el lote entero. Las constantes de abajo son copias de los DTOs
 * reales, con su ruta; ésa es la vara.
 *
 * Cobertura:
 *   (1) puc.listar        → GET /puc con los filtros como texto
 *   (2) puc.arbol         → GET /puc/arbol
 *   (3) puc.semillaPendientes → GET /puc/semilla/pendientes
 *   (4) puc.sembrar       → POST /puc/semilla SIN cuerpo
 *   (5) puc.crear         → POST /puc, sólo las claves de CrearCuentaDto
 *   (6) puc.actualizar    → PATCH /puc/:id, nunca `codigo`
 *   (7) asientos.listar   → GET /asientos, límite topeado en 200
 *   (8) asientos.crear    → POST /asientos, claves de CrearAsientoDto + MovimientoDto
 *   (9) asientos.reversar → POST /asientos/:id/reversar, sin movimientos
 *  (10) migracion.revisar / aplicar → mismo cuerpo, claves de MigrarLoteDto
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  contabilidadApi,
  CLAVES_DE_CREAR_CUENTA,
  CLAVES_DE_ACTUALIZAR_CUENTA,
  CLAVES_DE_CREAR_ASIENTO,
  CLAVES_DE_MOVIMIENTO,
  CLAVES_DE_REVERSAR,
  CLAVES_DE_LOTE,
  CLAVES_DE_ASIENTO_MIGRADO,
  CLAVES_DE_MOVIMIENTO_MIGRADO,
  MAX_ASIENTOS_POR_LOTE,
  MAX_COP_POR_MOVIMIENTO,
  type AsientoNuevo,
  type LoteDeAsientos,
} from '../contabilidad.service';
import { setAccessToken } from '../client';

const BASE = '/inmobiliaria/contabilidad';

// ── Copias a mano de los DTOs del back ──────────────────────────────────────

/** `CrearCuentaDto` (back-erp/src/inmobiliaria/contabilidad/puc/dto/crear-cuenta.dto.ts). */
const DTO_CREAR_CUENTA = ['codigo', 'nombre', 'naturaleza', 'padreId', 'imputable'];

/** `ActualizarCuentaDto` (…/puc/dto/actualizar-cuenta.dto.ts). Sin `codigo`. */
const DTO_ACTUALIZAR_CUENTA = ['nombre', 'naturaleza', 'activa', 'imputable'];

/** `ListarCuentasDto` (…/puc/dto/listar-cuentas.dto.ts). */
const DTO_LISTAR_CUENTAS = ['soloActivas', 'soloImputables', 'busqueda'];

/**
 * `CrearAsientoDto` + `MovimientoDto` (…/asientos/dto/crear-asiento.dto.ts).
 *
 * `claveIdempotencia` es la llave del intento: el back devuelve el asiento ya
 * escrito en vez de registrar la apertura dos veces cuando se corta la red.
 */
const DTO_CREAR_ASIENTO = ['fecha', 'descripcion', 'movimientos', 'claveIdempotencia'];
const DTO_MOVIMIENTO = ['cuentaId', 'debitoCop', 'creditoCop', 'terceroTipo', 'terceroId', 'descripcion'];

/** `ListarAsientosDto` (…/asientos/dto/listar-asientos.dto.ts). */
const DTO_LISTAR_ASIENTOS = ['desde', 'hasta', 'origen', 'cuentaId', 'cerrado', 'limite', 'desplazamiento'];

/** `ReversarAsientoDto` (…/asientos/dto/reversar-asiento.dto.ts). */
const DTO_REVERSAR = ['fecha', 'motivo'];

/** `MigrarLoteDto` + `MigrarAsientoDto` + `MigrarMovimientoDto` (…/migracion/dto/index.ts). */
const DTO_LOTE = ['lote', 'asientos'];
const DTO_ASIENTO_MIGRADO = ['numeroOriginal', 'fecha', 'descripcion', 'movimientos'];
const DTO_MOVIMIENTO_MIGRADO = ['codigoCuenta', 'debito', 'credito', 'descripcion', 'terceroTipo', 'terceroId'];

// ── Infraestructura ─────────────────────────────────────────────────────────

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init;
  const fn = vi.fn().mockResolvedValueOnce({
    ok,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
  globalThis.fetch = fn as typeof globalThis.fetch;
  return fn;
}

function llamada(fn: ReturnType<typeof vi.fn>, i = 0): [string, RequestInit] {
  return fn.mock.calls[i] as [string, RequestInit];
}

function cuerpoDe(opts: RequestInit): Record<string, unknown> {
  return JSON.parse(opts.body as string) as Record<string, unknown>;
}

function queryDe(url: string): URLSearchParams {
  return new URL(url, 'http://backend.test').searchParams;
}

function sobrantes(objeto: Record<string, unknown>, permitidas: string[]): string[] {
  return Object.keys(objeto).filter((k) => !permitidas.includes(k));
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
  setAccessToken('test-token');
});

afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════

describe('las listas de claves del servicio SON los DTOs del back', () => {
  it.each([
    ['CrearCuentaDto', CLAVES_DE_CREAR_CUENTA, DTO_CREAR_CUENTA],
    ['ActualizarCuentaDto', CLAVES_DE_ACTUALIZAR_CUENTA, DTO_ACTUALIZAR_CUENTA],
    ['CrearAsientoDto', CLAVES_DE_CREAR_ASIENTO, DTO_CREAR_ASIENTO],
    ['MovimientoDto', CLAVES_DE_MOVIMIENTO, DTO_MOVIMIENTO],
    ['ReversarAsientoDto', CLAVES_DE_REVERSAR, DTO_REVERSAR],
    ['MigrarLoteDto', CLAVES_DE_LOTE, DTO_LOTE],
    ['MigrarAsientoDto', CLAVES_DE_ASIENTO_MIGRADO, DTO_ASIENTO_MIGRADO],
    ['MigrarMovimientoDto', CLAVES_DE_MOVIMIENTO_MIGRADO, DTO_MOVIMIENTO_MIGRADO],
  ])('%s: ni una clave más, ni una menos', (_dto, delServicio, delBack) => {
    expect([...delServicio].sort()).toEqual([...delBack].sort());
  });

  it('los topes copiados del back', () => {
    expect(MAX_ASIENTOS_POR_LOTE).toBe(5_000);
    expect(MAX_COP_POR_MOVIMIENTO).toBe(2_147_483_647);
  });
});

// ══════════════════════════════════════════════════════════════════════════

describe('puc', () => {
  it('listar → GET /puc, filtros como texto y sólo los del DTO', async () => {
    const fetchMock = mockFetchOnce([]);

    await contabilidadApi.puc.listar({ soloActivas: true, soloImputables: true, busqueda: '1105' });

    const [url, opts] = llamada(fetchMock);
    expect(url.split('?')[0].endsWith(`${BASE}/puc`)).toBe(true);
    expect(opts.method).toBe('GET');
    const q = queryDe(url);
    expect(sobrantes(Object.fromEntries(q), DTO_LISTAR_CUENTAS)).toEqual([]);
    // `@IsBooleanString`: 'true', no true.
    expect(q.get('soloActivas')).toBe('true');
    expect(q.get('soloImputables')).toBe('true');
    expect(q.get('busqueda')).toBe('1105');
  });

  it('listar sin filtros no manda query', async () => {
    const fetchMock = mockFetchOnce([]);
    await contabilidadApi.puc.listar();
    const [url] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/puc`)).toBe(true);
    expect(url).not.toContain('?');
  });

  it('arbol → GET /puc/arbol', async () => {
    const fetchMock = mockFetchOnce([]);
    await contabilidadApi.puc.arbol();
    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/puc/arbol`)).toBe(true);
    expect(opts.method).toBe('GET');
  });

  it('semillaPendientes → GET /puc/semilla/pendientes', async () => {
    const fetchMock = mockFetchOnce({ total: 1, cuentas: [] });
    const r = await contabilidadApi.puc.semillaPendientes();
    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/puc/semilla/pendientes`)).toBe(true);
    expect(opts.method).toBe('GET');
    expect(r.total).toBe(1);
  });

  it('sembrar → POST /puc/semilla SIN cuerpo (el back no declara @Body)', async () => {
    const fetchMock = mockFetchOnce({ creadas: 99, existentes: 0, total: 99, codigosCreados: [] });
    await contabilidadApi.puc.sembrar();
    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/puc/semilla`)).toBe(true);
    expect(opts.method).toBe('POST');
    expect(opts.body).toBeUndefined();
  });

  it('crear → POST /puc con las claves de CrearCuentaDto y nada más', async () => {
    const fetchMock = mockFetchOnce({ id: 'c-1' });

    await contabilidadApi.puc.crear({
      codigo: '110505',
      nombre: 'Caja general',
      naturaleza: 'DEBITO',
      padreId: 'p-1',
      imputable: true,
      // Lo que una pantalla podría arrastrar de más:
      ...({ activa: true, nivel: 3, hijas: [] } as object),
    });

    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/puc`)).toBe(true);
    expect(opts.method).toBe('POST');
    const cuerpo = cuerpoDe(opts);
    expect(sobrantes(cuerpo, DTO_CREAR_CUENTA)).toEqual([]);
    expect(cuerpo).toEqual({
      codigo: '110505',
      nombre: 'Caja general',
      naturaleza: 'DEBITO',
      padreId: 'p-1',
      imputable: true,
    });
  });

  it('crear sin padre ni imputable no manda esas claves (el back las decide)', async () => {
    const fetchMock = mockFetchOnce({ id: 'c-1' });
    await contabilidadApi.puc.crear({ codigo: '1105', nombre: 'Caja', naturaleza: 'DEBITO' });
    expect(cuerpoDe(llamada(fetchMock)[1])).toEqual({
      codigo: '1105',
      nombre: 'Caja',
      naturaleza: 'DEBITO',
    });
  });

  it('actualizar → PATCH /puc/:id y NUNCA manda `codigo`', async () => {
    const fetchMock = mockFetchOnce({ id: 'c-1' });

    await contabilidadApi.puc.actualizar('c-1', {
      nombre: 'Caja menor',
      activa: false,
      ...({ codigo: '999999', id: 'otro' } as object),
    });

    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/puc/c-1`)).toBe(true);
    expect(opts.method).toBe('PATCH');
    const cuerpo = cuerpoDe(opts);
    expect(sobrantes(cuerpo, DTO_ACTUALIZAR_CUENTA)).toEqual([]);
    expect(cuerpo).toEqual({ nombre: 'Caja menor', activa: false });
  });

  it('eliminar → DELETE /puc/:id sin cuerpo, con el id escapado', async () => {
    const fetchMock = mockFetchOnce({ eliminada: true, codigo: '1105' });
    await contabilidadApi.puc.eliminar('a/b');
    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/puc/a%2Fb`)).toBe(true);
    expect(opts.method).toBe('DELETE');
    expect(opts.body).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════

describe('asientos', () => {
  it('listar → GET /asientos con los nombres de query de ListarAsientosDto', async () => {
    const fetchMock = mockFetchOnce({ total: 0, limite: 50, desplazamiento: 0, asientos: [] });

    await contabilidadApi.asientos.listar({
      desde: '2026-01-01',
      hasta: '2026-01-31',
      origen: 'MIGRACION',
      cuentaId: 'c-1',
      cerrado: false,
      limite: 25,
      desplazamiento: 50,
    });

    const [url, opts] = llamada(fetchMock);
    expect(url.split('?')[0].endsWith(`${BASE}/asientos`)).toBe(true);
    expect(opts.method).toBe('GET');
    const q = Object.fromEntries(queryDe(url));
    expect(sobrantes(q, DTO_LISTAR_ASIENTOS)).toEqual([]);
    expect(q).toEqual({
      desde: '2026-01-01',
      hasta: '2026-01-31',
      origen: 'MIGRACION',
      cuentaId: 'c-1',
      cerrado: 'false',
      limite: '25',
      desplazamiento: '50',
    });
  });

  it('listar topea `limite` en 200 (@Max(200) en el DTO)', async () => {
    const fetchMock = mockFetchOnce({ total: 0, limite: 200, desplazamiento: 0, asientos: [] });
    await contabilidadApi.asientos.listar({ limite: 1_000 });
    expect(queryDe(llamada(fetchMock)[0]).get('limite')).toBe('200');
  });

  it('crear → POST /asientos, claves de CrearAsientoDto y de MovimientoDto, nada más', async () => {
    const fetchMock = mockFetchOnce({ id: 'a-1', numero: 1, movimientos: [] });

    const asiento: AsientoNuevo = {
      fecha: '2026-01-01',
      descripcion: 'Saldos iniciales',
      movimientos: [
        { cuentaId: 'c-1', debitoCop: 1_000_000, ...({ codigo: '1105', nombre: 'Caja' } as object) },
        { cuentaId: 'c-2', creditoCop: 1_000_000, descripcion: 'Capital' },
      ],
      ...({ numero: 7, origen: 'MANUAL', cerrado: false } as object),
    };

    await contabilidadApi.asientos.crear(asiento);

    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/asientos`)).toBe(true);
    expect(opts.method).toBe('POST');
    const cuerpo = cuerpoDe(opts);
    expect(sobrantes(cuerpo, DTO_CREAR_ASIENTO)).toEqual([]);
    const movimientos = cuerpo.movimientos as Record<string, unknown>[];
    expect(movimientos).toHaveLength(2);
    for (const m of movimientos) expect(sobrantes(m, DTO_MOVIMIENTO)).toEqual([]);
    expect(movimientos[0]).toEqual({ cuentaId: 'c-1', debitoCop: 1_000_000 });
    expect(movimientos[1]).toEqual({ cuentaId: 'c-2', creditoCop: 1_000_000, descripcion: 'Capital' });
  });

  it('reversar → POST /asientos/:id/reversar, sólo {fecha, motivo}, sin movimientos', async () => {
    const fetchMock = mockFetchOnce({ original: {}, reversa: {} });

    await contabilidadApi.asientos.reversar('a-1', {
      motivo: 'Se cargó dos veces',
      ...({ movimientos: [] } as object),
    });

    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/asientos/a-1/reversar`)).toBe(true);
    expect(opts.method).toBe('POST');
    const cuerpo = cuerpoDe(opts);
    expect(sobrantes(cuerpo, DTO_REVERSAR)).toEqual([]);
    expect(cuerpo).toEqual({ motivo: 'Se cargó dos veces' });
  });

  it('reversar sin opciones manda un objeto vacío', async () => {
    const fetchMock = mockFetchOnce({ original: {}, reversa: {} });
    await contabilidadApi.asientos.reversar('a-1');
    expect(cuerpoDe(llamada(fetchMock)[1])).toEqual({});
  });
});

// ══════════════════════════════════════════════════════════════════════════

describe('migracion', () => {
  const lote: LoteDeAsientos = {
    lote: 'historico-2025',
    asientos: [
      {
        numeroOriginal: 'CE-0001',
        fecha: '15/01/2025',
        descripcion: 'Canon enero',
        movimientos: [
          { codigoCuenta: '1105-05', debito: '1.500.000', ...({ fila: 1, nombre: 'Caja' } as object) },
          { codigoCuenta: '413505', credito: 1_500_000, descripcion: 'Arriendo' },
        ],
        ...({ estado: 'LISTO', clave: 'x' } as object),
      },
    ],
    ...({ revisionId: 'r-1' } as object),
  };

  it.each([
    ['revisar', () => contabilidadApi.migracion.revisar(lote), 'revisar'],
    ['aplicar', () => contabilidadApi.migracion.aplicar(lote), 'aplicar'],
  ])('%s → POST /migracion/%s con las claves de MigrarLoteDto en los tres niveles', async (_n, llamar, ruta) => {
    const fetchMock = mockFetchOnce({ lote: 'historico-2025', total: 1 });

    await llamar();

    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/migracion/${ruta}`)).toBe(true);
    expect(opts.method).toBe('POST');
    const cuerpo = cuerpoDe(opts);
    expect(sobrantes(cuerpo, DTO_LOTE)).toEqual([]);
    const asientos = cuerpo.asientos as Record<string, unknown>[];
    expect(asientos).toHaveLength(1);
    expect(sobrantes(asientos[0], DTO_ASIENTO_MIGRADO)).toEqual([]);
    const movimientos = asientos[0].movimientos as Record<string, unknown>[];
    for (const m of movimientos) expect(sobrantes(m, DTO_MOVIMIENTO_MIGRADO)).toEqual([]);
    // El vocabulario de migración, no el del asiento manual.
    expect(movimientos[0]).toEqual({ codigoCuenta: '1105-05', debito: '1.500.000' });
    expect(movimientos[1]).toEqual({ codigoCuenta: '413505', credito: 1_500_000, descripcion: 'Arriendo' });
  });
});
