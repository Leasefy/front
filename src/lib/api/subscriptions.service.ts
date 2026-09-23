/**
 * Subscriptions & Coupons API service
 * Endpoints: /subscriptions, /subscription-plans, /coupons
 */

import { apiClient, ApiError } from './client';
import type {
  BackendSubscription,
  BackendSubscriptionMeResponse,
  BackendSubscriptionPlan,
  ValidateCouponDto,
  BackendCouponValidationResult,
  DisplaySubscription,
  SubscriptionPseCheckoutDto,
  SubscriptionPseCheckoutResponse,
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
 * Reads `plan.tier` (a lowercased slug) — NOT `planId`, which is a UUID pointing
 * to the SubscriptionPlanConfig row. The slug is PRESERVED as-is (contrato 29 ·
 * planes dinámicos) so admin-created tiers survive; only an empty tier falls back
 * to the canonical base 'starter'.
 */
function mapSubscription(backend: BackendSubscription): DisplaySubscription {
  const tier = (backend.plan?.tier || '').toLowerCase();
  const planId: PlanId = tier || 'starter';

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
   * 🔴 Acá vivía `createSubscription`, un `POST /subscriptions` que el back no
   * expone (404 «Cannot POST», medido). El controlador de suscripciones no
   * tiene raíz: se entra por `trial`, por `subscribe` —que es la que usa
   * `subscribeWithPSE`, acá abajo— o por `change-plan`. Nadie la llamaba.
   */

  /**
   * 🔴 Acá vivía `subscribeWithPSE` (`POST /subscriptions/subscribe` con datos
   * de un PSE SIMULADO). Sólo la llamaba la página pública `/pse-mock`, que se
   * borró el 23-09: era un formulario de pago PSE con nuestra marca que tomaba
   * el plan y el MONTO de la URL, o sea, una plantilla lista para suplantar un
   * cobro de Leasefy. Además, en producción el back rechaza ese riel simulado
   * (503), así que el propietario que pagaba por ahí nunca terminaba.
   *
   * El pago de verdad del plan del propietario es este: el back crea la
   * suscripción PENDIENTE y una transacción PSE en Wompi, y devuelve la URL del
   * banco. El monto lo calcula el back con el plan y el cupón; el front no lo
   * manda. La suscripción se activa cuando llega el webhook de Wompi.
   */
  async startPseCheckout(
    dto: SubscriptionPseCheckoutDto,
  ): Promise<SubscriptionPseCheckoutResponse> {
    return apiClient.post<SubscriptionPseCheckoutResponse>('/subscriptions/pse/checkout', dto);
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
