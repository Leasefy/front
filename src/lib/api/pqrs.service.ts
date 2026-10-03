/**
 * PQRS / Solicitudes API service — tolerant, frontend-first CONTRACT (v7-06).
 *
 * 03-10-2026: `GET /pqrs/mine` ya existe en el back y responde
 * `{ solicitudes, sePuedeRadicar, contratosParaRadicar }` (ver
 * `listMineConDisponibilidad`). Desde ARREGLOS-2 (03-10-2026, Nico Q4 a) también
 * existe `POST /pqrs`: el inquilino radica sobre su contrato vigente. La
 * aprobación de la cotización sigue sin existir.
 *
 * Modeled 1:1 on the shipped honest-degrade idiom (`lease-documents.service.ts`,
 * `tenant-payment-requests.service.ts`). The NestJS/agent PQRS routes
 * (`POST /pqrs`, `GET /pqrs/mine`, `POST /pqrs/:id/aprobar-cotizacion`) are a
 * DISCLOSED external dependency (M1) and are NOT live today — so `[]` /
 * `PqrsUnavailableError` is the EXPECTED result now, keeping the UI honest
 * ("Próximamente", DESIGN.md §11). The exact paths are provisional (Assumptions
 * A1/A4) and are a one-line change when the backend lands.
 *
 * Guarantees:
 *  - `listMine` degrades to `[]` on not-live (404/403/0) — NEVER a fabricated row.
 *  - `getMine(id)` resolves from `listMine()` (own-only, JWT-scoped) — no raw
 *    fetch-by-id, so a tenant cannot probe a foreign id (anti-IDOR).
 *  - `create` / `approveCotizacion` throw `PqrsUnavailableError` on not-live —
 *    NEVER a fabricated radicado and NEVER a fake "aprobado".
 *  - `solicitanteTipo` is set server-side from the JWT (assigned `'inquilino'`);
 *    the client never claims it, so it is absent from `NuevaSolicitudInput`.
 */

import { apiClient, ApiError } from './client';
import type { SolicitudPqrs, PqrsTipo } from './pqrs.types';

// ---------------------------------------------------------------------------
// Endpoint-not-live detection (copied verbatim from lease-documents.service.ts)
// ---------------------------------------------------------------------------

/**
 * True when the failure means "endpoint not live yet" rather than a genuine error:
 * 404 (route absent), 403 (not wired for this tenant), or 0 (backend unreachable /
 * offline — `ApiError(0)` from the api-client). These degrade the UI to the honest
 * "Próximamente" posture instead of a crash. Any other status is rethrown.
 */
function isEndpointUnavailable(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status === 404 || err.status === 403 || err.status === 0)
  );
}

/**
 * Thrown by `create` / `approveCotizacion` when the backend endpoint is not live.
 * Callers catch this to keep the UI on "Próximamente" — never to invent a radicado
 * or a fake approval.
 */
export class PqrsUnavailableError extends Error {
  constructor() {
    super('pqrs_unavailable');
    this.name = 'PqrsUnavailableError';
  }
}

// ---------------------------------------------------------------------------
// Create input — the JSON body of POST /pqrs
// ---------------------------------------------------------------------------

/**
 * Client-supplied fields for a new tenant request. Photo bytes are NOT part of this
 * JSON body — they upload separately (v7-06-03). `solicitanteTipo` is intentionally
 * absent: the server assigns `'inquilino'` from the JWT, the client never claims it.
 */
export interface NuevaSolicitudInput {
  tipo: PqrsTipo;
  asunto: string;
  descripcion: string;
  contratoId?: string;
  propiedadId?: string;
}

// ---------------------------------------------------------------------------
// pqrsApi — the tolerant contract
// ---------------------------------------------------------------------------

/**
 * GET /pqrs/mine — own-scoped list. Degrades to `[]` on not-live (404/403/0),
 * an honest empty history; NEVER a fabricated row. Any other error is rethrown.
 */
async function listMine(): Promise<SolicitudPqrs[]> {
  return (await listMineConDisponibilidad()).items;
}

/**
 * Lo mismo que `listMine`, pero diciendo si la ruta EXISTE.
 *
 * 🔴 QA 22-09: el inquilino llenaba la solicitud entera —asunto, descripción,
 * fotos— y sólo al enviar se enteraba de que «estamos habilitando las
 * solicitudes». `listMine` degrada a `[]` y con eso la pantalla no podía
 * distinguir «no has radicado nada» de «todavía no se puede radicar». Con
 * `disponible: false` el botón se apaga ANTES de que la persona escriba.
 */
async function listMineConDisponibilidad(): Promise<MisSolicitudes> {
  try {
    return leerMisSolicitudes(
      await apiClient.get<SolicitudPqrs[] | RespuestaDeMisSolicitudes>('/pqrs/mine'),
    );
  } catch (err) {
    if (isEndpointUnavailable(err)) return { items: [], disponible: false, contratos: [] };
    throw err;
  }
}

/** Un contrato vigente del inquilino sobre el que puede radicar. */
export interface ContratoParaRadicar {
  contratoId: string;
  /** Cómo se llama el inmueble (para elegir si hay más de uno). */
  inmueble: string;
}

export interface MisSolicitudes {
  items: SolicitudPqrs[];
  /** ¿Se puede radicar desde el portal? */
  disponible: boolean;
  /** Sus contratos vigentes (con más de uno, el portal pregunta sobre cuál). */
  contratos: ContratoParaRadicar[];
}

/**
 * Lo que responde el back (`GET /pqrs/mine`): las solicitudes PROPIAS del
 * inquilino, si puede radicar desde el portal (tiene un contrato vigente con su
 * inmobiliaria) y sobre qué contratos. Sin eso, «Nueva solicitud» queda apagada
 * ANTES de que la persona escriba (QA 22-09). Un back anterior no manda
 * `contratosParaRadicar`: lista vacía (el back elige si hay uno solo).
 */
interface RespuestaDeMisSolicitudes {
  solicitudes: SolicitudPqrs[];
  sePuedeRadicar: boolean;
  contratosParaRadicar?: ContratoParaRadicar[];
}

/**
 * La forma del back o, si algún día responde la lista a secas (el contrato
 * provisional de v7-06), la lista con «se puede radicar». Cualquier otra cosa no
 * se toma por una lista: nada inventado.
 */
function leerMisSolicitudes(
  respuesta: SolicitudPqrs[] | RespuestaDeMisSolicitudes | null | undefined,
): MisSolicitudes {
  if (Array.isArray(respuesta)) return { items: respuesta, disponible: true, contratos: [] };
  if (respuesta && Array.isArray(respuesta.solicitudes)) {
    const contratos = Array.isArray(respuesta.contratosParaRadicar)
      ? respuesta.contratosParaRadicar.filter(
          (c): c is ContratoParaRadicar =>
            !!c && typeof c.contratoId === 'string' && typeof c.inmueble === 'string',
        )
      : [];
    return {
      items: respuesta.solicitudes,
      disponible: respuesta.sePuedeRadicar === true,
      contratos,
    };
  }
  return { items: [], disponible: false, contratos: [] };
}

/**
 * Resolves a single own request by filtering the `/pqrs/mine` list (own-only,
 * JWT-scoped) and returns the match or `null`. It deliberately does NOT issue a
 * raw fetch-by-id from a route param, so a tenant cannot probe a foreign id
 * (anti-IDOR, PITFALLS 4).
 */
async function getMine(id: string): Promise<SolicitudPqrs | null> {
  const all = await listMine();
  return all.find((s) => s.id === id) ?? null;
}

/**
 * POST /pqrs — creates a new tenant request and returns the server-assigned
 * `SolicitudPqrs` (with its backend-computed `radicado`). On not-live (404/403/0)
 * throws `PqrsUnavailableError` so the UI stays on "Próximamente" and never
 * fabricates a radicado. Any other error is rethrown.
 */
async function create(input: NuevaSolicitudInput): Promise<SolicitudPqrs> {
  try {
    return await apiClient.post<SolicitudPqrs>('/pqrs', input);
  } catch (err) {
    if (isEndpointUnavailable(err)) throw new PqrsUnavailableError();
    throw err;
  }
}

/**
 * POST /pqrs/:id/aprobar-cotizacion — the tenant APPROVES a quote (SOLI-04) and
 * receives the updated `SolicitudPqrs`. The tenant only approves: it never assigns
 * a provider, fixes the cost, or self-closes the request. On not-live (404/403/0)
 * throws `PqrsUnavailableError` so no fake "aprobado" is shown. Rethrows any other
 * error. Path is provisional (Assumption A4).
 */
async function approveCotizacion(id: string): Promise<SolicitudPqrs> {
  try {
    return await apiClient.post<SolicitudPqrs>(
      `/pqrs/${id}/aprobar-cotizacion`,
      {},
    );
  } catch (err) {
    if (isEndpointUnavailable(err)) throw new PqrsUnavailableError();
    throw err;
  }
}

export const pqrsApi = { listMine, listMineConDisponibilidad, getMine, create, approveCotizacion };
