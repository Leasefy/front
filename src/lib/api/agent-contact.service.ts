/**
 * Agent Contact-Ledger API service — CONTRACT ONLY (Ley 2300/2023 gate)
 *
 * ── The legal crux ──────────────────────────────────────────────────────────
 * This module is the frontend's ONLY interface to the Colombian contact cap
 * (Ley 2300/2023 art. 3: máximo 1 contacto por día y 1 canal por semana). That
 * cap is enforced ONCE, CENTRALLY, in the `Leasefy/agent` contact-ledger — the
 * ledger OWNED by `AGENT_SERVICE_URL` (the microservice). The browser never
 * hits `AGENT_SERVICE_URL` directly: the literal fetch below goes through
 * `apiClient` (→ `NEXT_PUBLIC_BACKEND_URL`, the BFF), which FORWARDS
 * `canContact` to the agent — exactly the convention `agent-credits.service.ts`
 * uses. The agent is the single ledger owner; the BFF is only a pass-through.
 *
 * ── What this module can and cannot do ──────────────────────────────────────
 * It can ONLY ASK whether the agent may contact a tenant on a channel. It has
 * intentionally NO outbound method of any kind: the frontend NEVER dispatches a
 * proactive contact and NEVER counts against the cap. The only real, compliant
 * outbound in this app stays the in-app portal message (a thread the tenant
 * reads inside the portal), which lives in `messages.service.ts` — NOT here.
 *
 * Do NOT ever add an outbound-dispatch method to this file (no third-party
 * messaging SDK, no proactive channel fan-out). Doing so would move the
 * statutory cap out of the single central ledger and create a direct Ley 2300
 * risk (PITFALLS 3 — portal double-counting the contact cap).
 *
 * ── Default-gated today ──────────────────────────────────────────────────────
 * No HTTP contact endpoint is exposed yet, so every call DEFAULT-GATES: on
 * 404/403/0 (`isEndpointUnavailable`) it resolves `{ allowed: false, reason:
 * 'unavailable' }`. The UI therefore keeps the proactive affordance DISABLED
 * ("Próximamente", DESIGN.md §11) — never a fabricated "allowed".
 */

import { apiClient, ApiError } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Channels the agent may (eventually) be allowed to contact a tenant on. */
export type ContactChannel = 'whatsapp' | 'email' | 'push';

/**
 * Result of asking the agent's contact-ledger whether a proactive contact is
 * permitted right now:
 * - `unavailable` → the gate is not exposed over HTTP yet (404/403/0)
 * - `gated`       → the agent's ledger declined (cap reached / policy)
 * - `ok`          → the agent permits it (the frontend still never dispatches)
 */
export interface CanContactResult {
  allowed: boolean;
  reason: 'unavailable' | 'gated' | 'ok';
}

// ---------------------------------------------------------------------------
// Endpoint-not-live detection
// ---------------------------------------------------------------------------

/**
 * True when the failure means "endpoint not live yet" rather than a genuine
 * error: 404 (route absent), 403 (not wired for this tenant), or 0 (backend
 * unreachable / offline — `ApiError(0)` from the api-client). These degrade the
 * proactive affordance to a DISABLED "Próximamente" state, never a crash.
 */
function isEndpointUnavailable(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status === 404 || err.status === 403 || err.status === 0)
  );
}

// ---------------------------------------------------------------------------
// agentContactApi — the contract (ask-only, never dispatch)
// ---------------------------------------------------------------------------

export const agentContactApi = {
  /**
   * Asks the agent's contact-ledger whether it may proactively contact the
   * tenant on `channel` (optionally scoped to a lease). Returns
   * `{ allowed, reason }`.
   *
   * The frontend uses this ONLY to decide whether a proactive affordance is
   * enabled — it NEVER performs the outbound itself, and the agent (not the
   * portal) counts any permitted contact against the Ley 2300 cap.
   *
   * Until the gate is exposed over HTTP, 404/403/0 → `{ allowed: false, reason:
   * 'unavailable' }`, so the affordance stays disabled ("Próximamente").
   */
  async canContact(
    channel: ContactChannel,
    leaseId?: string,
  ): Promise<CanContactResult> {
    try {
      return await apiClient.get<CanContactResult>(
        `/agent/contact/can-contact?channel=${channel}${leaseId ? `&leaseId=${leaseId}` : ''}`,
      );
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        return { allowed: false, reason: 'unavailable' };
      }
      throw err;
    }
  },
};
