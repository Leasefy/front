/**
 * Hooks for subscription data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscriptionsApi } from '@/lib/api/subscriptions.service';
import type { DisplaySubscription, BackendSubscriptionPlan } from '@/lib/api/subscriptions.types';
import type { PlanId, AgencyPlan, PricingModel } from '@/lib/types/subscription';
import { AGENCY_PLANS, BASE_EVALUATION_PRICE_COP } from '@/lib/constants/subscription-plans';

/**
 * Hook to get the current user's subscription.
 * On error, sets `error` and leaves `subscription` as null — does NOT default
 * to any plan. Callers must distinguish three states: `isLoading`, `error`,
 * and a real `subscription`. Use `refetch` to retry after a transient failure.
 */
export function useMySubscription() {
  const [subscription, setSubscription] = useState<DisplaySubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await subscriptionsApi.getMySubscription();
      setSubscription(data);
    } catch (err) {
      // Surface the real error — do NOT silently fallback to starter plan.
      // A 5xx or network error means we could not load the subscription;
      // silently degrading to starter could hide paid features from paying users.
      // The caller should check `error` and show "no pudimos cargar tu plan".
      setError(err instanceof Error ? err.message : 'No pudimos cargar tu plan. Intentá de nuevo.');
      // Leave `subscription` as null so UIs that render based on plan cannot
      // accidentally use stale/incorrect plan data.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    isLoading,
    error,
    refetch: fetchSubscription,
  };
}

/**
 * Hook for coupon validation via API
 */
export function useCouponValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async (code: string, planId: PlanId) => {
    setIsValidating(true);
    try {
      const result = await subscriptionsApi.validateCoupon(code, planId);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, []);

  return { validate, isValidating };
}

/**
 * Hook to fetch subscription plans from the backend.
 * Returns plans with live pricing. Falls back to empty array on error.
 */
export function useSubscriptionPlans(planType?: 'LANDLORD' | 'AGENCY') {
  const [plans, setPlans] = useState<BackendSubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await subscriptionsApi.getPlans(planType);
      setPlans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar planes');
    } finally {
      setIsLoading(false);
    }
  }, [planType]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, isLoading, error, refetch: fetchPlans };
}

// =============================================================================
// Mapper: BackendSubscriptionPlan → AgencyPlan (merges prices with static data)
// =============================================================================

/**
 * Derive the marketing bullets from the backend columns so what the card shows
 * ALWAYS matches what the backend charges/enforces. Used for EVERY plan (legacy
 * and admin-created alike) — no plan reuses static copy that could contradict
 * the live columns (contrato 29 · planes dinámicos).
 *
 * `properties`/`users` are already null-normalized (-1 → null = unlimited).
 * `evalLimit` is the monthly evaluation cap (null = unlimited).
 */
function deriveAgencyFeatures(
  backend: BackendSubscriptionPlan,
  properties: number | null,
  users: number | null,
  evalLimit: number | null,
): string[] {
  const features: string[] = [];
  features.push(properties === null ? 'Propiedades ilimitadas' : `Hasta ${properties} propiedades`);
  features.push(users === null ? 'Usuarios ilimitados' : `Hasta ${users} usuarios`);

  // Evaluation copy reflects the billing mode, the per-eval price AND the
  // monthly cap so we never show a stale "Hasta N/mes" that the backend dropped.
  if (backend.billingMode === 'USAGE_CANON') {
    features.push('Evaluaciones AI ilimitadas incluidas');
  } else {
    const priced =
      backend.evaluationCreditPrice > 0
        ? ` a $${backend.evaluationCreditPrice.toLocaleString('es-CO')} COP c/u`
        : ' incluidas';
    if (evalLimit === null) {
      features.push(`Evaluaciones AI ilimitadas${priced}`);
    } else if (evalLimit > 0) {
      features.push(`Hasta ${evalLimit} evaluaciones AI/mes${priced}`);
    } else {
      features.push(`Evaluaciones AI${priced}`);
    }
  }

  if (backend.hasPremiumScoring) features.push('Scoring premium');
  if (backend.hasApiAccess) features.push('Acceso API + Webhooks');
  return features;
}

/**
 * Build an `AgencyPlan` from the backend plan columns. The resulting `id` is the
 * REAL backend slug and prices/limits/evaluation come straight from the backend,
 * so admin-created slugs (contrato 29) never inherit Starter's static data.
 *
 * Presentation-only marketing bullets are reused from the static catalog when
 * the slug maps to a known legacy plan (a dynamic lookup, NOT tier-name gating);
 * unknown slugs get generic bullets derived from the columns.
 *
 * Sentinels: -1 = unlimited (→ null), 0 = none, N = cap. `USAGE_CANON` billing
 * maps to a percentage-of-canon plan (price shown as `usageFeeBps / 100`%).
 */
export function mergeBackendIntoAgencyPlan(backend: BackendSubscriptionPlan): AgencyPlan {
  const slug = (backend.tier || '').toLowerCase();
  const isUsage = backend.billingMode === 'USAGE_CANON';

  const pricingModel: PricingModel = isUsage
    ? 'percentage'
    : backend.monthlyPrice > 0
      ? 'flat'
      : 'free';

  const properties = backend.maxProperties === -1 ? null : backend.maxProperties;
  const users = backend.maxUsers === -1 ? null : backend.maxUsers;
  const evalLimit = backend.monthlyEvalCap === -1 ? null : backend.monthlyEvalCap;
  const evalDiscount =
    BASE_EVALUATION_PRICE_COP > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((1 - backend.evaluationCreditPrice / BASE_EVALUATION_PRICE_COP) * 100)),
        )
      : 0;

  // Bullets are ALWAYS derived from the backend columns — for legacy slugs too —
  // so the displayed limits/pricing never contradict what the backend enforces
  // (e.g. legacy `pro` is unlimited in the backend, not the static "Hasta 100").
  // Only presentation-only flags (highlighted/badge) reuse the known legacy plan.
  const known = AGENCY_PLANS.find((p) => p.id === slug);
  const features = deriveAgencyFeatures(backend, properties, users, evalLimit);

  return {
    id: slug,
    name: backend.name,
    description: backend.description ?? '',
    pricingModel,
    price: {
      monthly: isUsage ? null : backend.monthlyPrice,
      yearly: isUsage ? null : backend.annualPrice,
    },
    canonPercentage: isUsage ? backend.usageFeeBps / 100 : undefined,
    evaluation: {
      price: backend.evaluationCreditPrice,
      discount: evalDiscount,
      limit: evalLimit,
    },
    limits: { properties, users },
    features,
    highlighted: known?.highlighted,
    badge: known?.badge,
  };
}

/**
 * Hook to get agency subscription plans.
 * Shows static fallback immediately; merges backend prices when available.
 */
export function useAgencyPlans() {
  const { plans: backendPlans, isLoading, error } = useSubscriptionPlans('AGENCY');

  const plans = useMemo<AgencyPlan[]>(() => {
    if (!backendPlans || backendPlans.length === 0) return AGENCY_PLANS;
    return backendPlans.map(mergeBackendIntoAgencyPlan);
  }, [backendPlans]);

  return { plans, isLoading, error };
}
