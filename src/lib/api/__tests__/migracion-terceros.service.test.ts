/**
 * migracion-terceros.service.test.ts — el paso 1 de la migración.
 *
 * 🔴 Por qué cada test compara contra una lista escrita a mano y no contra lo
 * que le pasamos: `back-erp/src/main.ts` monta el `ValidationPipe` global con
 * `forbidNonWhitelisted: true`. Una clave que el DTO no declara no se ignora —
 * devuelve 400 y con él las 1.200 filas del archivo. Un test que hace
 * `expect(cuerpo).toEqual(loQueLePasé)` pasa en verde mientras el front manda
 * `numero_cuenta` y el back espera `numeroCuenta`. Las constantes de abajo son
 * copias de los DTOs reales, con su ruta; ésa es la vara.
 *
 * Cobertura:
 *   (1) plantilla   → GET /plantilla?tipo=…
 *   (2) preparar    → POST /preparar, cuerpo {lote,tipo,filas} y nada más
 *   (3) filas       → GET /filas con los nombres de query del DTO
 *   (4) resumen     → GET /resumen?lote=…, escapado
 *   (5) corregir    → PATCH /filas/:id, sólo {campos,vincularAExistente}
 *   (6) descartar   → DELETE /filas/:id, sin cuerpo
 *   (7) resolverMasivo → PATCH /filas troceado en 200 (@ArrayMaxSize)
 *   (8) aplicar     → POST /aplicar, cuerpo {lote} exacto
 *   (9) las claves de fila coinciden con FilaTerceroDto, ni una más
 *  (10) celdasDemasiadoLargas replica los @MaxLength del DTO
 *  (11) lotesAbiertos deriva los lotes sin un GET /lotes que no existe
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  migracionTercerosApi,
  soloClavesDeFila,
  filaDePlantilla,
  celdasDemasiadoLargas,
  CLAVES_DE_FILA,
  MAX_IDS_POR_TANDA,
  type FilaDeStaging,
} from '../migracion-terceros.service';
import { setAccessToken } from '../client';

const BASE = '/inmobiliaria/migracion-terceros';

/**
 * Las 16 claves de `FilaTerceroDto`
 * (back-erp/src/inmobiliaria/migracion-terceros/dto/migracion-terceros.dto.ts).
 * Escritas a mano a propósito: si se importaran de `CLAVES_DE_FILA` el test
 * compararía el servicio contra sí mismo.
 */
const CLAVES_DEL_DTO_DE_FILA = [
  'tipoDocumento',
  'documento',
  'nombre',
  'correo',
  'telefono',
  'direccion',
  'ciudad',
  'banco',
  'tipoCuenta',
  'numeroCuenta',
  'titularCuenta',
  'responsableIva',
  'agenteRetenedorRenta',
  'agenteRetenedorIva',
  'agenteRetenedorIca',
  'notas',
  'externalId',
];

/** `PrepararTercerosDto`. */
const CLAVES_DEL_DTO_DE_PREPARAR = ['lote', 'tipo', 'filas'];

/** `CorregirFilaTerceroDto`. No hay «marcar como lista»: el estado lo decide
 * qué le falta, no quien la edita. */
const CLAVES_DEL_DTO_DE_CORREGIR = ['campos', 'vincularAExistente'];

/** `ResolverMasivoTercerosDto`. */
const CLAVES_DEL_DTO_MASIVO = ['ids', 'campos', 'vincularAExistente', 'descartar'];

/** `AplicarLoteTercerosDto`. */
const CLAVES_DEL_DTO_DE_APLICAR = ['lote'];

/** `ListarFilasTercerosDto`. */
const QUERY_DEL_DTO_DE_FILAS = ['lote', 'tipo', 'estado', 'pagina', 'porPagina'];

/** `@MaxLength` de cada celda, del mismo DTO. */
const LARGOS_DEL_DTO: Record<string, number> = {
  tipoDocumento: 30,
  documento: 40,
  nombre: 200,
  correo: 255,
  telefono: 40,
  direccion: 300,
  ciudad: 50,
  banco: 100,
  tipoCuenta: 40,
  numeroCuenta: 60,
  titularCuenta: 200,
  responsableIva: 20,
  agenteRetenedorRenta: 20,
  agenteRetenedorIva: 20,
  agenteRetenedorIca: 20,
  notas: 1000,
};

// ── Utilería ─────────────────────────────────────────────────────────────────

/** Encola respuestas, en orden. `resolverMasivo` hace varias llamadas. */
function mockFetchSequence(...cuerpos: unknown[]) {
  const fn = vi.fn();
  for (const body of cuerpos) {
    fn.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
      json: async () => body,
    } as unknown as Response);
  }
  globalThis.fetch = fn as typeof globalThis.fetch;
  return fn;
}

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

const RESUMEN_VACIO = {
  lote: 'l',
  total: 0,
  borradores: 0,
  requierenAtencion: 0,
  listos: 0,
  aplicados: 0,
  descartados: 0,
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
  setAccessToken('test-token');
});

afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

// ── (1) plantilla ────────────────────────────────────────────────────────────

describe('migracionTercerosApi.plantilla', () => {
  it('GETea /plantilla con el tipo, que es el único query del DTO', async () => {
    const fetchMock = mockFetchOnce({ tipo: 'PROPIETARIO', columnas: [] });

    await migracionTercerosApi.plantilla('PROPIETARIO');

    const [url, opts] = llamada(fetchMock);
    expect(opts.method).toBe('GET');
    expect(url).toContain(`${BASE}/plantilla`);
    const q = queryDe(url);
    expect([...q.keys()]).toEqual(['tipo']);
    // `PlantillaQueryDto` valida con `@IsEnum(TipoDeTercero)`: en minúscula es
    // un 400, no un filtro vacío.
    expect(q.get('tipo')).toBe('PROPIETARIO');
  });
});

// ── (2) (9) preparar ─────────────────────────────────────────────────────────

describe('migracionTercerosApi.preparar', () => {
  it('POSTea /preparar con {lote, tipo, filas} y NADA más', async () => {
    const fetchMock = mockFetchOnce(RESUMEN_VACIO);

    await migracionTercerosApi.preparar('propietarios-marzo', 'PROPIETARIO', [
      { nombre: 'Jorge Restrepo', documento: '1020304050' },
    ]);

    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/preparar`)).toBe(true);
    expect(opts.method).toBe('POST');

    const cuerpo = cuerpoDe(opts);
    const sobrantes = Object.keys(cuerpo).filter(
      (k) => !CLAVES_DEL_DTO_DE_PREPARAR.includes(k),
    );
    expect(sobrantes).toEqual([]);
    expect(cuerpo.lote).toBe('propietarios-marzo');
    expect(cuerpo.tipo).toBe('PROPIETARIO');
  });

  it('ninguna fila lleva una clave fuera de FilaTerceroDto', async () => {
    /*
     * El caso real: el Excel de la inmobiliaria trae «Observaciones» y
     * «Consecutivo», y el armado de filas las arrastra. Una sola de ésas es un
     * 400 con las 1.200 filas adentro — no una fila marcada, el archivo entero
     * rechazado. Verificado que muerde: agregando `consecutivo` a la fila,
     * falla con «expected [ 'consecutivo' ] to deeply equal []».
     */
    const fetchMock = mockFetchOnce(RESUMEN_VACIO);

    await migracionTercerosApi.preparar('lote-1', 'PROPIETARIO', [
      filaDePlantilla({
        nombre: 'Jorge Restrepo',
        documento: '1020304050',
        consecutivo: '77',
        observaciones: 'llamar los martes',
        'Matrícula inmobiliaria': '050-123',
      }),
    ]);

    const [, opts] = llamada(fetchMock);
    const filas = cuerpoDe(opts).filas as Record<string, unknown>[];
    const sobrantes = filas.flatMap((f) =>
      Object.keys(f).filter((k) => !CLAVES_DEL_DTO_DE_FILA.includes(k)),
    );
    expect(sobrantes).toEqual([]);
    expect(filas[0]).toHaveProperty('nombre', 'Jorge Restrepo');
  });

  it('`CLAVES_DE_FILA` es exactamente el DTO — ni de más ni de menos', () => {
    // De más ⇒ 400 en producción. De menos ⇒ el dato del Excel se tira en
    // silencio, que es peor porque nadie se entera.
    expect([...CLAVES_DE_FILA].sort()).toEqual([...CLAVES_DEL_DTO_DE_FILA].sort());
  });
});

// ── (3) filas ────────────────────────────────────────────────────────────────

describe('migracionTercerosApi.filas', () => {
  it('usa los nombres de query de ListarFilasTercerosDto', async () => {
    const fetchMock = mockFetchOnce({ filas: [], total: 0, pagina: 1, porPagina: 25 });

    await migracionTercerosApi.filas({
      lote: 'lote-1',
      tipo: 'INQUILINO',
      estado: 'REQUIERE_ATENCION',
      pagina: 2,
      porPagina: 25,
    });

    const [url, opts] = llamada(fetchMock);
    expect(opts.method).toBe('GET');
    const q = queryDe(url);
    expect([...q.keys()].filter((k) => !QUERY_DEL_DTO_DE_FILAS.includes(k))).toEqual([]);
    expect(q.get('estado')).toBe('REQUIERE_ATENCION');
    // `porPagina` viaja como texto pero el DTO lo pasa por `@Type(() => Number)`.
    expect(q.get('porPagina')).toBe('25');
  });

  it('sin filtros no arma query', async () => {
    const fetchMock = mockFetchOnce({ filas: [], total: 0, pagina: 1, porPagina: 50 });
    await migracionTercerosApi.filas();
    const [url] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/filas`)).toBe(true);
  });
});

// ── (4) resumen ──────────────────────────────────────────────────────────────

describe('migracionTercerosApi.resumen', () => {
  it('escapa el nombre del lote', async () => {
    // El nombre lo escribe la persona: «propietarios marzo / 2026» es legítimo
    // (`@MaxLength(60)`, sin patrón) y sin escapar parte el query.
    const fetchMock = mockFetchOnce(RESUMEN_VACIO);

    await migracionTercerosApi.resumen('propietarios marzo/2026');

    const [url] = llamada(fetchMock);
    expect(queryDe(url).get('lote')).toBe('propietarios marzo/2026');
  });
});

// ── (5) corregir ─────────────────────────────────────────────────────────────

describe('migracionTercerosApi.corregir', () => {
  it('PATCHea /filas/:id sólo con las claves de CorregirFilaTerceroDto', async () => {
    const fetchMock = mockFetchOnce({ id: 'f-1' });

    await migracionTercerosApi.corregir('f-1', {
      campos: { banco: 'BANCOLOMBIA', tipoCuenta: 'AHORROS' },
      vincularAExistente: true,
    });

    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/filas/f-1`)).toBe(true);
    expect(opts.method).toBe('PATCH');

    const cuerpo = cuerpoDe(opts);
    expect(Object.keys(cuerpo).filter((k) => !CLAVES_DEL_DTO_DE_CORREGIR.includes(k))).toEqual([]);
    const campos = cuerpo.campos as Record<string, unknown>;
    expect(Object.keys(campos).filter((k) => !CLAVES_DEL_DTO_DE_FILA.includes(k))).toEqual([]);
    expect(cuerpo.vincularAExistente).toBe(true);
  });

  it('sin cambios manda un cuerpo vacío: es una revalidación, no un parche', async () => {
    // `campos: undefined` sobreviviría a `JSON.stringify` como clave ausente,
    // pero `campos: {}` NO: el back haría `{...loQueHabía, ...{}}`, que es
    // inofensivo, mientras que un `vincularAExistente: undefined` explícito
    // sí borraría la decisión previa. Se mandan sólo las claves presentes.
    const fetchMock = mockFetchOnce({ id: 'f-1' });

    await migracionTercerosApi.corregir('f-1');

    const [, opts] = llamada(fetchMock);
    expect(cuerpoDe(opts)).toEqual({});
  });

  it('una celda vaciada a propósito viaja como "" — omitirla la dejaría como estaba', async () => {
    /*
     * El back hace `{...aFilaCruda(previos), ...cambios.campos}`. Omitir una
     * clave significa «dejala como está»; sólo un `''` explícito la borra. Si
     * el servicio filtrara los vacíos también acá, borrar un correo mal
     * escrito sería imposible desde la pantalla.
     */
    const fetchMock = mockFetchOnce({ id: 'f-1' });

    await migracionTercerosApi.corregir('f-1', { campos: { correo: '' } });

    const [, opts] = llamada(fetchMock);
    expect((cuerpoDe(opts).campos as Record<string, unknown>).correo).toBe('');
  });
});

// ── (6) descartar ────────────────────────────────────────────────────────────

describe('migracionTercerosApi.descartar', () => {
  it('DELETEa /filas/:id sin cuerpo', async () => {
    const fetchMock = mockFetchOnce({ id: 'f-1', estado: 'DESCARTADO' });

    await migracionTercerosApi.descartar('f-1');

    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/filas/f-1`)).toBe(true);
    expect(opts.method).toBe('DELETE');
    expect(opts.body).toBeUndefined();
  });
});

// ── (7) resolverMasivo ───────────────────────────────────────────────────────

describe('migracionTercerosApi.resolverMasivo', () => {
  it('PATCHea /filas sólo con las claves de ResolverMasivoTercerosDto', async () => {
    const fetchMock = mockFetchSequence({ pedidas: 2, aplicadas: 2, fallidas: [] });

    await migracionTercerosApi.resolverMasivo(['a', 'b'], {
      campos: { banco: 'BANCOLOMBIA' },
      descartar: false,
    });

    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/filas`)).toBe(true);
    expect(opts.method).toBe('PATCH');
    const cuerpo = cuerpoDe(opts);
    expect(Object.keys(cuerpo).filter((k) => !CLAVES_DEL_DTO_MASIVO.includes(k))).toEqual([]);
    expect(cuerpo.ids).toEqual(['a', 'b']);
  });

  it('trocea en tandas de 200 — el DTO corta ahí con @ArrayMaxSize', async () => {
    /*
     * 450 ids en un solo PATCH son un 400 («ids must contain no more than 200
     * elements») y CERO filas resueltas. El comentario del DTO lo dice con
     * todas las letras: «el front trocea; llegar acá con más de 200 dice que
     * el trozador está roto». Éste es el trozador.
     */
    expect(MAX_IDS_POR_TANDA).toBe(200);

    const ids = Array.from({ length: 450 }, (_, i) => `id-${i}`);
    const fetchMock = mockFetchSequence(
      { pedidas: 200, aplicadas: 200, fallidas: [] },
      { pedidas: 200, aplicadas: 195, fallidas: [{ id: 'id-201', fila: 202, motivo: 'falta banco' }] },
      { pedidas: 50, aplicadas: 50, fallidas: [] },
    );

    const r = await migracionTercerosApi.resolverMasivo(ids, { descartar: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const tandas = [0, 1, 2].map((i) => cuerpoDe(llamada(fetchMock, i)[1]).ids as string[]);
    expect(tandas.map((t) => t.length)).toEqual([200, 200, 50]);
    // Sin huecos ni repetidos: las tres tandas son la lista original.
    expect(tandas.flat()).toEqual(ids);

    // Los conteos se SUMAN. Devolver los de la última tanda diría «50 pedidas».
    expect(r.pedidas).toBe(450);
    expect(r.aplicadas).toBe(445);
    expect(r.fallidas).toHaveLength(1);
  });

  it('una tanda que revienta se reporta como fallidas, no se traga', async () => {
    // Una masiva que dice «listo» tapando lo que no pudo es exactamente la
    // mentira que este diseño evita.
    const ids = Array.from({ length: 250 }, (_, i) => `id-${i}`);
    const fn = vi.fn();
    fn.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ pedidas: 200, aplicadas: 200, fallidas: [] }),
      json: async () => ({ pedidas: 200, aplicadas: 200, fallidas: [] }),
    } as unknown as Response);
    fn.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ message: 'Se cayó la base' }),
      json: async () => ({ message: 'Se cayó la base' }),
    } as unknown as Response);
    globalThis.fetch = fn as typeof globalThis.fetch;

    const r = await migracionTercerosApi.resolverMasivo(ids, { descartar: true });

    expect(r.pedidas).toBe(250);
    expect(r.aplicadas).toBe(200);
    expect(r.fallidas).toHaveLength(50);
    expect(r.fallidas[0].motivo).toContain('Se cayó la base');
  });

  it('no manda una tanda vacía cuando no hay ids', async () => {
    const fetchMock = mockFetchSequence();
    const r = await migracionTercerosApi.resolverMasivo([], { descartar: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(r).toEqual({ pedidas: 0, aplicadas: 0, fallidas: [] });
  });
});

// ── (8) aplicar ──────────────────────────────────────────────────────────────

describe('migracionTercerosApi.aplicar', () => {
  it('POSTea /aplicar con {lote} exacto', async () => {
    const fetchMock = mockFetchOnce({
      lote: 'lote-1',
      intentadas: 3,
      aplicadas: 3,
      fallidas: 0,
      invitados: 2,
      resultados: [],
    });

    await migracionTercerosApi.aplicar('lote-1');

    const [url, opts] = llamada(fetchMock);
    expect(url.endsWith(`${BASE}/aplicar`)).toBe(true);
    expect(opts.method).toBe('POST');
    const cuerpo = cuerpoDe(opts);
    expect(Object.keys(cuerpo).filter((k) => !CLAVES_DEL_DTO_DE_APLICAR.includes(k))).toEqual([]);
    expect(cuerpo.lote).toBe('lote-1');
  });
});

// ── (9) armado de celdas ─────────────────────────────────────────────────────

describe('el armado de una fila', () => {
  it('convierte a texto lo que xlsx no devuelve como texto', () => {
    /*
     * Una cédula parseada de un `.xlsx` llega como número, y una fecha como
     * `Date`. El DTO transforma con `String()` antes de validar: un `Date`
     * llegaría como «Mon Aug 31 2026 00:00:00 GMT-0500 (…)» y reventaría el
     * `@MaxLength(40)` del documento. La conversión se decide acá.
     */
    const fila = soloClavesDeFila({
      documento: 1020304050,
      nombre: '  Jorge Restrepo  ',
      responsableIva: false,
      notas: null,
    });

    expect(fila.documento).toBe('1020304050');
    expect(fila.nombre).toBe('Jorge Restrepo');
    // `false` NO es «no lo sabemos»: el back mapea «No» a `false` y el vacío a
    // `null`. Mandar la cadena «false» caería en BOOLEANO_DESCONOCIDO.
    expect(fila.responsableIva).toBe('No');
    expect(fila.notas).toBe('');
  });

  it('filaDePlantilla tira las celdas vacías; soloClavesDeFila las conserva', () => {
    const cruda = { nombre: 'Jorge', correo: '', telefono: '   ' };
    expect(filaDePlantilla(cruda)).toEqual({ nombre: 'Jorge' });
    expect(soloClavesDeFila(cruda)).toEqual({ nombre: 'Jorge', correo: '', telefono: '' });
  });
});

// ── (10) largos ──────────────────────────────────────────────────────────────

describe('celdasDemasiadoLargas', () => {
  it('replica los @MaxLength del DTO', () => {
    // Si el back afloja o aprieta un largo y esta tabla no se entera, el aviso
    // de la pantalla miente en una de las dos direcciones.
    for (const [campo, maximo] of Object.entries(LARGOS_DEL_DTO)) {
      const sobra = celdasDemasiadoLargas([{ [campo]: 'x'.repeat(maximo + 1) }]);
      expect(sobra, `${campo} debería exceder en ${maximo + 1}`).toHaveLength(1);
      expect(sobra[0].maximo).toBe(maximo);
      const justo = celdasDemasiadoLargas([{ [campo]: 'x'.repeat(maximo) }]);
      expect(justo, `${campo} en ${maximo} debería caber`).toEqual([]);
    }
  });

  it('señala la fila con el número que la persona ve en el Excel', () => {
    const problemas = celdasDemasiadoLargas([
      { nombre: 'Jorge' },
      { nombre: 'x'.repeat(201) },
    ]);
    // 1-based: la segunda fila de datos es la 2, no la 1.
    expect(problemas).toEqual([{ fila: 2, campo: 'nombre', largo: 201, maximo: 200 }]);
  });
});

// ── (11) lotesAbiertos ───────────────────────────────────────────────────────

describe('migracionTercerosApi.lotesAbiertos', () => {
  function filaDeStaging(over: Partial<FilaDeStaging>): FilaDeStaging {
    return {
      id: 'f-1',
      lote: 'lote-1',
      tipo: 'PROPIETARIO',
      estado: 'REQUIERE_ATENCION',
      datos: { _fila: 1 },
      errores: null,
      propietarioId: null,
      userId: null,
      aplicadoAt: null,
      createdAt: '2026-08-30T10:00:00.000Z',
      updatedAt: '2026-08-30T10:00:00.000Z',
      ...over,
    };
  }

  /**
   * Los resúmenes salen en paralelo (`Promise.all`), así que encolar
   * respuestas por orden ata el test a un detalle que no es el contrato. El
   * mock responde por URL: es lo que hace el back.
   */
  function mockFetchPorUrl(
    pagina: unknown,
    resumenes: Record<string, { cuerpo: unknown; ok?: boolean }>,
  ) {
    const fn = vi.fn(async (url: string) => {
      const responder = (cuerpo: unknown, ok = true) =>
        ({
          ok,
          status: ok ? 200 : 500,
          text: async () => JSON.stringify(cuerpo),
          json: async () => cuerpo,
        }) as unknown as Response;

      if (url.includes('/resumen')) {
        const lote = queryDe(url).get('lote') ?? '';
        const r = resumenes[lote];
        if (!r) throw new Error(`resumen inesperado para «${lote}»`);
        return responder(r.cuerpo, r.ok ?? true);
      }
      return responder(pagina);
    });
    globalThis.fetch = fn as unknown as typeof globalThis.fetch;
    return fn;
  }

  it('pide el endpoint real del back, sin derivar nada', async () => {
    /*
     * 🔴 Antes esto se derivaba de UNA página de 200 filas más un `/resumen`
     * por lote. Con una carga real de 600 propietarios los lotes viejos no
     * entraban en esa página: la tarjeta de «carga sin terminar» no aparecía
     * y la persona resubía el archivo, duplicando a todo el mundo. El back
     * ahora tiene `GET /lotes` (un groupBy) y los ve todos.
     */
    const fetchMock = mockFetchOnce([
      { ...RESUMEN_VACIO, lote: 'propietarios-marzo', tipo: 'PROPIETARIO', actualizado: '2026-08-31T09:00:00.000Z', total: 640, requierenAtencion: 12, listos: 628 },
      { ...RESUMEN_VACIO, lote: 'inquilinos-abril', tipo: 'INQUILINO', actualizado: '2026-08-29T08:00:00.000Z', total: 300, requierenAtencion: 3, listos: 297 },
    ]);

    const lotes = await migracionTercerosApi.lotesAbiertos();

    // UNA sola petición, no 1 + N.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(llamada(fetchMock)[0]).toContain('/inmobiliaria/migracion-terceros/lotes');
    // El orden y el filtrado los decide el back: acá no se reordena nada.
    expect(lotes.map((l) => l.lote)).toEqual(['propietarios-marzo', 'inquilinos-abril']);
    expect(lotes[0].total).toBe(640);
    expect(lotes[1].tipo).toBe('INQUILINO');
  });

  it('una lista vacía es una lista vacía: no hay nada que retomar', async () => {
    mockFetchOnce([]);

    expect(await migracionTercerosApi.lotesAbiertos()).toEqual([]);
  });
});
