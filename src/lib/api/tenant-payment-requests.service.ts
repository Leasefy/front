/**
 * Service para /tenant-payments/requests/mine — historial de PaymentRequests
 * del tenant autenticado (incluye PENDING_VALIDATION, APPROVED, REJECTED, etc).
 *
 * Es la FUENTE ÚNICA del historial del lado tenant. /tenant-payments/mine
 * (que devuelve solo Payment confirmados) ya no se usa para el historial.
 */

import { apiClient, ApiError } from './client';
import type { BackendTenantPaymentRequest } from './tenant-payment-requests.types';

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
};
