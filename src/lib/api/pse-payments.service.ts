/**
 * PSE Mock service — endpoint del backend que simula una pasarela PSE para pagos de arriendo.
 * El mock devuelve SUCCESS/FAILURE/PENDING de forma determinística según el último dígito
 * del documento (ver `pse-payments.types.ts`). Cuando responde SUCCESS, el backend crea
 * automáticamente un `TenantPaymentRequest` con status PENDING_VALIDATION.
 */

import { apiClient } from './client';
import type {
  PseBank,
  PseProcessDto,
  PseProcessResponse,
} from './pse-payments.types';

export const psePaymentsApi = {
  /** GET /pse-mock/banks — público (no requiere auth). Lista de bancos colombianos soportados. */
  async getBanks(): Promise<PseBank[]> {
    return apiClient.get<PseBank[]>('/pse-mock/banks');
  },

  /**
   * POST /pse-mock/process — procesa el pago de arriendo via mock PSE.
   * Requiere rol TENANT.
   * Validaciones del backend:
   *   - tenant es del lease
   *   - lease.status ∈ {ACTIVE, ENDING_SOON}
   *   - no hay otro payment confirmado / PENDING_VALIDATION para el mismo período (409 Conflict)
   */
  async processPayment(dto: PseProcessDto): Promise<PseProcessResponse> {
    return apiClient.post<PseProcessResponse>('/pse-mock/process', dto);
  },
};
