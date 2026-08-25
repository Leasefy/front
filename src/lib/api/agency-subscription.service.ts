/**
 * Real agency subscription service (Wompi PSE). Talks to the real
 * /inmobiliaria/subscription/* endpoints (NOT the /pse-mock portal).
 * All routes require the agency admin's `subscription:edit`/`view` permission
 * (enforced by the backend). See `agency-subscription.types.ts`.
 */

import { apiClient } from './client';
import type {
  AgencyPlanTier,
  AgencySubscriptionState,
  ChargePaymentLinkResponse,
  ChargePseCheckoutDto,
  ChargePseCheckoutResponse,
  SelectPlanResponse,
} from './agency-subscription.types';

const BASE = '/inmobiliaria/subscription';

export const agencySubscriptionApi = {
  /** GET /inmobiliaria/subscription — current subscription + open charge (cheap read). */
  get(): Promise<AgencySubscriptionState> {
    return apiClient.get<AgencySubscriptionState>(BASE);
  },

  /**
   * POST /inmobiliaria/subscription/verify — reconcile the open charge against
   * Wompi (queries the real tx status and promotes it) then returns fresh state.
   * Self-heals a lost/delayed webhook. Requires `subscription:edit`.
   */
  verify(): Promise<AgencySubscriptionState> {
    return apiClient.post<AgencySubscriptionState>(`${BASE}/verify`, {});
  },

  /**
   * POST /inmobiliaria/subscription/select-plan — create/switch the plan.
   * PRO returns a PENDING `charge` to pay via PSE; STARTER/FLEX return `charge: null`
   * (activated with no upfront payment).
   */
  selectPlan(planTier: AgencyPlanTier): Promise<SelectPlanResponse> {
    return apiClient.post<SelectPlanResponse>(`${BASE}/select-plan`, { planTier });
  },

  /**
   * POST /inmobiliaria/subscription/charges/:chargeId/pse-checkout — start a real
   * PSE checkout for a PENDING charge. Returns `asyncPaymentUrl` (may be null).
   */
  chargePseCheckout(
    chargeId: string,
    dto: ChargePseCheckoutDto,
  ): Promise<ChargePseCheckoutResponse> {
    return apiClient.post<ChargePseCheckoutResponse>(
      `${BASE}/charges/${chargeId}/pse-checkout`,
      dto,
    );
  },

  /**
   * POST /inmobiliaria/subscription/charges/:chargeId/payment-link — create a
   * hosted Wompi Payment Link for a PENDING charge (avaluo-style). Returns the
   * permalink `url` to open in a separate tab; the payer picks any method there.
   * Requires `subscription:edit`.
   */
  chargePaymentLink(chargeId: string): Promise<ChargePaymentLinkResponse> {
    return apiClient.post<ChargePaymentLinkResponse>(
      `${BASE}/charges/${chargeId}/payment-link`,
      {},
    );
  },
};
