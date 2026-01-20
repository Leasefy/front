/**
 * Subscription and pricing plan types
 * @module lib/types/subscription
 */

// Plan identifiers
export type PlanId = 'free' | 'pro' | 'business';

// Billing options
export type BillingCycle = 'monthly' | 'yearly';

// Subscription lifecycle states
export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'trialing';

/**
 * Individual feature included in a plan
 */
export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  /** Number limit or 'unlimited' */
  limit?: number | 'unlimited';
}

/**
 * Subscription plan definition
 */
export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /** Monthly and yearly prices in COP */
  price: {
    monthly: number;
    yearly: number;
  };
  features: PlanFeature[];
  /** Whether to visually highlight this plan */
  highlighted?: boolean;
  /** Badge text (e.g., "Mas popular") */
  badge?: string;
}

/**
 * User's active subscription
 */
export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  /** ISO date string */
  currentPeriodStart: string;
  /** ISO date string */
  currentPeriodEnd: string;
  /** If true, subscription ends at period end */
  cancelAtPeriodEnd: boolean;
  /** ISO date string, if in trial period */
  trialEndsAt?: string;
}

/**
 * Feature check result with context
 */
export interface FeatureAccess {
  allowed: boolean;
  reason?: string;
  limit?: number | 'unlimited';
  currentUsage?: number;
}

/**
 * Subscription context for components
 */
export interface SubscriptionContextValue {
  /** Current user subscription (null if not subscribed) */
  subscription: Subscription | null;
  /** Current plan details */
  plan: Plan;
  /** Check if user can access a specific feature */
  canAccessFeature: (featureId: string) => FeatureAccess;
  /** Whether user is in trial period */
  isTrialing: boolean;
  /** Days remaining in trial (null if not trialing) */
  daysLeftInTrial: number | null;
  /** Days until subscription renewal/end */
  daysUntilRenewal: number | null;
}

/**
 * Plan comparison row for feature tables
 */
export interface PlanComparisonRow {
  feature: string;
  description: string;
  free: boolean | string | number;
  pro: boolean | string | number;
  business: boolean | string | number;
}

/**
 * Checkout session data
 */
export interface CheckoutSession {
  planId: PlanId;
  billingCycle: BillingCycle;
  email?: string;
  returnUrl: string;
}
