/**
 * Lease Documents API service — CONTRACT ONLY (no backend today)
 *
 * Typed api-client for two tenant lease certificates that are generated and
 * CERTIFIED SERVER-SIDE:
 *
 *   1. **Paz y salvo** — a LEGAL "no outstanding debt" clearance. It is a legal
 *      assertion the backend must certify against the single source of truth
 *      (the ledger). The frontend NEVER renders a "sin deuda" / "paz y salvo"
 *      status of its own.
 *   2. **Certificado de retención en la fuente (3.5%)** — a FISCAL (DIAN)
 *      withholding certificate. The withholding number is computed and certified
 *      SERVER-SIDE; the frontend NEVER computes or displays the 3.5% amount.
 *
 * Neither endpoint exists yet. This module is the contract only, modeled 1:1 on
 * the avalúo async flow (`src/lib/api/avaluo.service.ts` + `src/lib/types/avaluo.ts`):
 *
 *     request-generation  →  { id }                       (POST)
 *     poll status         →  { status, downloadUrl? }     (GET /:id/status)
 *
 * The presigned `downloadUrl` appears ONLY when the backend reports the document
 * ready. Until the backend is live, every method degrades to an "unavailable"
 * posture so the UI can show an honest "Próximamente" empty-state (DESIGN.md §11).
 * We deliberately do NOT fabricate a fake `id` or a fake `downloadUrl` — a missing
 * endpoint (403/404, or offline) is surfaced honestly, never faked.
 */

import { apiClient, ApiError } from './client';

// ---------------------------------------------------------------------------
// Types — modeled on the avalúo async flow (IntakeResponse + AvaluoStatusResponse)
// ---------------------------------------------------------------------------

/** Lifecycle status of a server-generated lease certificate. */
export type LeaseDocStatus = 'pending' | 'processing' | 'ready' | 'unavailable';

/** Response of a request-generation POST — mirrors avalúo `IntakeResponse`. */
export interface LeaseDocRequestResponse {
  /** Server-assigned identifier for the generation request. */
  id: string;
}

/**
 * Response of the status poll — mirrors avalúo `AvaluoStatusResponse`.
 *
 * `downloadUrl` is a presigned URL that the backend sets ONLY when `status` is
 * `'ready'`. It is never fabricated client-side.
 */
export interface LeaseDocStatusResponse {
  status: LeaseDocStatus;
  /** Presigned download URL — present only when the backend reports it ready. */
  downloadUrl?: string;
  /** ISO-8601 expiry of the presigned `downloadUrl`, when present. */
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// Endpoint-not-live detection
// ---------------------------------------------------------------------------

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

/**
 * Thrown by the request-generation methods when the backend endpoint is not
 * live. Callers catch this to keep the UI on "Próximamente" — never to invent a
 * fake request id.
 */
export class LeaseDocumentUnavailableError extends Error {
  constructor(public document: 'paz-y-salvo' | 'cert-retencion') {
    super(`lease_document_unavailable:${document}`);
    this.name = 'LeaseDocumentUnavailableError';
  }
}

// ---------------------------------------------------------------------------
// leaseDocumentsApi — the contract
// ---------------------------------------------------------------------------

export const leaseDocumentsApi = {
  /**
   * Requests server-side generation of the tenant's **paz y salvo** (legal
   * clearance). Returns the request id to poll with `getStatus`.
   *
   * The clearance is certified by the backend against the ledger — the frontend
   * never asserts "sin deuda". On a not-live endpoint (403/404/offline) this
   * rethrows `LeaseDocumentUnavailableError` so the UI stays on "Próximamente";
   * it never fabricates an id.
   */
  async requestPazYSalvo(leaseId: string): Promise<LeaseDocRequestResponse> {
    try {
      return await apiClient.post<LeaseDocRequestResponse>(
        '/lease-documents/paz-y-salvo',
        { leaseId },
      );
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        throw new LeaseDocumentUnavailableError('paz-y-salvo');
      }
      throw err;
    }
  },

  /**
   * Requests server-side generation of the tenant's **certificado de retención
   * en la fuente (3.5%)** for a given fiscal `year`. Returns the request id to
   * poll with `getStatus`.
   *
   * The 3.5% withholding amount is computed and certified SERVER-SIDE (DIAN) —
   * the frontend never computes or displays it. On a not-live endpoint
   * (403/404/offline) this rethrows `LeaseDocumentUnavailableError`; it never
   * fabricates an id.
   */
  async requestCertRetencion(
    leaseId: string,
    year: number,
  ): Promise<LeaseDocRequestResponse> {
    try {
      return await apiClient.post<LeaseDocRequestResponse>(
        '/lease-documents/cert-retencion',
        { leaseId, year },
      );
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        throw new LeaseDocumentUnavailableError('cert-retencion');
      }
      throw err;
    }
  },

  /**
   * Polls the generation status for a request id. Returns
   * `{ status, downloadUrl? }` — the presigned `downloadUrl` is set by the
   * backend only when `status === 'ready'`.
   *
   * On a not-live endpoint (403/404/offline) this resolves to
   * `{ status: 'unavailable' }` so the UI degrades to "Próximamente" — never a
   * fabricated `downloadUrl`.
   */
  async getStatus(id: string): Promise<LeaseDocStatusResponse> {
    try {
      return await apiClient.get<LeaseDocStatusResponse>(
        `/lease-documents/${id}/status`,
      );
    } catch (err) {
      if (isEndpointUnavailable(err)) {
        return { status: 'unavailable' };
      }
      throw err;
    }
  },
};
