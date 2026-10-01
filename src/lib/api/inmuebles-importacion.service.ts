/**
 * inmuebles-importacion.service.ts — the durable bulk-import backend
 * (WU-4, contract.md §3.8, wu-4-report.md §6).
 *
 * Mirrors `contractsApi.migracion` (`contracts.service.ts`) shape and
 * conventions on purpose — same three-phase flow (`preparar -> resolver ->
 * activar`), same server-issued batch id, same idempotency and polling
 * pattern. `StepConfirmImport.tsx` used to fan out client-side to
 * `POST /properties`, one call per row (`EN_PARALELO = 6`) — closing the
 * tab mid-import lost the whole batch. This service replaces that with the
 * durable staged flow.
 *
 * ⚠ There is NO codegen on this boundary (C4/C18) — every type below is a
 * hand-written mirror of a `back` DTO, and its ONLY specification is
 * `contract-addendum-3.md` §3 (T-0038, FROZEN). The previous version of this
 * file guessed the names from `toCreatePayload.ts` and got three of them
 * wrong, so every `preparar()` call returned 400 for six work units while
 * both repos stayed green — each side was mocking the other.
 *
 * Two rules that follow from that, and are not optional:
 *
 * 1. **The wire is UPPER_SNAKE** for `type` and `listingType` (§3.4, R-3),
 *    translated here at the api-service boundary exactly as
 *    `properties.service.ts:120-129` already does for `POST /properties`.
 *    The front's domain layer keeps its lowercase vocabulary.
 * 2. **A mocked-client test is not evidence** that this mirror is right
 *    (§7.2). The standing gate is `back`'s `importacion-contrato-wire.spec.ts`,
 *    which runs the real `ValidationPipe` against the literal payload this
 *    file's callers build. Change a name here, run that.
 */

import { apiClient } from './client';
import { anunciarProceso } from './procesos.service';

// ============================================================================
// Types — contract.md §3.8, wu-4-report.md §6
// ============================================================================

export type EstadoLoteImportacion = 'ENCOLADO' | 'PROCESANDO' | 'LISTO' | 'FALLIDO';
export type EstadoFilaImportacion = 'PENDIENTE' | 'LISTO' | 'ACTIVADO' | 'DESCARTADO';

/**
 * The full vocabulary a row can report as missing (wu-4-report.md §6). An
 * UNKNOWN string (a back build ahead of this front) must render as a
 * generic "falta un dato", never be dropped — see `FALTANTE_LABELS` in
 * `ImportacionFaltantes.tsx`.
 */
export type Faltante =
  | 'titulo'
  | 'direccion'
  | 'ciudad'
  | 'barrio'
  | 'tipo'
  | 'area'
  | 'canon'
  | 'precio_venta'
  | 'precio_inconsistente'
  | 'tipo_de_negocio'
  | 'departamento'
  | 'fecha_consignacion'
  | 'posible_duplicado'
  /** Varios dueños y los porcentajes (o la plata) no cuadran. */
  | 'reparto';

/**
 * Un dueño de `propietarios[]`. Espejo de `PropietarioDelInmuebleDto` del
 * back: **sólo estas claves** — con `forbidNonWhitelisted` una de más es un
 * 400 del lote entero.
 */
export interface PropietarioDelInmuebleDto {
  documento?: string;
  nombre?: string;
  telefono?: string;
  correo?: string;
  /** Su parte en puntos básicos (10.000 = 100 %). */
  participacionBps?: number;
  /** Su parte del canon en pesos, si el archivo la trae repartida. */
  canon?: number;
}

export interface InmuebleDuplicado {
  id: string;
  code: number;
  title: string;
  address: string;
  city: string;
}

/**
 * Ingestion DTO — `POST .../preparar`. Mirror of `back`'s
 * `ImportarInmuebleDto` (contract-addendum-3.md §3.1.1).
 *
 * Every field is optional (C13: origin governs validation; completeness is
 * enforced at activation, not here). The back declares 23 fields; the ones
 * it accepts that no import source can produce (`description`, `deposit`,
 * `floor`, `parkingSpaces`, `yearBuilt`, `amenities`) are
 * deliberately absent — `ImportProperty` has no column for any of them, and
 * an unused field on a hand-mirrored boundary is surface without a consumer.
 *
 * `externalId` y `stratum` SÍ están: el archivo real de la inmobiliaria
 * (Propiedades.csv) trae «Código» y «Estrato» en todas sus filas.
 *
 * A key NOT on the back's DTO is a 400 on the whole request
 * (`forbidNonWhitelisted: true`). There is no forgiving mode.
 */
export interface ImportarInmuebleDto {
  /**
   * Su id en el sistema del que se migra («Código» en el archivo real). El
   * back lo guarda en `Property.externalId` y es la llave con la que los
   * contratos migrados nombran al inmueble.
   */
  externalId?: string;
  title?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  department?: string;
  /**
   * §3.1.1 #3 — the wire name is `type`, NOT `propertyType`, and the value is
   * UPPER_SNAKE (`APARTMENT`). Free text on the back on purpose: an
   * unrecognised value becomes `faltantes: ['tipo']` with the original string
   * intact, never a coerced `APARTMENT` (C19). So an unmappable value must
   * reach the back RAW — see `toImportarInmuebleDto`'s `?? p.propertyType`.
   */
  type?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  /** §3.4 — `'RENT' | 'SALE'` on the wire. Absent degrades to RENT server-side. */
  listingType?: string;
  /** §3.1.2 — never `0`: a `0` is read as an empty cell, not as a price (C6). */
  monthlyRent?: number;
  salePrice?: number;
  adminFee?: number;
  consignedAt?: string;
  /** 1 a 6. El archivo lo trae en palabras y el front lo lee antes de mandarlo. */
  stratum?: number;
  /**
   * Front-computed (LocationIQ, `geocodeImportRow.ts`) — the durable backend
   * does not geocode, so without these every imported property lands on the
   * city centre. Sent whenever geocoding returned a pin at all, INCLUDING the
   * city-centre fallback: nothing resolves a missing coordinate at render
   * time, so narrowing this would leave those rows with no pin whatsoever
   * (§3.6). Out of range is not a 400 and not a `faltante` — the back
   * degrades it to NULL.
   */
  latitude?: number;
  longitude?: number;
  /**
   * El propietario, cuando el archivo lo trae. El back lo resuelve contra
   * las fichas de la agencia al ACTIVAR (por documento, o por nombre exacto)
   * y consigna el inmueble solo: no vuelve a preguntar «¿de quién es?».
   * Nunca es un `faltante`.
   */
  propietarioDocumento?: string;
  propietarioNombre?: string;
  /**
   * El teléfono del propietario tal como venga («Teléfonos Propietario»). Texto
   * libre y sin tope: el archivo real trae dos números y un parentesco en la
   * misma celda. El back lo escribe al CREAR la ficha, y en una que ya existe
   * sólo si no tenía teléfono — un archivo viejo no pisa lo corregido a mano.
   */
  propietarioTelefono?: string;
  /**
   * TODOS los dueños cuando son dos o más, en el orden del archivo, con su %
   * o su plata (Nico, 2026-09-13). Con uno solo no viaja. El back los escribe
   * en el mandato en la misma transacción que lo crea; si los porcentajes no
   * suman 100 la fila queda pendiente con `reparto`.
   */
  propietarios?: PropietarioDelInmuebleDto[];
  /**
   * El estado del inmueble en el sistema anterior («Activa», «Arrendada»,
   * «Inactiva»), CRUDO. El back lo traduce a `PropertyStatus` y lo que no
   * reconoce deja el inmueble como nacía antes: en borrador, sin publicar.
   */
  estadoOrigen?: string;
  /** «Urbanización»: el conjunto. El back lo guarda dentro de `description`. */
  urbanizacion?: string;
  /** «Llaves en»: dónde están las llaves. Mismo destino que `urbanizacion`. */
  llavesEn?: string;
  /**
   * «Creada Por»: quién cargó el inmueble en el sistema anterior. El back NO
   * lo copia a `properties` —es un empleado de la otra empresa— pero sí lo
   * guarda en el registro de lo que vino tal cual.
   */
  creadaPor?: string;
  /** % de comisión (administración en arriendo, venta en venta). */
  comisionPorcentaje?: number;
}

export interface FilaDeImportacion {
  id: string;
  lote: string;
  fila: number;
  estado: EstadoFilaImportacion;
  faltantes: string[];
  /**
   * T-0129 — `['canon']` cuando el inmueble se va a crear con el canon por
   * confirmar. NO frena la fila: es un dato por completar, no un faltante.
   */
  datosPendientes?: string[];
  overrides: string[];
  candidatos: InmuebleDuplicado[];
  propertyId: string | null;
  datos: ImportarInmuebleDto;
}

export interface EstadoDeLoteInmuebles {
  lote: string;
  estado: EstadoLoteImportacion;
  total: number;
  procesadas: number;
  pendientes: number;
  listos: number;
  activados: number;
  descartados: number;
  jobId: string | null;
  error: string | null;
  creadoEn: string;
}

export interface PaginaDeFilasInmuebles {
  filas: FilaDeImportacion[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface ResumenLoteInmuebles {
  /**
   * §3.9 — `null` when the caller passed no `lote` filter. Our own client
   * always sends one, so it is unreachable in practice, but a mirror narrower
   * than the wire is exactly the drift class that produced F-1.
   */
  lote: string | null;
  total: number;
  pendientes: number;
  listos: number;
  activados: number;
  descartados: number;
}

export interface DescarteDeLoteInmuebles {
  lote: string;
  descartadas: number;
  activadas: number;
  yaDescartadas: number;
}

export interface FilaOmitida {
  id: string;
  fila: number;
  faltantes: string[];
}

/** `POST .../activar` — call again while `restantes > 0` (500 rows per
 * call, resumable, nothing repeats, wu-4-report.md §6). */
export interface ResumenRevisionInmuebles {
  lote: string;
  /** Filas miradas en ESTA llamada (el presupuesto de tiempo la acota). */
  revisadas: number;
  /** De ésas, cuántas dejaron de tener faltantes y pasaron a LISTO. */
  liberadas: number;
  /** Cuántas siguen pendientes en el lote — para la pantalla, no para el bucle. */
  restantes: number;
  /**
   * Cursor: la última fila mirada; se manda como `desdeFila` en la siguiente
   * llamada. `null` = esta llamada no miró ninguna.
   */
  ultimaFila: number | null;
  /**
   * No queda nada pendiente después de `ultimaFila`: la vuelta terminó. Es
   * ESTO lo que corta el bucle, no `restantes > 0` (ver `revisarLoteCompleto`).
   */
  terminado: boolean;
}

export interface ResumenActivacionInmuebles {
  lote: string;
  activados: number;
  /**
   * Filas que ya tenían su `Property` (mismo «Código») y se re-apuntaron en
   * vez de duplicarlo. Cuentan como AVANCE: una llamada que sólo reusa sí
   * movió el lote, y sin este número el loop la leería como estancada.
   */
  reusados?: number;
  omitidas: FilaOmitida[];
  restantes: number;
  /** Mandatos creados en esta llamada que quedaron con varios dueños y su reparto. */
  mandatosConVariosDuenos?: number;
}

/**
 * Row-correction DTO — `PATCH .../filas/:id` and, with `ids`, `PATCH .../filas`.
 * Mirror of `back`'s `ResolverInmuebleDto` (contract-addendum-3.md §3.2).
 *
 * ⚠ **This is NOT `ImportarInmuebleDto` with looser rules.** Its vocabulary is
 * narrower and its validation is deliberately STRICTER: one person is fixing
 * one row on screen, so a 400 reaches the person who caused it, about the row
 * they are looking at. `bedrooms`, `bathrooms`, `adminFee`, `amenities`,
 * `latitude`, `longitude` and the other ingestion-only fields are NOT on this
 * DTO — sending any of them is a 400. This mirror used to declare three of
 * them; the UI never sent them, so they were latent landmines rather than a
 * live bug. They stay out.
 *
 * `null` on `monthlyRent`/`salePrice` CLEARS the value, and clearing is the
 * only exit from `precio_inconsistente` on a row whose file carried both
 * prices. An omitted key leaves the stored value alone. **`0` does not clear
 * — it is a 400 here (`@Min(1)`, C6).**
 */
export interface ResolverInmuebleDto {
  title?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  department?: string;
  /** §3.2 #3 — `type`, UPPER_SNAKE, same as the ingestion DTO. */
  type?: string;
  area?: number;
  /** §3.4 — `'RENT' | 'SALE'` on the wire. */
  listingType?: string;
  monthlyRent?: number | null;
  salePrice?: number | null;
  /** §3.2 #12 — `YYYY-MM-DD`. A malformed date is a 400 here, unlike ingestion. */
  consignedAt?: string;
  /** The only exit for `posible_duplicado` — an action, not a form field. */
  permitirDuplicado?: boolean;
}

/** Los campos que se pueden poner en bloque (`PATCH filas/masivo`). */
export interface CamposMasivosInmuebles {
  title?: string;
  description?: string;
  type?: string;
  listingType?: string;
  city?: string;
  department?: string;
  neighborhood?: string;
  area?: number;
  consignedAt?: string;
  monthlyRent?: number;
  salePrice?: number;
}

/** A quién le toca: las filas de este estado, con este motivo. */
export interface FiltroDeFilasInmuebles {
  estado?: 'PENDIENTE' | 'LISTO';
  /** Un código de `faltantes` o `'canon'` (las que no traen canon usable). */
  motivo?: string;
}

export interface CambiosMasivosInmuebles {
  campos?: CamposMasivosInmuebles;
  permitirDuplicado?: boolean;
  descartar?: boolean;
  /** `false` rellena sólo lo vacío; `true` pisa también lo que ya tenía valor. */
  sobrescribir?: boolean;
}

export interface RespuestaMasivaPorFiltroInmuebles {
  lote: string;
  totalCoincidentes: number;
  procesadas: number;
  aplicadas: number;
  sinCambios: number;
  listasAhora: number;
  siguiente: string | null;
  fallidas: { id: string; fila: number | null; motivo: string }[];
}

export interface ResultadoMasivoPorFiltroInmuebles {
  totalAlEmpezar: number;
  procesadas: number;
  aplicadas: number;
  sinCambios: number;
  listasAhora: number;
  fallidas: { id: string; fila: number | null; motivo: string }[];
  /** Se cortó antes de terminar: lo ya aplicado quedó aplicado. */
  interrumpida?: { motivo: string };
}

export interface MotivosDelLoteInmuebles {
  lote: string;
  requierenAtencion: number;
  listas: number;
  /** Filas que se van a crear con el canon por confirmar. */
  sinCanon: number;
  /** `codigo: 'canon'` trae `bloquea: false`. */
  porMotivo: { codigo: string; filas: number; bloquea: boolean }[];
}

export interface ProgresoDeMasivoInmuebles {
  procesadas: number;
  total: number;
}

export interface ResultadoMasivoInmuebles {
  total: number;
  resueltas: number;
  fallidas: number;
  resultados: Array<{ id: string; ok: boolean; motivo?: string }>;
}

const BASE = '/inmobiliaria/inmuebles/importar';
/** Capped at 200 by the back (wu-4-report.md §6). */
export const POR_PAGINA_MAX = 200;

export const inmueblesImportacionApi = {
  /**
   * 1. Stages every row. NO property is created here — `202`, enqueues a
   * BullMQ job. The `lote` in the response is ALWAYS server-issued; the
   * client never invents one (contract.md §3.8).
   */
  async preparar(
    inmuebles: ImportarInmuebleDto[],
    idempotencyKey?: string,
  ): Promise<EstadoDeLoteInmuebles> {
    // La carga aparece en el centro de procesos del header (22-09).
    anunciarProceso();
    return apiClient.post<EstadoDeLoteInmuebles>(`${BASE}/preparar`, {
      inmuebles,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
  },

  /** The "you have an unfinished import" resume card — batches not yet
   * fully activated/discarded. */
  async lotesAbiertos(): Promise<EstadoDeLoteInmuebles[]> {
    return apiClient.get<EstadoDeLoteInmuebles[]>(`${BASE}/lotes`);
  },

  /** Polled while `estado ∈ {ENCOLADO, PROCESANDO}` — a convenience while
   * the tab stays open, never the completion mechanism (that is the
   * `PROPERTY_IMPORT_COMPLETED` notification). */
  async estadoDeLote(lote: string): Promise<EstadoDeLoteInmuebles> {
    return apiClient.get<EstadoDeLoteInmuebles>(`${BASE}/lotes/${encodeURIComponent(lote)}`);
  },

  async filas(
    lote: string,
    opciones?: { pagina?: number; porPagina?: number; estado?: EstadoFilaImportacion },
  ): Promise<PaginaDeFilasInmuebles> {
    const q = new URLSearchParams({ lote });
    if (opciones?.pagina) q.set('pagina', String(opciones.pagina));
    if (opciones?.porPagina) q.set('porPagina', String(opciones.porPagina));
    if (opciones?.estado) q.set('estado', opciones.estado);
    return apiClient.get<PaginaDeFilasInmuebles>(`${BASE}/filas?${q.toString()}`);
  },

  async resumen(lote: string): Promise<ResumenLoteInmuebles> {
    return apiClient.get<ResumenLoteInmuebles>(`${BASE}/resumen?lote=${encodeURIComponent(lote)}`);
  },

  /** Corrects one row. `409 { code: 'FILA_YA_ACTIVADA' }` on an already
   * activated row. */
  async resolver(id: string, cambios: ResolverInmuebleDto): Promise<FilaDeImportacion> {
    return apiClient.patch<FilaDeImportacion>(`${BASE}/filas/${id}`, cambios);
  },

  /** Applies the same fix to many rows at once — per-row outcomes, never
   * render "listo" over the failures. */
  async resolverMasivo(ids: string[], cambios: ResolverInmuebleDto): Promise<ResultadoMasivoInmuebles> {
    return apiClient.patch<ResultadoMasivoInmuebles>(`${BASE}/filas`, { ids, ...cambios });
  },

  /**
   * T-0129 — lo mismo que `resolverMasivo`, pero a TODAS las filas que cumplen un
   * filtro, sin listar ids (`PATCH filas/masivo`). `GET filas` topa en 200 por
   * página, así que «seleccionar las N» no puede ser «los ids que se ven».
   *
   * Da vueltas mientras `siguiente` no sea `null`; si una falla a mitad devuelve
   * lo acumulado con `interrumpida`. Un error de la PRIMERA vuelta se relanza.
   */
  async resolverPorFiltro(
    lote: string,
    filtro: FiltroDeFilasInmuebles,
    cambios: CambiosMasivosInmuebles,
    alAvanzar?: (p: ProgresoDeMasivoInmuebles) => void,
  ): Promise<ResultadoMasivoPorFiltroInmuebles> {
    const base: Record<string, unknown> = { lote, filtro };
    if (cambios.campos) base.campos = cambios.campos;
    if (cambios.permitirDuplicado !== undefined) base.permitirDuplicado = cambios.permitirDuplicado;
    if (cambios.descartar !== undefined) base.descartar = cambios.descartar;
    if (cambios.sobrescribir !== undefined) base.sobrescribir = cambios.sobrescribir;

    const total: ResultadoMasivoPorFiltroInmuebles = {
      totalAlEmpezar: 0,
      procesadas: 0,
      aplicadas: 0,
      sinCambios: 0,
      listasAhora: 0,
      fallidas: [],
    };
    let cursor: string | null = null;
    const vistos = new Set<string>();

    for (;;) {
      let r: RespuestaMasivaPorFiltroInmuebles;
      try {
        r = await apiClient.patch<RespuestaMasivaPorFiltroInmuebles>(
          `${BASE}/filas/masivo`,
          cursor ? { ...base, despuesDe: cursor } : base,
        );
      } catch (e) {
        if (total.procesadas === 0) throw e;
        total.interrumpida = {
          motivo: e instanceof Error ? e.message : 'Se cortó la conexión a mitad.',
        };
        return total;
      }
      if (cursor === null) total.totalAlEmpezar = r.totalCoincidentes;
      total.procesadas += r.procesadas;
      total.aplicadas += r.aplicadas;
      total.sinCambios += r.sinCambios ?? 0;
      total.listasAhora += r.listasAhora;
      total.fallidas.push(...r.fallidas);
      alAvanzar?.({ procesadas: total.procesadas, total: total.totalAlEmpezar });

      if (r.siguiente === null || vistos.has(r.siguiente)) return total;
      vistos.add(r.siguiente);
      cursor = r.siguiente;
    }
  },

  /** Cuántas filas hay por motivo, del lote entero (no de la página). */
  async motivos(lote: string): Promise<MotivosDelLoteInmuebles> {
    return apiClient.get<MotivosDelLoteInmuebles>(
      `${BASE}/filas/motivos?lote=${encodeURIComponent(lote)}`,
    );
  },

  async descartarFila(id: string): Promise<FilaDeImportacion> {
    return apiClient.delete<FilaDeImportacion>(`${BASE}/filas/${id}`);
  },

  /** Batch discard — `409 { code: 'LOTE_EN_PROCESO' }` while the job runs
   * (show "esperá a que termine", never retry silently); `404` on an
   * unknown lote. */
  async descartarLote(lote: string): Promise<DescarteDeLoteInmuebles> {
    return apiClient.delete<DescarteDeLoteInmuebles>(`${BASE}/lotes/${encodeURIComponent(lote)}`);
  },

  /** 3. Converts LISTO rows into real properties — 500 per call. Call again
   * while `restantes > 0`; resumable, nothing repeats. */
  async activar(lote: string): Promise<ResumenActivacionInmuebles> {
    return apiClient.post<ResumenActivacionInmuebles>(`${BASE}/activar`, { lote });
  },

  /**
   * Volver a revisar lo pendiente con las reglas de HOY.
   *
   * `faltantes` se calcula al preparar y se GUARDA: cuando una regla cambia,
   * las filas viejas siguen frenadas por un motivo que ya no existe, y la
   * única salida era resubir el archivo — 53 minutos de geocodificación para
   * 2.864 inmuebles. Reanudable: se llama mientras `restantes > 0`.
   */
  async revisarDeNuevo(lote: string, desdeFila = 0): Promise<ResumenRevisionInmuebles> {
    return apiClient.post<ResumenRevisionInmuebles>(`${BASE}/revisar`, { lote, desdeFila });
  },
};
