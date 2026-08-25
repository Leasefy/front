/**
 * Autopago (domiciliación tokenizada) API service — CONTRACT ONLY (no backend today)
 *
 * "Autopago" is a **tokenized recurring charge**: on a chosen day each month the
 * backend charges the tenant's rent automatically against a saved payment source.
 * That flow is owned END-TO-END by the backend + Wompi:
 *
 *   1. **Wompi tokenization** creates a payment-source token (PCI scope). The token
 *      is minted and stored on Wompi / the backend — the frontend NEVER fabricates,
 *      persists, or displays a raw token or PAN.
 *   2. A **backend token store** binds that payment source to the lease.
 *   3. A **recurring scheduler** performs the monthly charge and records the result.
 *
 * None of that exists yet (see ROADMAP `v7-04 External deps`: Wompi payment-source
 * support + token store + scheduler are all backend). So this module is the
 * api-client CONTRACT only. It MUST NOT invent an "autopago activado" state, a
 * saved/masked card, or a `nextChargeDate` — every method degrades to an honest
 * "unavailable" posture (`{ enabled: false, available: false }`) so the UI shows a
 * truthful "Próximamente" empty-state (DESIGN.md §11).
 *
 * Modeled 1:1 on the tolerant idiom of `lease-documents.service.ts`: a missing
 * endpoint (403 not wired / 404 route absent / 0 offline) is surfaced as
 * "unavailable", never faked.
 */

import { apiClient, ApiError } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Status of a lease's tokenized autopago.
 *
 * `available` is the honesty gate: `false` means the backend / Wompi tokenization
 * is not live for this tenant, so the UI stays on "Próximamente". `enabled`,
 * `maskedMethod` and `nextChargeDate` are meaningful ONLY when the backend reports
 * `available: true` — they are never fabricated client-side.
 */
export interface AutopagoStatus {
  /** Whether a tokenized autopago is currently active for the lease. */
  enabled: boolean;
  /** Masked payment method (e.g. "**** 4242") — set by the backend only. */
  maskedMethod?: string;
  /** ISO-8601 date of the next scheduled automatic charge — set by the backend only. */
  nextChargeDate?: string;
  /**
   * `false` when the tokenization backend is not live (403/404/offline). The UI
   * degrades to an honest "Próximamente" empty-state instead of a fake activation.
   */
  available: boolean;
}

/**
 * Payload to enable autopago. `paymentSourceToken` is the Wompi payment-source
 * token created on Wompi's tokenization flow — a placeholder here until that flow
 * exists. The frontend never mints this token; it only forwards one the backend
 * expects once the flow is wired.
 */
export interface EnableAutopagoPayload {
  leaseId: string;
  paymentSourceToken?: string;
}

// ---------------------------------------------------------------------------
// Endpoint-not-live detection
// ---------------------------------------------------------------------------

/** Posture returned whenever the tokenization backend is not live yet. */
const UNAVAILABLE: AutopagoStatus = { enabled: false, available: false };

/**
 * True when the failure means "endpoint not live yet" rather than a genuine
 * error: 404 (route absent), 403 (not wired for this tenant), or 0 (backend
 * unreachable / offline — `ApiError(0)` from the api-client). These degrade the
 * UI to the honest "Próximamente" empty-state instead of a crash.
 */
function isEndpointUnavailable(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status === 404 || err.status === 403 || err.status === 0)
  );
}

// ---------------------------------------------------------------------------
// autopagoApi — the contract
// ---------------------------------------------------------------------------

export const autopagoApi = {
  /**
   * Reads the tenant's autopago status for a lease. On a not-live endpoint
   * (403/404/offline) resolves to `{ enabled: false, available: false }` so the UI
   * stays on "Próximamente" — never a fabricated enabled state, card, or charge date.
   */
  async get(leaseId: string): Promise<AutopagoStatus> {
    try {
      return await apiClient.get<AutopagoStatus>(
        `/tenant-payments/autopago/${leaseId}`,
      );
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        return UNAVAILABLE;
      }
      throw err;
    }
  },

  /**
   * Enables tokenized autopago for a lease using a Wompi payment-source token
   * (created on Wompi's tokenization flow — placeholder until that exists). On a
   * not-live endpoint (403/404/offline) resolves to `{ enabled: false,
   * available: false }`; it never fabricates a token or an active autopago.
   */
  async enable(payload: EnableAutopagoPayload): Promise<AutopagoStatus> {
    try {
      return await apiClient.post<AutopagoStatus>(
        '/tenant-payments/autopago',
        payload,
      );
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        return UNAVAILABLE;
      }
      throw err;
    }
  },

  /**
   * Cancels tokenized autopago for a lease. On a not-live endpoint
   * (403/404/offline) resolves to `{ enabled: false, available: false }`.
   */
  async cancel(leaseId: string): Promise<AutopagoStatus> {
    try {
      return await apiClient.delete<AutopagoStatus>(
        `/tenant-payments/autopago/${leaseId}`,
      );
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        return UNAVAILABLE;
      }
      throw err;
    }
  },
};
