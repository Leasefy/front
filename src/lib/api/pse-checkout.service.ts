/**
 * Real PSE (Wompi) checkout service for tenant rent. Talks to the real backend
 * endpoints (NOT /pse-mock). See `pse-checkout.types.ts` for the contract.
 */

import { apiClient } from './client';
import type {
  PseCheckoutDto,
  PseCheckoutResponse,
  PseFinancialInstitution,
  PsePaymentRequestState,
} from './pse-checkout.types';

export const pseCheckoutApi = {
  /** GET /leases/pse/financial-institutions — live PSE bank catalog from Wompi. */
  getFinancialInstitutions(): Promise<PseFinancialInstitution[]> {
    return apiClient.get<PseFinancialInstitution[]>('/leases/pse/financial-institutions');
  },

  /**
   * POST /leases/:leaseId/pse/checkout — starts a real PSE checkout.
   * Requires TENANT role. Returns `asyncPaymentUrl` (may be null) to redirect to.
   * Throws ApiError on 400 (invalid/inactive lease), 403 (not tenant),
   * 409 (duplicate period), 503 (gateway unavailable).
   */
  checkout(leaseId: string, dto: PseCheckoutDto): Promise<PseCheckoutResponse> {
    return apiClient.post<PseCheckoutResponse>(`/leases/${leaseId}/pse/checkout`, dto);
  },

  /**
   * GET /leases/:leaseId/payment-requests/:requestId — poll a single request's
   * status while waiting for the Wompi webhook to confirm. Success: APPROVED.
   */
  getRequestStatus(leaseId: string, requestId: string): Promise<PsePaymentRequestState> {
    return apiClient.get<PsePaymentRequestState>(
      `/leases/${leaseId}/payment-requests/${requestId}`,
    );
  },

  /**
   * POST /leases/:leaseId/pse/requests/:requestId/verify — reconcile the request
   * against Wompi (queries the real tx status and promotes it) then returns fresh
   * state. Self-heals a lost/delayed webhook so the payment confirms without it.
   */
  verifyRequest(leaseId: string, requestId: string): Promise<PsePaymentRequestState> {
    return apiClient.post<PsePaymentRequestState>(
      `/leases/${leaseId}/pse/requests/${requestId}/verify`,
      {},
    );
  },
};
