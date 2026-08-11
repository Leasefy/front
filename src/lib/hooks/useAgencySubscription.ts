'use client';

/**
 * useAgencySubscription — reads the REAL agency subscription system
 * (`GET /inmobiliaria/subscription`), NOT the legacy per-user `/subscriptions/me`.
 * Use this for the agency plan/upgrade surfaces so "plan actual" reflects the
 * plan the agency actually pays for.
 *
 * It also resolves the current plan against the AGENCY plan catalog
 * (`GET /subscription-plans?planType=AGENCY`) so callers can tell whether the
 * agency is on a PAID plan without branching on a tier NAME: "paid" = the plan
 * is not the free/default plan (`isDefault === false`). This keeps admin-created
 * slugs (contrato 29 · planes dinámicos) working — e.g. an ACTIVE agency on
 * `pro-plus` is paid even though `pro-plus` is not a legacy tier name.
 */

import { useState, useEffect, useCallback } from 'react';
import { agencySubscriptionApi } from '@/lib/api/agency-subscription.service';
import { subscriptionsApi } from '@/lib/api/subscriptions.service';
import type { AgencySubscriptionState } from '@/lib/api/agency-subscription.types';
import type { BackendSubscriptionPlan } from '@/lib/api/subscriptions.types';

// slug libre admin-creatable, ver contrato 29
type AgencyPlanIdLower = string;

export function useAgencySubscription(enabled = true) {
  const [state, setState] = useState<AgencySubscriptionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [plans, setPlans] = useState<BackendSubscriptionPlan[] | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<Error | null>(null);

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

  // Load the AGENCY plan catalog so "paid" can be derived from the plan's
  // isDefault flag instead of a hardcoded tier name (contrato 29). Public
  // endpoint; failures/loading are surfaced so the guard can fail OPEN.
  useEffect(() => {
    if (!enabled) {
      setPlansLoading(false);
      return;
    }
    let cancelled = false;
    setPlansLoading(true);
    subscriptionsApi
      .getPlans('AGENCY')
      .then((p) => {
        if (!cancelled) {
          setPlans(p);
          setPlansError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setPlansError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Current tier as a lowercase plan id for the pricing UI. Only an ACTIVE
  // subscription counts as "on" that plan — a PAST_DUE/SUSPENDED plan (selected
  // but not paid) is NOT effectively active, so we surface STARTER and keep the
  // paid plan selectable to (re)pay. A brand-new agency with no row is an
  // implicit free STARTER. undefined while loading / on error so the UI
  // highlights nothing.
  let currentPlanId: AgencyPlanIdLower | undefined;
  if (state) {
    const sub = state.subscription;
    currentPlanId =
      sub && sub.status === 'ACTIVE'
        ? (sub.planTier.toLowerCase() as AgencyPlanIdLower)
        : 'starter';
  }

  // Resolve the current plan against the catalog by slug (case-insensitive).
  const currentPlan: BackendSubscriptionPlan | null =
    currentPlanId && plans
      ? plans.find((p) => p.tier.toLowerCase() === currentPlanId) ?? null
      : null;

  // "Paid" = resolved plan is NOT the free/default plan. Never derived from a
  // tier NAME. When the plan can't be resolved yet, this is false — but the
  // guard treats catalog loading/errors as `indeterminate` (below), so a
  // transient failure never bounces a paying agency. Used for upsell UI (e.g.
  // the "subí de plan" CTA), NOT for panel access.
  const isPaidPlan = currentPlan ? !currentPlan.isDefault : false;

  // Panel access is governed by CAPS (backend), not by paid-vs-free: any active
  // agency — INCLUDING the free/default plan — may use the panel, and the plan's
  // caps (maxProperties/maxUsers/monthlyEvalCap) throttle usage. Only a SUSPENDED
  // or CANCELLED subscription (dunning) loses access. A brand-new agency with no
  // row is an implicit free plan → access. Mirrors the backend policy after the
  // free-plan-access change (see back handoff · planes-caps-y-acceso-gratis).
  const subscriptionStatus = state?.subscription?.status ?? null;
  const hasPanelAccess =
    subscriptionStatus !== 'SUSPENDED' && subscriptionStatus !== 'CANCELLED';

  // Fail-OPEN signal: while the subscription OR the plan catalog is still
  // loading/errored, or the tier is unknown, the paid/free verdict is not
  // trustworthy — callers must passthrough (never bounce a paying agency).
  const indeterminate =
    isLoading || !!error || currentPlanId === undefined || plansLoading || !!plansError;

  return {
    state,
    currentPlanId,
    currentPlan,
    isPaidPlan,
    subscriptionStatus,
    hasPanelAccess,
    indeterminate,
    isLoading,
    error,
    plans,
    plansLoading,
    plansError,
    refetch,
  };
}
