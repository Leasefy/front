/**
 * Hooks for subscription data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscriptionsApi } from '@/lib/api/subscriptions.service';
import type { DisplaySubscription, BackendSubscriptionPlan } from '@/lib/api/subscriptions.types';
import type { PlanId, AgencyPlan } from '@/lib/types/subscription';
import { AGENCY_PLANS } from '@/lib/constants/subscription-plans';

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
 * Un plan que el back tiene y el front no conoce (hoy: `pro-plus`, `ultra`).
 *
 * ⚠️ Antes esto caía a `AGENCY_PLANS[0]` —Starter— y la tarjeta resultante
 * MENTÍA: se quedaba con el nombre, la descripción, las features Y EL ID de
 * Starter, conservando sólo el precio del back. En pantalla salía
 * «STARTER · 999.000/mes · Scoring básico · Dashboard limitado»: las features
 * del plan gratis al precio del más caro.
 *
 * Y como los tres compartían `id: 'starter'`, el
 * `selected={plan.id === currentPlanId}` de `PricingTable` encendía
 * «SELECCIONADO» en las tres tarjetas a la vez.
 *
 * Un plan desconocido se arma ahora con lo que el back SÍ manda —nombre,
 * precio, límites— y sin features. Una tarjeta escueta es mejor que una que
 * promete lo que no incluye.
 */
function planDesconocido(backend: BackendSubscriptionPlan): AgencyPlan {
  return {
    id: backend.tier?.toLowerCase() as AgencyPlan['id'],
    name: backend.name,
    description: '',
    pricingModel: 'flat',
    price: { monthly: backend.monthlyPrice, yearly: backend.annualPrice },
    evaluation: {
      price: backend.evaluationCreditPrice ?? 0,
      discount: 0,
      limit: null,
    },
    limits: {
      properties: backend.maxProperties === -1 ? null : backend.maxProperties,
      users: null,
    },
    features: [],
  };
}

/** Exportada para poder probarla: es pura y es donde vivía el defecto. */
export function mergeBackendIntoAgencyPlan(
  backend: BackendSubscriptionPlan,
): AgencyPlan {
  const staticPlan = AGENCY_PLANS.find(
    (p) => p.id === backend.tier?.toLowerCase(),
  );
  // Sin plan estático que corresponda, NO se disfraza de otro.
  if (!staticPlan) return planDesconocido(backend);
  return {
    ...staticPlan,
    price: {
      monthly: backend.monthlyPrice > 0 ? backend.monthlyPrice : staticPlan.price.monthly,
      yearly: backend.annualPrice > 0 ? backend.annualPrice : staticPlan.price.yearly,
    },
    evaluation: {
      ...staticPlan.evaluation,
      price: backend.evaluationCreditPrice ?? staticPlan.evaluation.price,
    },
    limits: {
      properties: backend.maxProperties === -1 ? null : (backend.maxProperties > 0 ? backend.maxProperties : staticPlan.limits.properties),
      users: staticPlan.limits.users,
    },
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
