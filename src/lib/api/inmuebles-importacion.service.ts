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
  | 'posible_duplicado';

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
 * enforced at activation, not here). The back declares 23 fields; the seven
 * it accepts that no import source can produce (`description`, `deposit`,
 * `floor`, `parkingSpaces`, `stratum`, `yearBuilt`, `amenities`) are
 * deliberately absent — `ImportProperty` has no column for any of them, and
 * an unused field on a hand-mirrored boundary is surface without a consumer.
 *
 * A key NOT on the back's DTO is a 400 on the whole request
 * (`forbidNonWhitelisted: true`). There is no forgiving mode.
 */
export interface ImportarInmuebleDto {
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
}

export interface FilaDeImportacion {
  id: string;
  lote: string;
  fila: number;
  estado: EstadoFilaImportacion;
  faltantes: string[];
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
export interface ResumenActivacionInmuebles {
  lote: string;
  activados: number;
  omitidas: FilaOmitida[];
  restantes: number;
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
};
