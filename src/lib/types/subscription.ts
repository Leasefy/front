/**
 * Subscription and pricing plan types
 * @module lib/types/subscription
 */

/**
 * Canonical plan tier identifiers — match backend enum `SubscriptionPlan`
 * (STARTER | PRO | FLEX, lowercased for UI keys).
 *
 * The same three tiers apply to all planType values (TENANT | LANDLORD | AGENCY);
 * role-specific labels are resolved via planType, not via a separate tier.
 */
export type PlanId = 'starter' | 'pro' | 'flex';

/** @deprecated Use PlanId — tiers are unified across roles */
export type AgencyPlanId = PlanId | 'enterprise';

// Pricing model for agency plans
export type PricingModel = 'free' | 'flat' | 'percentage' | 'custom';

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
  starter: boolean | string | number;
  pro: boolean | string | number;
  flex: boolean | string | number;
}

/**
 * Agency subscription plan definition
 */
export interface AgencyPlan {
  id: AgencyPlanId;
  name: string;
  description: string;
  /** Pricing model: free, flat monthly, percentage of canon, or custom */
  pricingModel: PricingModel;
  price: {
    monthly: number | null; // null = custom or percentage-based pricing
    yearly: number | null; // null = custom or percentage-based pricing
  };
  /** Per-evaluation AI pricing in COP */
  evaluation: {
    /** Price per evaluation in COP (0 = free/included) */
    price: number;
    /** Discount percentage off base price (0-100) */
    discount: number;
    /** Max evaluations per month (null = unlimited) */
    limit: number | null;
  };
  /** For percentage-based plans: % of total monthly canon administered */
  canonPercentage?: number;
  limits: {
    properties: number | null; // null = unlimited
    users: number | null;
  };
  features: string[];
  highlighted?: boolean;
  badge?: string;
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
