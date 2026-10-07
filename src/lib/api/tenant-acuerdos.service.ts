/**
 * Acuerdos de pago — the tenant's ONLY interface to the agent's cartera/payment-plans
 * engine (v7-07, frontend-first CONTRACT).
 *
 * ── Routing (A6, IDOR) ───────────────────────────────────────────────────────
 * Every call routes through `apiClient` (→ `NEXT_PUBLIC_BACKEND_URL`, the BFF),
 * which forwards the tenant's JWT to `Leasefy/agent` — exactly the convention
 * `agent-contact.service.ts` uses. The browser NEVER reaches the agent directly
 * and NEVER builds a per-agency operator route (an agencyId in the path): a tenant
 * has no agency scope, so that route would be an IDOR. This module also never sends
 * agency bearer headers. All of that stays in the agency-side hooks, untouched.
 *
 * ── What this module can and cannot do (A5, T-323 / SIC 001) ─────────────────
 * The policy matrix + `requiresHumanReview()` live ENTIRELY in `Leasefy/agent`.
 * This module NEVER approves, fixes terms, edits a discount, or checks policy. It
 * only READS/FORWARDS: list own plans, resolve one own plan, forward an accept
 * (signature + OTP), and forward an intent-only pre-mora request. The agent decides
 * everything else. «Pagar cuota» no pasa por acá: va por la ruta del servidor
 * `/api/inquilino/acuerdos/wompi-session` (`components/tenant/PagarCuota.tsx`).
 *
 * ── Qué está vivo (02-10-2026, «seguimiento 3» y «seguimiento 4») ───────────
 * El back expone `/cartera/payment-plans/*` con el alcance del inquilino
 * autenticado y se lo pide al micro por S2S (`back/src/acuerdos-de-pago/`):
 *   - `GET /mine` — VIVO. El deudor es el documento del inquilino dentro de cada
 *     inmobiliaria suya (exacto, o por dígitos si ninguno tiene letras); sin
 *     deudor que calce la lista llega vacía (200 `[]`).
 *   - `GET /:planId` — VIVO (lo usa `wompi-session` del lado del servidor).
 *   - `POST /:planId/otp/send|verify` + `POST /:planId/accept` — VIVOS desde
 *     «seguimiento 4»: firma + código de un solo uso (`AcuerdoAcceptPanel`).
 *   - `POST /request` — VIVO desde «seguimiento 4»: la solicitud cae como caso
 *     nuevo en la Bandeja del Piloto de la inmobiliaria, al día o no.
 * «Todavía no» (`AcuerdoUnavailableError` → el «pronto» honesto, DESIGN.md §11)
 * es SÓLO lo que el back dice con su `code`: `ACEPTAR_ACUERDO_NO_DISPONIBLE` /
 * `SOLICITAR_ACUERDO_NO_DISPONIBLE` (un back sin la migración, o uno de antes).
 * Cualquier otro error sube tal cual para que la pantalla diga qué pasó con el
 * traductor: un 404 «no es tuyo», un 409 «te falta el documento», y «conexión»
 * sólo si no hubo respuesta (antes un 404, un 403 o la red caída decían «pronto»).
 */

import { apiClient, ApiError } from './client';
import type {
  AcuerdoDetail,
  AcuerdoAcceptResult,
  AcuerdoAcceptInput,
  PremoraPlanRequestInput,
} from './tenant-acuerdos.types';

// ---------------------------------------------------------------------------
// Endpoint-not-live detection (copied verbatim from pqrs.service.ts)
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
 * Los `code` con que el back dice «todavía no se puede» (un back sin la
 * migración responde 503 con estos; uno de antes de «seguimiento 4», 404).
 */
export const CODIGOS_DE_TODAVIA_NO = [
  'ACEPTAR_ACUERDO_NO_DISPONIBLE',
  'SOLICITAR_ACUERDO_NO_DISPONIBLE',
] as const;

/** ¿El back dijo «todavía no» con su `code`? Nunca se decide por el status solo. */
export function esTodaviaNo(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    typeof err.code === 'string' &&
    (CODIGOS_DE_TODAVIA_NO as readonly string[]).includes(err.code)
  );
}

/**
 * Thrown by `accept` / `requestPremoraPlan` when the backend endpoint is not live.
 * Callers catch this to keep the UI on "Próximamente" — never to invent an
 * acceptance or a fabricated plan.
 */
export class AcuerdoUnavailableError extends Error {
  constructor() {
    super('acuerdo_unavailable');
    this.name = 'AcuerdoUnavailableError';
  }
}

// ---------------------------------------------------------------------------
// ¿Se puede firmar? (03-10-2026)
// ---------------------------------------------------------------------------

/**
 * Qué muestra el detalle del acuerdo en vez de (o además de) firmar:
 *   - `aceptado`     → ya lo aceptó (el estado de verdad, con su fecha);
 *   - `firmar`       → ofrecido Y aprobado por la inmobiliaria: se firma;
 *   - `por-aprobar`  → ofrecido pero la inmobiliaria TODAVÍA no lo aprueba:
 *                      no se firma y no se dice «ya fue aprobado» (Nico,
 *                      03-10-2026; el back y el micro también lo exigen);
 *   - `no-aceptable` → cancelado, roto o completado sin aceptar.
 * Un back anterior que no manda `operatorApprovedAt` cuenta como «por aprobar».
 */
export type EstadoDeLaFirma = 'aceptado' | 'firmar' | 'por-aprobar' | 'no-aceptable';

export function estadoDeLaFirma(
  plan: Pick<AcuerdoDetail, 'status' | 'acceptedAt' | 'operatorApprovedAt'>,
): EstadoDeLaFirma {
  if (plan.acceptedAt) return 'aceptado';
  if (plan.status !== 'offered') return 'no-aceptable';
  return typeof plan.operatorApprovedAt === 'string' && plan.operatorApprovedAt.trim()
    ? 'firmar'
    : 'por-aprobar';
}

// ---------------------------------------------------------------------------
// acuerdosApi — the tolerant contract
// ---------------------------------------------------------------------------

/**
 * GET /cartera/payment-plans/mine — own-scoped list of the caller's agency-APPROVED
 * / active plans. Degrades to `[]` on not-live (404/403/0), an honest empty history;
 * NEVER a fabricated acuerdo. Any other error is rethrown. Provisional path (A1).
 */
async function listMine(): Promise<AcuerdoDetail[]> {
  try {
    return await apiClient.get<AcuerdoDetail[]>('/cartera/payment-plans/mine');
  } catch (err) {
    if (isEndpointUnavailable(err)) return [];
    throw err;
  }
}

/**
 * Resolves a single own plan by filtering the `/mine` list (own-only, JWT-scoped)
 * and returns the match or `null`. It deliberately does NOT issue a raw fetch-by-id
 * from a route param, so a tenant cannot probe a foreign plan (anti-IDOR, PITFALLS 4).
 */
async function getMine(planId: string): Promise<AcuerdoDetail | null> {
  const all = await listMine();
  return all.find((p) => p.planId === planId) ?? null;
}

/**
 * POST /cartera/payment-plans/:planId/accept — forwards the tenant's signature +
 * one-use OTP token. The AGENT performs the offered→active transition and runs
 * `requiresHumanReview()` for off-policy cases; the client never approves and never
 * sets an optimistic status (the returned `status` comes from the agent verbatim).
 * On not-live (404/403/0) throws `AcuerdoUnavailableError` so no fake "aceptado" is
 * shown. Any other error is rethrown. Provisional path (A2).
 */
async function accept(
  planId: string,
  body: AcuerdoAcceptInput,
): Promise<AcuerdoAcceptResult> {
  try {
    return await apiClient.post<AcuerdoAcceptResult>(
      `/cartera/payment-plans/${planId}/accept`,
      body,
    );
  } catch (err) {
    if (esTodaviaNo(err)) throw new AcuerdoUnavailableError();
    throw err;
  }
}

/**
 * POST /cartera/payment-plans/request — PROPOSES a pre-mora plan (intent only,
 * `{ leaseId, nota? }`; la nota viaja sólo si hay texto, sin espacios a los lados). It feeds the agency approval pipeline; it never sets terms and the
 * agent + agency compute and approve. On not-live (404/403/0) throws
 * `AcuerdoUnavailableError` so no fabricated plan is shown. Any other error is
 * rethrown. Provisional path (A3).
 */
async function requestPremoraPlan(
  body: PremoraPlanRequestInput,
): Promise<{ requestId: string; yaExistia?: boolean }> {
  try {
    const nota = body.nota?.trim();
    return await apiClient.post<{ requestId: string; yaExistia?: boolean }>(
      '/cartera/payment-plans/request',
      { leaseId: body.leaseId, ...(nota ? { nota } : {}) },
    );
  } catch (err) {
    if (esTodaviaNo(err)) throw new AcuerdoUnavailableError();
    throw err;
  }
}

export const acuerdosApi = {
  listMine,
  getMine,
  accept,
  requestPremoraPlan,
};
