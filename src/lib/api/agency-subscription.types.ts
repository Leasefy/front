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
 * (postpaid). An UP move on the ladder (e.g. → PRO) is pay-first: `subscription.status`
 * stays ACTIVE on the OLD tier and a PENDING charge is created; the tier only flips once
 * the charge is confirmed (see `AgencySubscriptionCharge.targetPlanTier` below). The back
 * never assigns PAST_DUE from this lifecycle — confirmed against
 * `agency-subscription-access.policy.ts` (dunning goes ACTIVE → SUSPENDED once the grace
 * period expires); this comment previously said PRO selection set PAST_DUE, which does not
 * match current backend behaviour and misled the front into treating subscription.status
 * as a payment signal (T-0012).
 * Bank list is reused from `pseCheckoutApi.getFinancialInstitutions()`.
 */

import type { PseUserType, PseLegalIdType } from './pse-checkout.types';

// slug libre admin-creatable, ver contrato 29
export type AgencyPlanTier = string;
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

/**
 * INITIAL — first charge for a brand-new paid subscription. RENEWAL — a
 * same-tier billing-cycle charge (monthly cron, or a T-0085 reactivation
 * reusing/creating one for a SUSPENDED/PAST_DUE owner). UPGRADE — a ladder
 * move to a higher tier (`targetPlanTier` set). Already on the wire today
 * (`agency-subscription.controller.ts` returns the raw Prisma row, no
 * serializer) — this type just didn't declare it (T-0085 contract §3.2/§4).
 */
export type AgencyChargeKind = 'INITIAL' | 'RENEWAL' | 'UPGRADE';

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
  /**
   * The plan slug this charge unlocks once confirmed (pay-first — see
   * `agency-subscription.service.ts`'s `confirmChargeFromWebhook`). The ONLY reliable
   * "purchase paid" signal: `subscription.status` stays ACTIVE on the OLD tier for the
   * entire time the charge is PENDING, so it must never be read as a payment signal.
   * Null for a RENEWAL charge (same plan, fresh period).
   */
  targetPlanTier?: string | null;
  /** See `AgencyChargeKind`. Optional because older reads may omit it. */
  kind?: AgencyChargeKind;
}

/** GET /inmobiliaria/subscription — current state; poll target after checkout. */
export interface AgencySubscriptionState {
  subscription: AgencySubscription | null;
  /** The open PENDING charge, if any. Becomes null once terminal (SUCCESS/FAILED). */
  openCharge: AgencySubscriptionCharge | null;
  status: AgencySubscriptionStatus | null;
  canOfferRentals: boolean;
}

/**
 * Discriminator the back branches on internally (`SelectPlanResponseDto`,
 * `agency-subscription-response.dto.ts`). The front does not switch on every
 * member today — `pay()` only special-cases `REACTIVATION_PENDING` (T-0085);
 * every other value follows the existing payment-link path unchanged.
 */
export type SelectPlanOutcome =
  | 'NO_CHANGE'
  | 'PENDING_PAYMENT'
  | 'SCHEDULED_DOWNGRADE'
  | 'FLEX_ACTIVATED'
  /** SUSPENDED/PAST_DUE owner re-selecting their current tier: a payable
   * RENEWAL charge (reused or freshly created) lifts the suspension once
   * paid. `charge.targetPlanTier` is always null for this outcome. */
  | 'REACTIVATION_PENDING';

/** POST select-plan → PRO returns a PENDING `charge`; STARTER/FLEX return `charge: null`. */
export interface SelectPlanResponse {
  subscription: AgencySubscription;
  charge: AgencySubscriptionCharge | null;
  /** Optional: an old back predating T-0085 never sends it. */
  outcome?: SelectPlanOutcome;
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

/**
 * POST /inmobiliaria/subscription/charges/:chargeId/payment-link — response.
 * Hosted Wompi Payment Link (avaluo-style): open `url` in a separate tab; the
 * payer picks any method (card/PSE/Nequi). The backend matches the webhook by
 * `payment_link_id` (Payment Links ignore our reference).
 */
export interface ChargePaymentLinkResponse {
  /** Hosted Wompi checkout permalink (e.g. https://checkout.wompi.co/l/...). */
  url: string;
}
