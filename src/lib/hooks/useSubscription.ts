/**
 * Hooks for subscription data
 */

import { useState, useEffect, useCallback } from 'react';
import { subscriptionsApi } from '@/lib/api/subscriptions.service';
import type { DisplaySubscription, BackendSubscriptionPlan } from '@/lib/api/subscriptions.types';
import type { PlanId } from '@/lib/types/subscription';

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
      // Default to free plan on error
      setSubscription({
        id: '',
        userId: '',
        planId: 'free',
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
