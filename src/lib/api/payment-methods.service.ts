'use client';

import { apiClient, ApiError } from './client';
import type {
  PaymentAccount,
  PropertyAccountAssignment,
} from '@/lib/types/payment-accounts';

const BASE = '/landlords/me/payment-methods';

export const paymentMethodsApi = {
  async getAll(): Promise<PaymentAccount[]> {
    try {
      return await apiClient.get<PaymentAccount[]>(BASE);
    } catch (err) {
      // 404 = landlord has no payment methods yet — legitimate empty state.
      // Other errors (5xx, network) propagate so callers can show an error.
      if (err instanceof ApiError && err.status === 404) return [];
      throw err;
    }
  },

  async getById(id: string): Promise<PaymentAccount> {
    return apiClient.get<PaymentAccount>(`${BASE}/${id}`);
  },

  async create(data: Partial<PaymentAccount>): Promise<PaymentAccount> {
    return apiClient.post<PaymentAccount>(BASE, data);
  },

  async update(id: string, data: Partial<PaymentAccount>): Promise<PaymentAccount> {
    return apiClient.patch<PaymentAccount>(`${BASE}/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },

  async getAssignments(): Promise<PropertyAccountAssignment[]> {
    // PENDING FEATURE: the backend does not expose a property-to-account assignments
    // endpoint yet. This returns [] intentionally — it is NOT a fail-open catch;
    // no network call is made, no data is silently swallowed.
    // Follow-up: wire to the real endpoint when it is added to the backend.
    return [];
  },

  async assignProperty(accountId: string, propertyId: string): Promise<void> {
    await apiClient.post(`${BASE}/${accountId}/assign`, { propertyId });
  },

  async unassignProperty(accountId: string, propertyId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${accountId}/assign/${propertyId}`);
  },
};
