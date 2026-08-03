'use client';

/**
 * useAgencySubscription — reads the REAL agency subscription system
 * (`GET /inmobiliaria/subscription`), NOT the legacy per-user `/subscriptions/me`.
 * Use this for the agency plan/upgrade surfaces so "plan actual" reflects the
 * plan the agency actually pays for.
 */

import { useState, useEffect, useCallback } from 'react';
import { agencySubscriptionApi } from '@/lib/api/agency-subscription.service';
import type { AgencySubscriptionState } from '@/lib/api/agency-subscription.types';

type AgencyPlanIdLower = 'starter' | 'pro' | 'flex';

export function useAgencySubscription(enabled = true) {
  const [state, setState] = useState<AgencySubscriptionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const s = await agencySubscriptionApi.get();
      setState(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    // Only hit /inmobiliaria/subscription in the agency context — landlord/tenant
    // callers pass enabled=false so they don't fire a 401/403 request.
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    refetch();
  }, [enabled, refetch]);

  // Current tier as a lowercase plan id for the pricing UI. Only an ACTIVE
  // subscription counts as "on" that plan — a PAST_DUE/SUSPENDED PRO (selected
  // but not paid) is NOT effectively on PRO, so we surface STARTER and keep PRO
  // selectable to (re)pay. A brand-new agency with no row is an implicit free
  // STARTER. undefined while loading / on error so the UI highlights nothing.
  let currentPlanId: AgencyPlanIdLower | undefined;
  if (state) {
    const sub = state.subscription;
    currentPlanId =
      sub && sub.status === 'ACTIVE'
        ? (sub.planTier.toLowerCase() as AgencyPlanIdLower)
        : 'starter';
  }

  return { state, currentPlanId, isLoading, error, refetch };
}
