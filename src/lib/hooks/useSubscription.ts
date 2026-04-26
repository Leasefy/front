/**
 * Hooks for subscription data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscriptionsApi } from '@/lib/api/subscriptions.service';
import type { DisplaySubscription, BackendSubscriptionPlan } from '@/lib/api/subscriptions.types';
import type { PlanId, AgencyPlan } from '@/lib/types/subscription';
import { AGENCY_PLANS } from '@/lib/constants/subscription-plans';

/**
 * Hook to get the current user's subscription
 * Returns the subscription (defaults to free plan on error)
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
      setError(err instanceof Error ? err.message : 'Error al cargar suscripcion');
      // Default to base tier on error
      setSubscription({
        id: '',
        userId: '',
        planId: 'starter',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
      });
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

function mergeBackendIntoAgencyPlan(backend: BackendSubscriptionPlan): AgencyPlan {
  const staticPlan = AGENCY_PLANS.find(p => p.id === backend.tier?.toLowerCase()) ?? AGENCY_PLANS[0];
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
