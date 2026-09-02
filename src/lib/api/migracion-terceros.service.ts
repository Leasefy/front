/**
 * Migración de terceros — el paso 1 del arranque de una inmobiliaria.
 *
 * La secuencia acordada es **terceros → propiedades → contratos → cuentas del
 * PUC → registros contables**, y hasta hoy el paso 1 no existía: los
 * propietarios se creaban de a uno y los inquilinos no se cargaban nunca. Una
 * inmobiliaria con 600 propietarios no empieza. Portofino lo intentó dos meses
 * contra el ERP anterior y lo abandonó — la migración no es una utilidad, es
 * la barrera de adopción.
 *
 * ── preparar → corregir → aplicar ───────────────────────────────────────────
 *
 * Tres pasos y no uno. Un `POST` que crea o falla obliga a corregir el Excel y
 * volver a subirlo por cada celda vacía, y en 600 propietarios siempre falta
 * una. Acá la fila entra siempre, se revisa en pantalla, y sólo lo que quedó
 * `LISTO` se convierte en una ficha real.
 *
 * ── 🔴 Por qué cada cuerpo se arma con una lista explícita de claves ────────
 *
 * `back-erp/src/main.ts` monta el `ValidationPipe` global con
 * `whitelist: true` **y `forbidNonWhitelisted: true`**. Una sola clave que el
 * DTO no declare no se ignora: tira un 400 y con él las 1.200 filas del
 * archivo. Por eso `filaDePlantilla()` filtra contra `CLAVES_DE_FILA` en vez
 * de reenviar lo que venga del Excel, y por eso los tests de este archivo
 * comparan el juego de claves contra los DTOs y no contra sí mismos.
 */

import { apiClient } from './client';

// ══ Vocabulario del back ════════════════════════════════════════════════════

/** `TipoDeTercero` en `schema.prisma`. */
export type TipoDeTercero = 'PROPIETARIO' | 'INQUILINO';

/** `EstadoMigracionTercero`. `BORRADOR` existe en el enum pero `preparar()`
 * nunca lo persiste: una fila nace `LISTO` o `REQUIERE_ATENCION`. */
export type EstadoMigracionTercero =
  | 'BORRADOR'
  | 'REQUIERE_ATENCION'
  | 'LISTO'
  | 'APLICADO'
  | 'DESCARTADO';

/**
 * `CodigoDeError` en `normalizar-tercero.ts`.
 *
 * Los CÓDIGOS son el contrato; `mensaje` es copy y puede cambiar sin romper
 * nada. Por eso la pantalla decide con el código (¿ofrezco «es la misma
 * persona»?) y muestra el mensaje tal cual.
 */
export type CodigoDeError =
  | 'FALTA_NOMBRE'
  | 'FALTA_TIPO_DOCUMENTO'
  | 'TIPO_DOCUMENTO_DESCONOCIDO'
  | 'FALTA_DOCUMENTO'
  | 'DOCUMENTO_INVALIDO'
  | 'FALTA_CORREO'
  | 'CORREO_INVALIDO'
  | 'TELEFONO_INVALIDO'
  | 'FALTA_BANCO'
  | 'BANCO_DESCONOCIDO'
  | 'FALTA_TIPO_CUENTA'
  | 'TIPO_CUENTA_DESCONOCIDO'
  | 'FALTA_NUMERO_CUENTA'
  | 'DUPLICADO_EN_EL_LOTE'
  | 'CORREO_REPETIDO_EN_EL_LOTE'
  | 'YA_EXISTE_EN_LA_AGENCIA'
  | 'FALLO_AL_APLICAR';

/**
 * Los tres códigos que significan «puede que sea la misma persona».
 *
 * Son los únicos con salida que no es descartar la fila: `vincularAExistente`.
 * Un duplicado se **pregunta**, nunca se fusiona solo — dos personas distintas
 * con el mismo documento mal tecleado terminarían siendo una.
 */
export const CODIGOS_DE_DUPLICADO: readonly CodigoDeError[] = [
  'DUPLICADO_EN_EL_LOTE',
  'CORREO_REPETIDO_EN_EL_LOTE',
  'YA_EXISTE_EN_LA_AGENCIA',
];

export interface ErrorDeFila {
  codigo: CodigoDeError;
  /** Qué celda señalar. `null` cuando el problema es la fila entera. */
  campo: string | null;
  /** En español, listo para mostrar tal cual. */
  mensaje: string;
  /** Sólo en duplicados: a qué ficha o a qué fila del archivo se refiere. */
  referencia?: { id?: string; nombre?: string; fila?: number };
}

/**
 * Las 17 claves que `FilaTerceroDto` declara — **exactamente**, ni una más.
 *
 * `direccion`…`notas` sólo aplican a propietarios; en una fila de inquilino el
 * back las ignora, así que mandarlas vacías no rompe nada, pero mandar una
 * clave de más sí.
 */
export const CLAVES_DE_FILA = [
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
  // El id que el tercero traía del sistema anterior. Informativo: no es
  // llave, no deduplica y no lo mira ningún camino de negocio.
  'externalId',
] as const;

export type CampoDeFila = (typeof CLAVES_DE_FILA)[number];

/** Una fila como viaja al back: toda celda es texto, toda celda puede faltar. */
export type FilaTercero = Partial<Record<CampoDeFila, string>>;

/**
 * `@MaxLength` de cada celda en `FilaTerceroDto`.
 *
 * Se copia acá para poder avisar ANTES de mandar. Una celda de 250 caracteres
 * en la fila 800 no devuelve «la fila 800 tiene el nombre muy largo»: devuelve
 * un 400 con las 1.200 filas adentro y sin decir cuál. Avisar antes es la
 * diferencia entre corregir una celda y abandonar la migración.
 */
export const LARGO_MAXIMO_DE_CELDA: Record<CampoDeFila, number> = {
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
  externalId: 64,
};

/** `MAX_FILAS_POR_LOTE` en `MigracionTercerosService`. */
export const MAX_FILAS_POR_LOTE = 5_000;

/**
 * `@ArrayMaxSize(200)` en `ResolverMasivoTercerosDto`.
 *
 * El DTO lo dice con todas las letras: «el front trocea; llegar acá con más de
 * 200 dice que el trozador está roto». `resolverMasivo()` de abajo es ese
 * trozador — cada fila se revalida una por una en el back, así que un `ids`
 * sin tope es un 504 con una fracción desconocida ya escrita.
 */
export const MAX_IDS_POR_TANDA = 200;

/** Una columna esperada del archivo, tal como la declara el back. */
export interface ColumnaDePlantilla {
  /** La llave del campo tal como viaja en `filas[]`. */
  campo: string;
  /** El encabezado de la plantilla que se descarga. */
  titulo: string;
  /** Si falta, la fila queda en `REQUIERE_ATENCION`. Nunca rechaza el archivo. */
  obligatoria: boolean;
  ejemplo: string;
  /** Catálogo cerrado, cuando lo hay. Vale también para el `<select>`. */
  opciones?: readonly string[];
  /** Encabezados equivalentes que se aceptan sin renombrar la columna. */
  alias: readonly string[];
  ayuda?: string;
}

export interface PlantillaDeTerceros {
  tipo: TipoDeTercero;
  columnas: ColumnaDePlantilla[];
}

/** `MigracionTercero.datos`: la fila ya normalizada por el back. */
export interface DatosDeTercero {
  /** 1-based, como se ve en el Excel: es el número que el operador busca. */
  _fila: number;
  _decisiones?: { vincularAExistente?: boolean };
  [campo: string]: unknown;
}

/** Una fila del staging, tal como la devuelve el back. */
export interface FilaDeStaging {
  id: string;
  lote: string;
  tipo: TipoDeTercero;
  estado: EstadoMigracionTercero;
  datos: DatosDeTercero;
  errores: ErrorDeFila[] | null;
  propietarioId: string | null;
  userId: string | null;
  aplicadoAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Cuántas veces se escribió esta fila. Se devuelve al corregir para que el
   * back detecte que otra pestaña ya la cambió. Un back viejo no lo manda:
   * ausente ⇒ no se manda de vuelta y no hay control, como antes.
   */
  version?: number;
}

/** El 409 de `corregir` cuando otra pestaña guardó primero. */
export const CODIGO_FILA_DESACTUALIZADA = 'FILA_DESACTUALIZADA';

export interface ResumenDeLote {
  lote: string;
  total: number;
  borradores: number;
  requierenAtencion: number;
  listos: number;
  aplicados: number;
  descartados: number;
}

export interface PaginaDeFilas {
  filas: FilaDeStaging[];
  /** Cuántas hay en total con este filtro — NO el largo de `filas`. */
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ResultadoMasivo {
  pedidas: number;
  aplicadas: number;
  fallidas: { id: string; fila: number | null; motivo: string }[];
}

export interface ResultadoDeFila {
  id: string;
  fila: number;
  estado: 'aplicado' | 'fallido';
  propietarioId?: string;
  userId?: string;
  /** `true` sólo cuando ESTA corrida mandó la invitación al portal. */
  invitado: boolean;
  motivo?: string;
  /**
   * Se aplicó, pero hay algo que mirar: la cuenta de ese correo ya tenía
   * OTRO documento y se dejó el de la cuenta. Un back viejo no lo manda.
   */
  advertencia?: string;
}

export interface ResumenDeAplicacion {
  lote: string;
  intentadas: number;
  aplicadas: number;
  fallidas: number;
  invitados: number;
  /** Cuentas creadas sin invitación por el límite de correo del proveedor. Un back viejo no lo manda. */
  sinInvitar?: number;
  resultados: ResultadoDeFila[];
  /**
   * Cuántas filas listas quedaron sin intentarse en esta llamada: mientras
   * sea > 0 hay que volver a llamar. Un back viejo no lo manda — ausente se
   * lee como 0, o sea «no queda nada», que es el comportamiento de antes.
   */
  restantes?: number;
}

/** Un lote con su tipo, para la tarjeta de «retomar». */
export interface LoteDeTerceros extends ResumenDeLote {
  tipo: TipoDeTercero;
  /** El `updatedAt` más reciente de sus filas: para ordenar por lo último. */
  actualizado: string;
}

// ══ Armado de cuerpos ═══════════════════════════════════════════════════════

const CLAVES = new Set<string>(CLAVES_DE_FILA);

/**
 * Una celda del Excel como texto.
 *
 * `xlsx` devuelve números para las cédulas y `Date` para las fechas. El DTO
 * transforma todo a `String()` antes de validar, así que un `Date` llegaría
 * como «Mon Aug 31 2026 00:00:00 GMT-0500 (…)» y reventaría el `@MaxLength`
 * de un documento. Acá se decide el texto, no allá.
 */
function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return String(valor).trim();
}

/**
 * Deja SÓLO las claves que el DTO declara, cada una como texto.
 *
 * Las vacías se conservan como `''`. Es lo que hace falta al **corregir**: el
 * back mezcla `{...loQueHabía, ...campos}`, así que omitir una clave significa
 * «dejala como está» y sólo un `''` explícito la borra. Para **preparar** se
 * usa `filaDePlantilla()`, que sí las tira.
 */
export function soloClavesDeFila(cruda: Record<string, unknown>): FilaTercero {
  const salida: FilaTercero = {};
  for (const [clave, valor] of Object.entries(cruda)) {
    if (!CLAVES.has(clave)) continue;
    salida[clave as CampoDeFila] = celda(valor);
  }
  return salida;
}

/**
 * La misma limpieza, pero tirando las celdas vacías.
 *
 * Un archivo de 1.200 propietarios × 16 columnas mayormente vacías es un
 * cuerpo enorme para decir «no sé». El back trata la clave ausente y el `''`
 * igual al preparar (`normalizarTercero` los ve como vacío), así que la
 * ausente es preferible.
 */
export function filaDePlantilla(cruda: Record<string, unknown>): FilaTercero {
  const salida: FilaTercero = {};
  for (const [clave, valor] of Object.entries(soloClavesDeFila(cruda))) {
    if (valor) salida[clave as CampoDeFila] = valor;
  }
  return salida;
}

/** Una celda que no cabe en su columna, con dónde está. */
export interface CeldaDemasiadoLarga {
  /** 1-based, como en el Excel. */
  fila: number;
  campo: CampoDeFila;
  largo: number;
  maximo: number;
}

/**
 * Las celdas que el back va a rechazar por largo, antes de mandarlas.
 *
 * No se truncan: recortar una cédula o una razón social en silencio es peor
 * que el 400. Se listan con su número de fila para que la persona sepa dónde
 * mirar en su propio archivo.
 */
export function celdasDemasiadoLargas(filas: FilaTercero[]): CeldaDemasiadoLarga[] {
  const problemas: CeldaDemasiadoLarga[] = [];
  filas.forEach((fila, i) => {
    for (const [clave, valor] of Object.entries(fila)) {
      const maximo = LARGO_MAXIMO_DE_CELDA[clave as CampoDeFila];
      if (valor && valor.length > maximo) {
        problemas.push({ fila: i + 1, campo: clave as CampoDeFila, largo: valor.length, maximo });
      }
    }
  });
  return problemas;
}

// ══ HTTP ════════════════════════════════════════════════════════════════════

const BASE = '/inmobiliaria/migracion-terceros';

export const migracionTercerosApi = {
  /**
   * Las columnas esperadas, por tipo. **Única fuente de verdad.**
   *
   * La descarga de la plantilla vacía y el mapeo de los encabezados del Excel
   * salen de acá los dos. Si el front escribiera su propia lista, el día que
   * se agregue una columna una de las dos se queda vieja y el dato se pierde
   * sin un solo error.
   */
  async plantilla(tipo: TipoDeTercero): Promise<PlantillaDeTerceros> {
    return apiClient.get<PlantillaDeTerceros>(`${BASE}/plantilla?tipo=${tipo}`);
  },

  /**
   * 1. Guarda las filas para revisar. **No crea ninguna ficha.**
   *
   * `lote` no se puede reusar: el back devuelve 409 `LOTE_YA_EXISTE` porque
   * subir dos veces el mismo nombre apilaría las filas del segundo archivo
   * sobre las del primero y el resumen dejaría de significar algo. Tampoco se
   * puede trocear por esa misma razón — el archivo entero va en un request.
   */
  async preparar(
    lote: string,
    tipo: TipoDeTercero,
    filas: FilaTercero[],
  ): Promise<ResumenDeLote> {
    return apiClient.post<ResumenDeLote>(`${BASE}/preparar`, { lote, tipo, filas });
  },

  /**
   * 2a. La lista de trabajo. `total` viene del back, NO del largo de `filas`:
   * con páginas de 25 y 400 pendientes, medirlo por lo recibido diría
   * «quedan 25» para siempre.
   */
  async filas(opciones: {
    lote?: string;
    tipo?: TipoDeTercero;
    estado?: EstadoMigracionTercero;
    pagina?: number;
    porPagina?: number;
  } = {}): Promise<PaginaDeFilas> {
    const q = new URLSearchParams();
    if (opciones.lote) q.set('lote', opciones.lote);
    if (opciones.tipo) q.set('tipo', opciones.tipo);
    if (opciones.estado) q.set('estado', opciones.estado);
    if (opciones.pagina) q.set('pagina', String(opciones.pagina));
    if (opciones.porPagina) q.set('porPagina', String(opciones.porPagina));
    const qs = q.toString();
    return apiClient.get<PaginaDeFilas>(`${BASE}/filas${qs ? `?${qs}` : ''}`);
  },

  /** 2b. Cuántas hay en cada estado. */
  async resumen(lote: string): Promise<ResumenDeLote> {
    return apiClient.get<ResumenDeLote>(`${BASE}/resumen?lote=${encodeURIComponent(lote)}`);
  },

  /**
   * 2c. Corregir una fila. La fila se re-normaliza ENTERA en el back, así que
   * pasa sola a `LISTO` cuando ya no le falta nada.
   *
   * Sin `campos` y sin `vincularAExistente` es una revalidación: útil cuando
   * la ficha con la que chocaba se resolvió por otro lado.
   */
  async corregir(
    id: string,
    cambios: {
      campos?: FilaTercero;
      vincularAExistente?: boolean;
      /**
       * La versión que la pantalla tenía al empezar a editar. Si otra pestaña
       * guardó primero, el back responde 409 `FILA_DESACTUALIZADA` en vez de
       * pisar su trabajo.
       */
      version?: number;
    } = {},
  ): Promise<FilaDeStaging> {
    const cuerpo: {
      campos?: FilaTercero;
      vincularAExistente?: boolean;
      version?: number;
    } = {};
    if (cambios.campos) cuerpo.campos = soloClavesDeFila(cambios.campos);
    if (cambios.vincularAExistente !== undefined) {
      cuerpo.vincularAExistente = cambios.vincularAExistente;
    }
    if (cambios.version !== undefined) cuerpo.version = cambios.version;
    return apiClient.patch<FilaDeStaging>(`${BASE}/filas/${encodeURIComponent(id)}`, cuerpo);
  },

  /** 2d. No traer esta fila. No se borra: queda el rastro. */
  async descartar(id: string): Promise<FilaDeStaging> {
    return apiClient.delete<FilaDeStaging>(`${BASE}/filas/${encodeURIComponent(id)}`);
  },

  /**
   * 2e. La misma corrección —o el mismo descarte— a muchas filas.
   *
   * **Trocea en tandas de `MAX_IDS_POR_TANDA`** y suma los resultados: el DTO
   * corta en 200 y una selección de 600 devolvería un 400 en vez de aplicar
   * nada. Las tandas van en serie a propósito — el back revalida fila por
   * fila (no hay `updateMany` posible) y tres tandas en paralelo son tres
   * transacciones largas compitiendo por las mismas filas.
   *
   * Si una tanda falla entera, su error se refleja como una fallida por cada
   * id que la componía: una masiva que dice «listo» tapando lo que no pudo es
   * exactamente la mentira que este diseño evita.
   */
  async resolverMasivo(
    ids: string[],
    cambios: { campos?: FilaTercero; vincularAExistente?: boolean; descartar?: boolean },
  ): Promise<ResultadoMasivo> {
    const base: { campos?: FilaTercero; vincularAExistente?: boolean; descartar?: boolean } = {};
    if (cambios.campos) base.campos = soloClavesDeFila(cambios.campos);
    if (cambios.vincularAExistente !== undefined) {
      base.vincularAExistente = cambios.vincularAExistente;
    }
    if (cambios.descartar !== undefined) base.descartar = cambios.descartar;

    const total: ResultadoMasivo = { pedidas: 0, aplicadas: 0, fallidas: [] };

    for (let i = 0; i < ids.length; i += MAX_IDS_POR_TANDA) {
      const tanda = ids.slice(i, i + MAX_IDS_POR_TANDA);
      try {
        const r = await apiClient.patch<ResultadoMasivo>(`${BASE}/filas`, {
          ids: tanda,
          ...base,
        });
        total.pedidas += r.pedidas;
        total.aplicadas += r.aplicadas;
        total.fallidas.push(...r.fallidas);
      } catch (e) {
        const motivo = e instanceof Error ? e.message : 'No pudimos aplicar esta tanda.';
        total.pedidas += tanda.length;
        total.fallidas.push(...tanda.map((id) => ({ id, fila: null, motivo })));
      }
    }

    return total;
  },

  /**
   * 3. Crear de verdad las fichas de las filas `LISTO`, POR TANDAS.
   *
   * `maximo` es cuántas toma esta llamada; la respuesta trae `restantes`. El
   * loop vive en `aplicarLoteCompleto`, para que una carga de 600 no viva
   * dentro de una sola petición HTTP que cualquier proxy puede cortar.
   */
  async aplicar(lote: string, maximo?: number): Promise<ResumenDeAplicacion> {
    return apiClient.post<ResumenDeAplicacion>(`${BASE}/aplicar`, {
      lote,
      ...(maximo === undefined ? {} : { maximo }),
    });
  },

  /**
   * Los lotes con trabajo abierto, para poder retomar.
   *
   * Un solo `GET /lotes` del back (un `groupBy`), no una derivación desde una
   * página de filas: derivarlo dejaba invisibles los lotes que no cabían en
   * las primeras 200 filas — con una carga real de 600 propietarios, la
   * tarjeta de «tenés una carga sin terminar» no aparecía y la persona
   * resubía el archivo, duplicando a todo el mundo.
   */
  async lotesAbiertos(): Promise<LoteDeTerceros[]> {
    return apiClient.get<LoteDeTerceros[]>(`${BASE}/lotes`);
  },
};
