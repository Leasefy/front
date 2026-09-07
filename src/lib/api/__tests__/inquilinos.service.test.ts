/**
 * inquilinos.service.test.ts — la sección que no existía.
 *
 * Desde el 2026-09-04 el back SÍ tiene un `@Post` (crear un inquilino solo),
 * así que ahora hay un cuerpo que contrastar contra un DTO — y con
 * `whitelist + forbidNonWhitelisted` una clave de más es un 400 del request
 * entero. Lo que además se puede romper en silencio es el QUERY: `estado` es un enum de tres valores
 * (`activos | terminados | todos`) y `buscar` un texto libre. Mandar
 * `estado=activo` o `q=` en vez de `buscar=` no da error — da la lista
 * completa, que se ve exactamente igual a «no hay filtro aplicado».
 *
 * Cobertura:
 *   (1) listar sin filtros → GET sin query
 *   (2) listar con buscar + estado → los nombres de parámetro del controller
 *   (3) un `buscar` en blanco no viaja
 *   (4) obtener → GET /:tenantId, con el id escapado
 *   (5) el agrupamiento por persona viene del back y no se vuelve a hacer acá
 *   (6) arriendosVigentes cuenta ENDING_SOON como vivo
 *   (7) crear → POST con el cuerpo que acepta `CreateInquilinoDto`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { inquilinosApi, arriendosVigentes, type Inquilino } from '../inquilinos.service';
import { setAccessToken } from '../client';

/**
 * Los ÚNICOS parámetros que lee `InquilinosController.listar`
 * (back-erp/src/inmobiliaria/inquilinos/inquilinos.controller.ts:
 * `@Query('buscar')` y `@Query('estado')`). Cualquier otro nombre se ignora
 * en silencio y devuelve la lista sin filtrar.
 */
const PARAMETROS_DEL_CONTROLLER = ['buscar', 'estado'];

/** Los tres valores que declara el `@ApiQuery({ enum: [...] })` del back. */
const ESTADOS_DEL_CONTROLLER = ['activos', 'terminados', 'todos'];

/**
 * Las ÚNICAS claves de `CreateInquilinoDto`
 * (back-erp/src/inmobiliaria/inquilinos/dto/create-inquilino.dto.ts). El back
 * corre con `forbidNonWhitelisted: true`: una de más y el POST entero es 400.
 */
const CLAVES_DEL_DTO = ['nombre', 'tipoDocumento', 'documento', 'correo', 'telefono'];

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

/** Los parámetros de la última URL pedida, ya parseados. */
function queryDe(url: string): URLSearchParams {
  return new URL(url, 'http://backend.test').searchParams;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
  setAccessToken('test-token');
});

afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

// ── (1) (2) (3) listar ───────────────────────────────────────────────────────

describe('inquilinosApi.listar', () => {
  it('GETea /inmobiliaria/inquilinos sin query cuando no hay filtros', async () => {
    const fetchMock = mockFetchOnce([]);

    await inquilinosApi.listar();

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/inquilinos')).toBe(true);
    expect(opts.method).toBe('GET');
    // Ni un `?` suelto: una URL con query vacío es la que alguien copia y
    // pega creyendo que lleva un filtro.
    expect(url).not.toContain('?');
  });

  it('usa los nombres de parámetro del controller, y ningún otro', async () => {
    const fetchMock = mockFetchOnce([]);

    await inquilinosApi.listar({ buscar: 'María', estado: 'terminados' });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const q = queryDe(url);

    // Contra el contrato del back, no contra lo que le pasamos: un test que
    // lee `q.get('buscar')` después de haber escrito `buscar` pasa igual si
    // el controller espera `q`.
    expect([...q.keys()].filter((k) => !PARAMETROS_DEL_CONTROLLER.includes(k))).toEqual([]);
    expect(q.get('buscar')).toBe('María');
    expect(q.get('estado')).toBe('terminados');
    expect(ESTADOS_DEL_CONTROLLER).toContain(q.get('estado'));
  });

  it('no manda `buscar` cuando el usuario sólo escribió espacios', async () => {
    // El input dispara en cada tecla: un `buscar=` vacío es un viaje al back
    // que devuelve lo mismo que no filtrar, y deja la URL diciendo que hay
    // una búsqueda activa cuando no la hay.
    const fetchMock = mockFetchOnce([]);

    await inquilinosApi.listar({ buscar: '   ', estado: 'activos' });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const q = queryDe(url);
    expect(q.has('buscar')).toBe(false);
    expect(q.get('estado')).toBe('activos');
  });

  it('recorta el término antes de mandarlo', async () => {
    const fetchMock = mockFetchOnce([]);

    await inquilinosApi.listar({ buscar: '  jorge  ' });

    const q = queryDe((fetchMock.mock.calls[0] as [string, RequestInit])[0]);
    expect(q.get('buscar')).toBe('jorge');
  });
});

// ── (4) obtener ──────────────────────────────────────────────────────────────

describe('inquilinosApi.obtener', () => {
  it('GETea /inmobiliaria/inquilinos/:tenantId', async () => {
    const persona: Inquilino = {
      tenantId: '8f1e6b52-0000-4000-8000-000000000001',
      nombre: 'Jorge Restrepo',
      email: 'jorge@correo.co',
      telefono: null,
      documento: null,
      arriendos: [],
    };
    const fetchMock = mockFetchOnce(persona);

    const r = await inquilinosApi.obtener('8f1e6b52-0000-4000-8000-000000000001');

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(
      url.endsWith('/inmobiliaria/inquilinos/8f1e6b52-0000-4000-8000-000000000001'),
    ).toBe(true);
    expect(opts.method).toBe('GET');
    expect(r.nombre).toBe('Jorge Restrepo');
  });
});

// ── (5) el agrupamiento es del back ──────────────────────────────────────────

describe('la forma que devuelve el back', () => {
  it('una persona con dos arriendos llega como UNA fila con dos adentro', async () => {
    /*
     * El back agrupa por `tenantId` (`InquilinosService.listar`). Este test
     * congela esa expectativa: si algún día devolviera una fila por arriendo,
     * la pantalla listaría dos veces el mismo nombre sin decir por qué — que
     * es cómo alguien termina llamando dos veces al mismo inquilino.
     */
    const respuesta: Inquilino[] = [
      {
        tenantId: 't-1',
        nombre: 'María Gómez',
        email: 'maria@correo.co',
        telefono: '3105551234',
        documento: '52123456',
        arriendos: [
          {
            leaseId: 'l-1',
            contractId: 'c-1',
            estado: 'ACTIVE',
            desde: '2025-01-01',
            hasta: '2026-01-01',
            canonCop: 2_400_000,
            inmueble: { id: 'i-1', title: 'Apto 501', address: 'Cra 13 #55-20', city: 'Bogotá' },
          },
          {
            leaseId: 'l-2',
            contractId: 'c-2',
            estado: 'ENDED',
            desde: '2023-01-01',
            hasta: '2024-01-01',
            canonCop: 1_900_000,
            inmueble: null,
          },
        ],
      },
    ];
    mockFetchOnce(respuesta);

    const filas = await inquilinosApi.listar({ estado: 'todos' });

    expect(filas).toHaveLength(1);
    expect(filas[0].arriendos).toHaveLength(2);
    // Un arriendo sin inmueble (migración a medias) no puede reventar la fila.
    expect(filas[0].arriendos[1].inmueble).toBeNull();
  });
});

// ── (6) arriendosVigentes ────────────────────────────────────────────────────

describe('arriendosVigentes', () => {
  const persona: Inquilino = {
    tenantId: 't-1',
    nombre: 'María Gómez',
    email: null,
    telefono: null,
    documento: null,
    arriendos: (['ACTIVE', 'ENDING_SOON', 'ENDED', 'TERMINATED'] as const).map((estado, i) => ({
      leaseId: `l-${i}`,
      contractId: `c-${i}`,
      estado,
      desde: '2025-01-01',
      hasta: '2026-01-01',
      canonCop: 1_000_000,
      inmueble: null,
    })),
  };

  it('cuenta ENDING_SOON como vivo', () => {
    /*
     * El contrato está corriendo, sólo que se vence pronto. Tratarlo como
     * terminado haría desaparecer de «activos» a gente a la que todavía hay
     * que cobrarle — y el back tampoco lo excluye: su filtro de `activos` es
     * `status: 'ACTIVE'`, pero `terminados` es `{ not: 'ACTIVE' }`, así que
     * un ENDING_SOON aparece en «terminados» del back. Acá se decide qué
     * significa «vigente» para la pantalla.
     */
    expect(arriendosVigentes(persona).map((a) => a.estado)).toEqual([
      'ACTIVE',
      'ENDING_SOON',
    ]);
  });
});

// ── (7) crear ────────────────────────────────────────────────────────────────

describe('inquilinosApi.crear', () => {
  it('POSTea a /inmobiliaria/inquilinos con el cuerpo tal cual', async () => {
    const fetchMock = mockFetchOnce({
      inquilino: {
        tenantId: 'u-1',
        nombre: 'Carla Mesa',
        email: 'carla@ejemplo.co',
        telefono: null,
        documento: '1020304050',
        arriendos: [],
      },
      invitado: true,
    });

    const r = await inquilinosApi.crear({
      nombre: 'Carla Mesa',
      tipoDocumento: 'CC',
      documento: '1020304050',
      correo: 'carla@ejemplo.co',
    });

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/inquilinos')).toBe(true);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toEqual({
      nombre: 'Carla Mesa',
      tipoDocumento: 'CC',
      documento: '1020304050',
      correo: 'carla@ejemplo.co',
    });
    // La persona vuelve con la MISMA forma que una fila de la lista.
    expect(r.inquilino.arriendos).toEqual([]);
    expect(r.invitado).toBe(true);
  });

  it('🔴 no manda ninguna clave que el DTO no acepte', async () => {
    const fetchMock = mockFetchOnce({ inquilino: {}, invitado: false });

    await inquilinosApi.crear({ nombre: 'Carla Mesa', documento: '1020304050' });

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const cuerpo = JSON.parse(opts.body as string) as Record<string, unknown>;
    for (const clave of Object.keys(cuerpo)) {
      expect(CLAVES_DEL_DTO).toContain(clave);
    }
  });
});
