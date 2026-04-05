/**
 * Backend types for subscription endpoints
 * Maps to frontend Subscription, Plan types
 */

import type { PlanId, BillingCycle, SubscriptionStatus } from '@/lib/types/subscription';
import type { CouponType } from '@/lib/types/coupon';

// ============================================================================
// Backend Subscription (from GET /subscriptions/mine)
// ============================================================================

export interface BackendSubscription {
  id: string;
  userId: string;
  planId: string;
  status: string; // ACTIVE, CANCELLED, PAST_DUE, TRIALING
  billingCycle: string; // MONTHLY, YEARLY
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
  createdAt?: string;
  updatedAt?: string;
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
  monthlyPrice: number;
  annualPrice: number;
  maxProperties: number; // -1 = unlimited
  hasPremiumScoring: boolean;
  evaluationCreditPrice: number;
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
