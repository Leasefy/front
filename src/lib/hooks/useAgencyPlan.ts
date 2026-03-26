'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AgencyPlanId } from '@/lib/types/subscription';
import { FEATURE_GATES, type FeatureName } from '@/lib/constants/feature-gates';

const STORAGE_KEY = 'leasefy_agency_plan';
const PLAN_TYPE_KEY = 'leasefy_agency_plan_type';

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

/** Human-readable plan names for upgrade prompts */
const PLAN_NAMES: Record<AgencyPlanId, string> = {
  starter: 'Starter',
  growth: 'Growth',
  'agency-business': 'Business',
  enterprise: 'Enterprise',
};

/**
 * Info returned when a feature is locked behind a higher plan.
 */
export interface UpgradeReason {
  requiredPlan: string;
  labelEs: string;
  labelEn: string;
}

/**
 * Hook for agency plan access checks.
 * Defaults to 'starter' (lowest tier) and 'flex' plan type.
 *
 * SECURITY: This is client-side only and NOT a security boundary.
 * Feature gating MUST be enforced server-side. This hook only controls
 * UI visibility — the backend must verify plan access on every API call.
 * TODO: Replace localStorage with authenticated API call to fetch plan.
 */
export function useAgencyPlan() {
  const [planId, setPlanId] = useState<AgencyPlanId>('starter');
  const [isFlexPlan, setIsFlexPlan] = useState<boolean>(true);

  useEffect(() => {
    const storedPlan = localStorage.getItem(STORAGE_KEY);
    if (storedPlan && storedPlan in PLAN_TIER) {
      setPlanId(storedPlan as AgencyPlanId);
    }

    const storedType = localStorage.getItem(PLAN_TYPE_KEY);
    if (storedType === 'flex' || storedType === 'subscription') {
      setIsFlexPlan(storedType === 'flex');
    }
    // Default is flex (true) when no stored value
  }, []);

  /**
   * Check if current plan meets the minimum required tier.
   * e.g., hasMinPlan('growth') returns true for growth, agency-business, enterprise
   */
  const hasMinPlan = (minPlan: AgencyPlanId): boolean => {
    return PLAN_TIER[planId] >= PLAN_TIER[minPlan];
  };

  /**
   * Check if a specific feature is accessible on the current plan.
   * Considers both the minimum tier requirement and the flexOnly flag.
   */
  const hasFeature = useCallback(
    (name: FeatureName): boolean => {
      const gate = FEATURE_GATES[name];
      if (!gate) return false;

      const meetsTier = PLAN_TIER[planId] >= PLAN_TIER[gate.minTier];
      if (!meetsTier) return false;

      // If feature is flex-only, user must be on a flex plan
      if (gate.flexOnly && !isFlexPlan) return false;

      return true;
    },
    [planId, isFlexPlan],
  );

  /**
   * Get upgrade info when a feature is locked.
   * Returns null if the feature is accessible, or the required plan details if locked.
   */
  const getUpgradeReason = useCallback(
    (name: FeatureName): UpgradeReason | null => {
      if (hasFeature(name)) return null;

      const gate = FEATURE_GATES[name];
      if (!gate) return null;

      // If the user meets the tier but needs flex, tell them about flex
      const meetsTier = PLAN_TIER[planId] >= PLAN_TIER[gate.minTier];
      if (meetsTier && gate.flexOnly && !isFlexPlan) {
        return {
          requiredPlan: `${PLAN_NAMES[gate.minTier]} Flex`,
          labelEs: gate.labelEs,
          labelEn: gate.labelEn,
        };
      }

      return {
        requiredPlan: PLAN_NAMES[gate.minTier],
        labelEs: gate.labelEs,
        labelEn: gate.labelEn,
      };
    },
    [hasFeature, planId, isFlexPlan],
  );

  /**
   * Set plan in localStorage for testing purposes.
   * In production this would be set by the backend after purchase.
   */
  const setPlan = useCallback(
    (newPlanId: AgencyPlanId, type: 'flex' | 'subscription') => {
      localStorage.setItem(STORAGE_KEY, newPlanId);
      localStorage.setItem(PLAN_TYPE_KEY, type);
      setPlanId(newPlanId);
      setIsFlexPlan(type === 'flex');
    },
    [],
  );

  return {
    /** Current plan identifier */
    planId,
    /** Whether current plan is flex (per-lease) vs subscription */
    isFlexPlan,
    /** Check if current plan meets a minimum tier */
    hasMinPlan,
    /** Check if a specific gated feature is accessible */
    hasFeature,
    /** Get upgrade prompt info for a locked feature (null if accessible) */
    getUpgradeReason,
    /** Set plan tier and type — for testing only */
    setPlan,
    /** Convenience: true if plan is Growth or higher */
    hasAdvancedReports: PLAN_TIER[planId] >= PLAN_TIER.growth,
  };
}
