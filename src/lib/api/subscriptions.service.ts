/**
 * Subscriptions & Coupons API service
 * Endpoints: /subscriptions, /subscription-plans, /coupons
 */

import { apiClient } from './client';
import type {
  BackendSubscription,
  BackendSubscriptionPlan,
  CreateSubscriptionDto,
  ValidateCouponDto,
  BackendCouponValidationResult,
  DisplaySubscription,
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

function mapSubscription(backend: BackendSubscription): DisplaySubscription {
  return {
    id: backend.id,
    userId: backend.userId,
    planId: (backend.planId?.toLowerCase() || 'free') as PlanId,
    status: STATUS_MAP[backend.status] || 'active',
    billingCycle: BILLING_MAP[backend.billingCycle] || 'monthly',
    currentPeriodStart: backend.currentPeriodStart,
    currentPeriodEnd: backend.currentPeriodEnd,
    cancelAtPeriodEnd: backend.cancelAtPeriodEnd,
    trialEndsAt: backend.trialEndsAt,
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
          : (backend.coupon.applicablePlans as ('free' | 'pro' | 'business')[]),
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
  planId: 'free',
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
      const backend = await apiClient.get<BackendSubscription>('/subscriptions/me');
      return mapSubscription(backend);
    } catch {
      // If 404 or error, user is on free plan
      return FREE_SUBSCRIPTION;
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
    try {
      const dto: ValidateCouponDto = { code, planId };
      const backend = await apiClient.post<BackendCouponValidationResult>('/coupons/validate', dto);
      return mapCouponValidation(backend);
    } catch {
      return {
        valid: false,
        error: 'Error al validar el cupon. Intenta de nuevo.',
      };
    }
  },
};
