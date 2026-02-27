'use client';

import { apiClient } from './client';
import type {
  PaymentAccount,
  PropertyAccountAssignment,
} from '@/lib/types/payment-accounts';

const BASE = '/landlords/me/payment-methods';

export const paymentMethodsApi = {
  async getAll(): Promise<PaymentAccount[]> {
    try {
      return await apiClient.get<PaymentAccount[]>(BASE);
    } catch {
      return [];
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
    // Assignments endpoint not yet implemented in backend
    return [];
  },

  async assignProperty(accountId: string, propertyId: string): Promise<void> {
    await apiClient.post(`${BASE}/${accountId}/assign`, { propertyId });
  },

  async unassignProperty(accountId: string, propertyId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${accountId}/assign/${propertyId}`);
  },
};
