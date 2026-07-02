/**
 * Subscriptions & Coupons API service
 * Endpoints: /subscriptions, /subscription-plans, /coupons
 */

import { apiClient, ApiError } from './client';
import type {
  BackendSubscription,
  BackendSubscriptionMeResponse,
  BackendSubscriptionPlan,
  CreateSubscriptionDto,
  ValidateCouponDto,
  BackendCouponValidationResult,
  DisplaySubscription,
  SubscribeWithPSEDto,
  PSEBank,
} from './subscriptions.types';
import type { PlanId, BillingCycle, SubscriptionStatus } from '@/lib/types/subscription';
import type { Coupon, CouponValidationResult, CouponDiscount } from '@/lib/types/coupon';

// ============================================================================
// Mappers
// ============================================================================

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
  // Also handle lowercase from backend
  active: 'active',
  cancelled: 'cancelled',
  past_due: 'past_due',
  trialing: 'trialing',
};

const BILLING_MAP: Record<string, BillingCycle> = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  monthly: 'monthly',
  yearly: 'yearly',
};

/**
 * Maps the canonical tier from the backend to the frontend PlanId.
 * Reads `plan.tier` (STARTER | PRO | FLEX) — NOT `planId`, which is a UUID
 * pointing to the SubscriptionPlanConfig row.
 */
function mapSubscription(backend: BackendSubscription): DisplaySubscription {
  const tier = (backend.plan?.tier || '').toLowerCase();
  const planId: PlanId = (['starter', 'pro', 'flex'].includes(tier) ? tier : 'starter') as PlanId;

  const cycle = backend.cycle ?? backend.billingCycle ?? 'monthly';
  const periodStart = backend.startDate ?? backend.currentPeriodStart ?? new Date().toISOString();
  const periodEnd = backend.endDate ?? backend.currentPeriodEnd ?? new Date().toISOString();
  const cancelAtPeriodEnd = backend.cancelAtPeriodEnd ?? (backend.autoRenew === false);

  return {
    id: backend.id,
    userId: backend.userId,
    planId,
    status: STATUS_MAP[backend.status] || 'active',
    billingCycle: BILLING_MAP[cycle] || 'monthly',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd,
    trialEndsAt: backend.trialEndsAt ?? undefined,
  };
}

function mapCouponValidation(backend: BackendCouponValidationResult): CouponValidationResult {
  if (!backend.valid) {
    return {
      valid: false,
      error: backend.error || 'Cupon no valido',
    };
  }

  const coupon: Coupon | undefined = backend.coupon
    ? {
        id: backend.coupon.id,
        code: backend.coupon.code,
        type: backend.coupon.type as Coupon['type'],
        value: backend.coupon.value,
        validFrom: backend.coupon.validFrom,
        validUntil: backend.coupon.validUntil,
        maxUses: backend.coupon.maxUses,
        currentUses: backend.coupon.currentUses,
        applicablePlans: backend.coupon.applicablePlans === 'all'
          ? 'all'
          : (backend.coupon.applicablePlans as ('starter' | 'pro' | 'flex')[]),
        minimumPurchase: backend.coupon.minimumPurchase,
        description: backend.coupon.description,
        createdAt: backend.coupon.validFrom,
      }
    : undefined;

  const discount: CouponDiscount | undefined = backend.discount
    ? {
        type: backend.discount.type as CouponDiscount['type'],
        value: backend.discount.value,
        description: backend.discount.description,
      }
    : undefined;

  return { valid: true, coupon, discount };
}

// ============================================================================
// Default subscription for unauthenticated/error cases
// ============================================================================

const FREE_SUBSCRIPTION: DisplaySubscription = {
  id: '',
  userId: '',
  planId: 'starter', // canonical base tier
  status: 'active',
  billingCycle: 'monthly',
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
};

// ============================================================================
// API
// ============================================================================

export const subscriptionsApi = {
  /**
   * Get the current user's subscription
   * Falls back to free plan if no subscription exists
   */
  async getMySubscription(): Promise<DisplaySubscription> {
    try {
      // Backend returns an envelope: { subscription, usage, planConfig }
      // with the canonical tier at subscription.plan.tier.
      const response = await apiClient.get<BackendSubscriptionMeResponse | BackendSubscription>(
        '/subscriptions/me'
      );
      const sub = 'subscription' in response && response.subscription
        ? response.subscription
        : (response as BackendSubscription);
      if (!sub || !sub.id) return FREE_SUBSCRIPTION;
      return mapSubscription(sub);
    } catch (err) {
      // 404 = user has no subscription yet → legitimately on the base tier.
      // Any other error (5xx, network) is a backend/infra failure — propagate so
      // callers can surface an honest error instead of silently degrading to free.
      // Degrading to free on 5xx could hide paid features from paying users.
      if (err instanceof ApiError && err.status === 404) return FREE_SUBSCRIPTION;
      throw err;
    }
  },

  /**
   * Create a new subscription
   */
  async createSubscription(dto: CreateSubscriptionDto): Promise<DisplaySubscription> {
    const backend = await apiClient.post<BackendSubscription>('/subscriptions', dto);
    return mapSubscription(backend);
  },

  /**
   * Subscribe to a plan with PSE payment data.
   * POST /subscriptions/subscribe
   * Mock is deterministic by last digit of documentNumber.
   */
  async subscribeWithPSE(dto: SubscribeWithPSEDto): Promise<DisplaySubscription> {
    const backend = await apiClient.post<BackendSubscription>('/subscriptions/subscribe', dto);
    return mapSubscription(backend);
  },

  /**
   * Get available PSE banks for the mock.
   * GET /pse-mock/banks — public, no auth required
   */
  async getPSEBanks(): Promise<PSEBank[]> {
    return apiClient.get<PSEBank[]>('/pse-mock/banks');
  },

  /**
   * Cancel the current subscription
   */
  async cancelSubscription(): Promise<void> {
    await apiClient.post<void>('/subscriptions/cancel');
  },

  /**
   * Fetch available subscription plans from the backend.
   * Public endpoint — no auth required.
   */
  async getPlans(planType?: 'LANDLORD' | 'AGENCY'): Promise<BackendSubscriptionPlan[]> {
    const qs = planType ? `?planType=${planType}` : '';
    return apiClient.get<BackendSubscriptionPlan[]>(`/subscription-plans${qs}`);
  },

  /**
   * Fetch a single plan by ID.
   */
  async getPlan(id: string): Promise<BackendSubscriptionPlan> {
    return apiClient.get<BackendSubscriptionPlan>(`/subscription-plans/${id}`);
  },

  /**
   * Validate a coupon code against a plan
   */
  async validateCoupon(code: string, planId: PlanId): Promise<CouponValidationResult> {
    // Business outcomes (valid/invalid) come as 200 body with `valid: false` — handled by
    // mapCouponValidation. Infrastructure failures (network, 5xx) throw ApiError so callers
    // can distinguish "server down" from "coupon is invalid". Do NOT catch here.
    const dto: ValidateCouponDto = { code, planId };
    const backend = await apiClient.post<BackendCouponValidationResult>('/coupons/validate', dto);
    return mapCouponValidation(backend);
  },
};
