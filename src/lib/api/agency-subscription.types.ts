/**
 * Real agency subscription (Wompi PSE) — replaces the /pse-mock + /subscriptions/subscribe
 * flow for AGENCIES. Only the agency admin pays; team members inherit the plan.
 *
 * Backend contract (see back `AgencySubscriptionController`):
 *   GET  /inmobiliaria/subscription                              → AgencySubscriptionState (poll)
 *   POST /inmobiliaria/subscription/select-plan {planTier}       → SelectPlanResponse
 *   POST /inmobiliaria/subscription/charges/:chargeId/pse-checkout → ChargePseCheckoutResponse
 *
 * Plan behaviour: STARTER → ACTIVE, no charge (free). FLEX → ACTIVE, no upfront charge
 * (postpaid). PRO → PAST_DUE + a PENDING charge that must be paid via PSE.
 * Bank list is reused from `pseCheckoutApi.getFinancialInstitutions()`.
 */

import type { PseUserType, PseLegalIdType } from './pse-checkout.types';

export type AgencyPlanTier = 'STARTER' | 'PRO' | 'FLEX';
export type AgencySubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
export type AgencyChargeStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface AgencySubscription {
  id: string;
  agencyId: string;
  planTier: AgencyPlanTier;
  status: AgencySubscriptionStatus;
  billingMode?: string;
  currentPeriodEnd?: string | null;
  nextBillingDate?: string | null;
}

export interface AgencySubscriptionCharge {
  id: string;
  amount: number; // COP whole pesos
  status: AgencyChargeStatus;
  /** Raw Wompi gateway status (PENDING/APPROVED/DECLINED/ERROR/VOIDED). May be set
   * while `status` is still PENDING — treat DECLINED/ERROR/VOIDED as a failed pay. */
  gatewayStatus?: string | null;
  wompiTransactionId?: string | null;
  dueDate?: string;
  periodStart?: string;
  periodEnd?: string;
}

/** GET /inmobiliaria/subscription — current state; poll target after checkout. */
export interface AgencySubscriptionState {
  subscription: AgencySubscription | null;
  /** The open PENDING charge, if any. Becomes null once terminal (SUCCESS/FAILED). */
  openCharge: AgencySubscriptionCharge | null;
  status: AgencySubscriptionStatus | null;
  canOfferRentals: boolean;
}

/** POST select-plan → PRO returns a PENDING `charge`; STARTER/FLEX return `charge: null`. */
export interface SelectPlanResponse {
  subscription: AgencySubscription;
  charge: AgencySubscriptionCharge | null;
}

export interface ChargePseCheckoutDto {
  userType: PseUserType;
  legalIdType: PseLegalIdType;
  /** 6-15 digits. */
  legalId: string;
  /** `financial_institution_code` from the bank catalog. */
  financialInstitutionCode: string;
  email: string;
  fullName: string;
}

export interface ChargePseCheckoutResponse {
  chargeId: string;
  wompiTransactionId: string;
  /** Redirect here to complete the payment. Can be null (URL not ready yet). */
  asyncPaymentUrl: string | null;
  status: AgencyChargeStatus;
}
