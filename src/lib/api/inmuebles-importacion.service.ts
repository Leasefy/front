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
 * ⚠ Field-name risk (flagged per the brief, not silently assumed correct):
 * WU-4's report documents the ROUTE contract in full (§6) but not
 * `ImportarInmuebleDto`'s field names verbatim — there is no codegen on
 * this boundary (C4/C18). `ImportarInmuebleDto`/`ResolverInmuebleDto` below
 * mirror `toCreatePayload.ts`'s existing field names (the same ones
 * `POST /properties` already accepts), on the working assumption that the
 * staging DTO reuses the property-creation vocabulary made all-optional
 * (C13). This is the single largest cross-boundary risk in this surface —
 * VERIFY must confirm the real field names against a live `back` response
 * before this is trusted, per contract-addendum-2.md §5's "the DTO
 * declares it is not evidence" standard (T-0033 precedent).
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

/** Ingestion DTO — every field optional (C13: origin governs validation;
 * completeness is enforced at activation, not here). See the file-level
 * note above on field-name risk. */
export interface ImportarInmuebleDto {
  title?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  department?: string;
  propertyType?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  listingType?: 'rent' | 'sale';
  monthlyRent?: number;
  salePrice?: number;
  adminFee?: number;
  consignedAt?: string;
  /**
   * Front-computed (LocationIQ, `geocodeImportRow.ts`) — the durable
   * backend (WU-4) does not geocode. Included here so precise coordinates
   * survive the move off client-side `POST /properties`; omitted when
   * geocoding fell back to city-center (never a fabricated pin).
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
  lote: string;
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

/** `null` on `monthlyRent`/`salePrice` CLEARS the value (that is how a row
 * carrying both prices is fixed); an omitted key leaves it alone. */
export interface ResolverInmuebleDto {
  title?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  department?: string;
  propertyType?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  listingType?: 'rent' | 'sale';
  monthlyRent?: number | null;
  salePrice?: number | null;
  adminFee?: number;
  consignedAt?: string;
  /** The only exit for `posible_duplicado` (wu-4-report.md §6). */
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
