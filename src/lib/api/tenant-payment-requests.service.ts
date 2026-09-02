/**
 * Service para /tenant-payments/requests/mine — historial de PaymentRequests
 * del tenant autenticado (incluye PENDING_VALIDATION, APPROVED, REJECTED, etc).
 *
 * Es la FUENTE ÚNICA del historial del lado tenant. /tenant-payments/mine
 * (que devuelve solo Payment confirmados) ya no se usa para el historial.
 */

import { apiClient, ApiError } from './client';
import type {
  BackendTenantPaymentRequest,
  TenantReceiptUrl,
} from './tenant-payment-requests.types';

export const tenantPaymentRequestsApi = {
  /** GET /tenant-payments/requests/mine — ordenado por createdAt desc. */
  async getMine(): Promise<BackendTenantPaymentRequest[]> {
    try {
      return await apiClient.get<BackendTenantPaymentRequest[]>(
        '/tenant-payments/requests/mine'
      );
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        return [];
      }
      throw err;
    }
  },

  /**
   * GET /tenant-payments/requests/:id/receipt-url — signed, expiring URL to the
   * internal payment receipt ("comprobante interno"), NOT a DIAN electronic
   * invoice (FE). The backend authorizes the tenant on their own request and signs
   * the URL; the frontend never fabricates one.
   *
   * The endpoint does not exist yet, so a 403/404 → `null` (same tolerant idiom as
   * `getMine()`), and the UI degrades to an honest "Próximamente". Do NOT invent a URL.
   */
  async getReceiptUrl(requestId: string): Promise<TenantReceiptUrl | null> {
    try {
      return await apiClient.get<TenantReceiptUrl>(
        `/tenant-payments/requests/${requestId}/receipt-url`
      );
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        return null;
      }
      throw err;
    }
  },
};
