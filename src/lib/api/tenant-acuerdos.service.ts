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
 * only READS/FORWARDS: list own approved plans, resolve one own plan, ask the
 * server for a cuota checkout URL, forward an accept (signature + OTP), and forward
 * an intent-only pre-mora request. The agent decides everything else.
 *
 * ── Default-gated today ──────────────────────────────────────────────────────
 * The tenant-scoped (RLS) routes are provisional (Assumptions A1–A4) and NOT live
 * yet, so `[]` / `null` / `AcuerdoUnavailableError` is the EXPECTED result now — an
 * honest "Próximamente" (DESIGN.md §11), never a fabricated acuerdo, cuota,
 * acceptance, or checkout URL. Each provisional path is a one-line change when the
 * agent lands the route. Any other (non-not-live) error is rethrown.
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
 * Asks the server for the hosted-checkout URL of a cuota (or the plan when no
 * `cuotaNumber` is given). The `paymentUrl` is SERVER-provided — the client never
 * builds a checkout amount. On not-live (404/403/0) returns `null` so the pay
 * affordance stays disabled ("Próximamente"), never a fabricated URL. Any other
 * error is rethrown. Provisional path (A4).
 */
async function getCuotaPaymentUrl(
  planId: string,
  cuotaNumber?: number,
): Promise<string | null> {
  const path =
    typeof cuotaNumber === 'number'
      ? `/cartera/payment-plans/${planId}/installments/${cuotaNumber}/payment-url`
      : `/cartera/payment-plans/${planId}/payment-url`;
  try {
    const res = await apiClient.get<{ paymentUrl: string }>(path);
    return res.paymentUrl;
  } catch (err) {
    if (isEndpointUnavailable(err)) return null;
    throw err;
  }
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
    if (isEndpointUnavailable(err)) throw new AcuerdoUnavailableError();
    throw err;
  }
}

/**
 * POST /cartera/payment-plans/request — PROPOSES a pre-mora plan (intent only,
 * `{ leaseId }`). It feeds the agency approval pipeline; it never sets terms and the
 * agent + agency compute and approve. On not-live (404/403/0) throws
 * `AcuerdoUnavailableError` so no fabricated plan is shown. Any other error is
 * rethrown. Provisional path (A3).
 */
async function requestPremoraPlan(
  body: PremoraPlanRequestInput,
): Promise<{ requestId: string }> {
  try {
    return await apiClient.post<{ requestId: string }>(
      '/cartera/payment-plans/request',
      body,
    );
  } catch (err) {
    if (isEndpointUnavailable(err)) throw new AcuerdoUnavailableError();
    throw err;
  }
}

export const acuerdosApi = {
  listMine,
  getMine,
  getCuotaPaymentUrl,
  accept,
  requestPremoraPlan,
};
