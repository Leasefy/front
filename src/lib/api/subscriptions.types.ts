/**
 * Backend types for subscription endpoints
 * Maps to frontend Subscription, Plan types
 */

import type { PlanId, BillingCycle, SubscriptionStatus } from '@/lib/types/subscription';
import type { CouponType } from '@/lib/types/coupon';

// ============================================================================
// Backend Subscription (from GET /subscriptions/mine)
// ============================================================================

/**
 * Response shape for GET /subscriptions/me.
 * The backend returns { subscription, usage, planConfig }.
 * The `subscription.planId` field is the UUID of the SubscriptionPlanConfig row —
 * the canonical human-readable tier lives at `subscription.plan.tier`.
 */
/**
 * Billing model for a plan config row. `FLAT` = fixed monthly/annual price;
 * `USAGE_CANON` = percentage of administered canon (`usageFeeBps`), monthly
 * price is not charged. Reused by the admin plan CRUD (see lib/admin/plans.ts).
 */
export type AgencyBillingMode = 'FLAT' | 'USAGE_CANON';

export interface BackendSubscriptionPlanInfo {
  id: string;
  planType: 'TENANT' | 'LANDLORD' | 'AGENCY';
  // slug libre admin-creatable, ver contrato 29
  tier: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  annualPrice: number;
  maxProperties?: number;
  maxScoringViews?: number;
  hasPremiumScoring?: boolean;
  hasApiAccess?: boolean;
  isActive?: boolean;
}

export interface BackendSubscription {
  id: string;
  userId: string;
  /** UUID of the SubscriptionPlanConfig — NOT a human tier. Use `plan.tier` for UI. */
  planId: string;
  status: string; // ACTIVE, CANCELLED, PAST_DUE, TRIALING
  /** Backend returns `cycle`; legacy clients may still receive `billingCycle`. */
  cycle?: string;
  billingCycle?: string; // MONTHLY, YEARLY
  startDate?: string;
  endDate?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  autoRenew?: boolean;
  cancelledAt?: string | null;
  trialEndsAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Full plan info — canonical tier lives here. */
  plan?: BackendSubscriptionPlanInfo;
}

/** Envelope shape from GET /subscriptions/me */
export interface BackendSubscriptionMeResponse {
  subscription: BackendSubscription | null;
  usage?: Record<string, unknown>;
  planConfig?: Record<string, unknown>;
}

// ============================================================================
// Create Subscription DTO
// ============================================================================

export interface CreateSubscriptionDto {
  planId: PlanId;
  billingCycle: BillingCycle;
  couponCode?: string;
}

// ============================================================================
// PSE Subscribe DTO (POST /subscriptions/subscribe)
// ============================================================================

export type PSEDocumentType = 'CC' | 'CE' | 'NIT' | 'PP';
export type SubscriptionCycle = 'MONTHLY' | 'ANNUAL';

export interface PSEPaymentData {
  documentType: PSEDocumentType;
  documentNumber: string;
  bankCode: string;
  holderName: string;
  phoneNumber?: string;
}

export interface SubscribeWithPSEDto {
  planId: string; // backend UUID
  cycle: SubscriptionCycle;
  psePaymentData?: PSEPaymentData; // required for paid plans, omit for Starter/free
  couponCode?: string;
}

// ============================================================================
// PSE Bank (GET /pse-mock/banks)
// ============================================================================

export interface PSEBank {
  code: string;
  name: string;
}

// ============================================================================
// Backend Coupon Validation (from POST /coupons/validate)
// ============================================================================

export interface ValidateCouponDto {
  code: string;
  planId: PlanId;
}

export interface BackendCouponValidationResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    type: string; // PERCENTAGE, FIXED_AMOUNT, FREE_MONTHS, FULL_ACCESS
    value: number;
    validFrom: string;
    validUntil: string;
    maxUses: number | null;
    currentUses: number;
    applicablePlans: string[] | 'all';
    minimumPurchase?: number;
    description: string;
  };
  error?: string;
  discount?: {
    type: string; // percentage, fixed, free_period
    value: number;
    description: string;
  };
}

// ============================================================================
// Backend Subscription Plan (from GET /subscription-plans)
// ============================================================================

export interface BackendSubscriptionPlan {
  id: string;
  planType: 'LANDLORD' | 'AGENCY';
  tier: string;
  name: string;
  description?: string | null;
  /** Position in the tier ladder; null = pay-per-use (Flex). */
  level?: number | null;
  monthlyPrice: number;
  annualPrice: number;
  /** Sentinels: -1 = unlimited, 0 = none, N = cap. */
  maxProperties: number;
  maxUsers: number;
  maxScoringViews: number;
  monthlyEvalCap: number;
  monthlyCreditGrant: number;
  billingMode: AgencyBillingMode;
  /** Basis points; 100 = 1%. Only relevant when billingMode = USAGE_CANON. */
  usageFeeBps: number;
  scoringIncluded: boolean;
  hasPremiumScoring: boolean;
  hasApiAccess: boolean;
  scoringViewPrice: number;
  evaluationCreditPrice: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Display types (mapped from backend)
// ============================================================================

export interface DisplaySubscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
}
