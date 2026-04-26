/**
 * Agent Credits API service
 *
 * Credit architecture (from backend):
 * - Plan credits: granted on plan activation, regenerated monthly, expire at
 *   cycle end.
 * - Purchased credits: bought via packs, do NOT expire.
 * - FIFO consumption: plan credits first, then purchased — so plan credits
 *   don't expire unused.
 *
 * Tier behavior:
 * - STARTER: 3 welcome credits (one-time), must purchase afterwards
 * - PRO: 30 credits/month included + can purchase extras
 * - FLEX: unlimited, does not use credits
 */

import { apiClient } from './client';

// ============================================================================
// Types
// ============================================================================

export interface AgentCreditsBalance {
  /** Sum of plan + purchased credits */
  total: number;
  /** Credits granted by the current subscription plan (expire at cycle end) */
  planBalance: number;
  /** Credits bought via packs (never expire) */
  purchasedBalance: number;
  /** ISO date when the current plan credits expire (start of next cycle) */
  planExpiresAt?: string | null;
}

export interface AgentCreditPack {
  /** Number of credits in the pack */
  packSize: number;
  /** Price in COP for the entire pack */
  price: number;
  /** Optional label/description for the UI */
  name?: string;
  description?: string;
  /** Discount applied vs base per-credit price (0-100) */
  discount?: number;
  /** True when this is the most-popular / highlighted pack */
  highlighted?: boolean;
}

export interface PurchaseCreditsPaymentData {
  documentType: 'CC' | 'CE' | 'NIT' | 'PP';
  documentNumber: string;
  bankCode: string;
  holderName: string;
  phoneNumber?: string;
}

export interface PurchaseCreditsDto {
  packSize: number;
  psePaymentData: PurchaseCreditsPaymentData;
}

export interface PurchaseCreditsResponse {
  /** PSE redirect URL or transaction id, depending on backend */
  pseUrl?: string;
  pseTransactionId?: string;
  /** Reference id for tracking */
  purchaseId?: string;
  /** Balance after purchase (if the backend updates it inline) */
  balance?: AgentCreditsBalance;
}

// ============================================================================
// Service
// ============================================================================

export const agentCreditsApi = {
  /** GET /agent-credits/balance */
  async getBalance(): Promise<AgentCreditsBalance> {
    return apiClient.get<AgentCreditsBalance>('/agent-credits/balance');
  },

  /** GET /agent-credits/packs */
  async getPacks(): Promise<AgentCreditPack[]> {
    const res = await apiClient.get<AgentCreditPack[] | { data: AgentCreditPack[] }>(
      '/agent-credits/packs'
    );
    return Array.isArray(res) ? res : res.data;
  },

  /** POST /agent-credits/purchase */
  async purchase(dto: PurchaseCreditsDto): Promise<PurchaseCreditsResponse> {
    return apiClient.post<PurchaseCreditsResponse>('/agent-credits/purchase', dto);
  },
};
