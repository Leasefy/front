'use client';

import { useState, useEffect } from 'react';
import type { AgencyPlanId } from '@/lib/types/subscription';

const STORAGE_KEY = 'leasefy_agency_plan';

/**
 * Agency plan tiers ordered by level.
 * Used to check if current plan meets minimum tier requirements.
 */
const PLAN_TIER: Record<AgencyPlanId, number> = {
  starter: 0,
  growth: 1,
  'agency-business': 2,
  enterprise: 3,
};

/**
 * Hook for agency plan access checks.
 * Defaults to 'starter' (lowest tier) — in production, replace with API call.
 */
export function useAgencyPlan() {
  const [planId, setPlanId] = useState<AgencyPlanId>('starter');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in PLAN_TIER) {
      setPlanId(stored as AgencyPlanId);
    }
  }, []);

  /**
   * Check if current plan meets the minimum required tier.
   * e.g., hasMinPlan('growth') returns true for growth, agency-business, enterprise
   */
  const hasMinPlan = (minPlan: AgencyPlanId): boolean => {
    return PLAN_TIER[planId] >= PLAN_TIER[minPlan];
  };

  return {
    planId,
    hasMinPlan,
    /** Convenience: true if plan is Growth or higher */
    hasAdvancedReports: PLAN_TIER[planId] >= PLAN_TIER.growth,
  };
}
