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

/**
 * Compra de un pack por el PSE REAL de Wompi (`POST /agent-credits/pse/checkout`,
 * back `PseCreditsCheckoutDto`). Reemplaza a `POST /agent-credits/purchase`,
 * que cobraba contra un banco SIMULADO (`/pse-mock`) — ver la página.
 * El monto NO viaja: el back lo saca del pack.
 */
export interface CreditsPseCheckoutDto {
  packSize: number;
  userType: 'NATURAL' | 'JURIDICA';
  legalIdType: 'CC' | 'CE' | 'NIT' | 'PP';
  /** 6 a 15 dígitos (misma regla que el back). */
  legalId: string;
  /** `financial_institution_code` del catálogo de Wompi. */
  financialInstitutionCode: string;
  email: string;
  fullName: string;
}

export interface CreditsPseCheckoutResponse {
  packSize: number;
  amountCop: number;
  wompiTransactionId: string;
  /** URL del banco. Puede venir null si Wompi aún no la generó. */
  asyncPaymentUrl: string | null;
  status: 'PENDING';
}

/** Lo que devuelve de verdad `GET /agent-credits/packs` (back `getAvailablePacks`). */
interface PackDelBack {
  size: number;
  priceCop: number;
  pricePerCreditCop?: number;
}

// ============================================================================
// Service
// ============================================================================

export const agentCreditsApi = {
  /** GET /agent-credits/balance */
  async getBalance(): Promise<AgentCreditsBalance> {
    return apiClient.get<AgentCreditsBalance>('/agent-credits/balance');
  },

  /**
   * GET /agent-credits/packs → `{ packs: [{ size, priceCop, pricePerCreditCop }] }`.
   *
   * 🔴 Antes se leía como `AgentCreditPack[]` o `{ data }`: con la forma real
   * `packs` quedaba `undefined` y la pantalla se caía en `packs.length`. Se
   * traduce acá, en un solo lugar.
   */
  async getPacks(): Promise<AgentCreditPack[]> {
    const res = await apiClient.get<{ packs?: PackDelBack[] } | PackDelBack[]>(
      '/agent-credits/packs'
    );
    const lista = Array.isArray(res) ? res : (res?.packs ?? []);
    return lista.map((p) => ({ packSize: p.size, price: p.priceCop }));
  },

  /**
   * POST /agent-credits/pse/checkout — el back crea la transacción PSE en
   * Wompi y devuelve la URL del banco. Los créditos se acreditan cuando el
   * webhook de Wompi confirma el pago, no al volver de acá.
   */
  async startPseCheckout(dto: CreditsPseCheckoutDto): Promise<CreditsPseCheckoutResponse> {
    return apiClient.post<CreditsPseCheckoutResponse>('/agent-credits/pse/checkout', dto);
  },
};
