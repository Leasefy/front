'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AgencyPlanId } from '@/lib/types/subscription';
import { FEATURE_GATES, type FeatureName } from '@/lib/constants/feature-gates';
import { getAgencyPlanById, getEvaluationPrice as getEvalPrice } from '@/lib/constants/subscription-plans';

const STORAGE_KEY = 'leasefy_agency_plan';

/**
 * Agency plan tiers ordered by level.
 * Used to check if current plan meets minimum tier requirements.
 */
const PLAN_TIER: Record<AgencyPlanId, number> = {
  starter: 0,
  pro: 1,
  flex: 2,
  enterprise: 3,
};

/** Human-readable plan names for upgrade prompts */
const PLAN_NAMES: Record<AgencyPlanId, string> = {
  starter: 'Starter',
  pro: 'Pro',
  flex: 'Flex',
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

/** Agents available per plan tier */
const PLAN_AGENTS: Record<AgencyPlanId, string[]> = {
  starter: ['tenant-scoring'], // Pay-per-use only
  pro: ['tenant-scoring', 'smart-matching'],
  flex: 'all' as unknown as string[], // All 19 agents — use canUseAgent() for checks
  enterprise: 'all' as unknown as string[],
};

/**
 * Hook for agency plan access checks.
 * Defaults to 'flex' (recommended tier for demo).
 *
 * SECURITY: This is client-side only and NOT a security boundary.
 * Feature gating MUST be enforced server-side. This hook only controls
 * UI visibility — the backend must verify plan access on every API call.
 * TODO: Replace localStorage with authenticated API call to fetch plan.
 */
export function useAgencyPlan() {
  const [planId, setPlanId] = useState<AgencyPlanId>('flex');

  useEffect(() => {
    const storedPlan = localStorage.getItem(STORAGE_KEY);
    if (storedPlan && storedPlan in PLAN_TIER) {
      setPlanId(storedPlan as AgencyPlanId);
    }
  }, []);

  /**
   * Check if current plan meets the minimum required tier.
   * e.g., hasMinPlan('pro') returns true for pro, flex, enterprise
   */
  const hasMinPlan = (minPlan: AgencyPlanId): boolean => {
    return PLAN_TIER[planId] >= PLAN_TIER[minPlan];
  };

  /**
   * Whether the current plan is the Flex (percentage-based) tier.
   */
  const isFlexPlan = planId === 'flex';

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

      // If feature is flex-only, user must be on flex or enterprise
      if (gate.flexOnly && PLAN_TIER[planId] < PLAN_TIER['flex']) return false;

      return true;
    },
    [planId],
  );

  /**
   * Get the per-evaluation price in COP for the current plan.
   */
  const getEvaluationPrice = useCallback((): number => {
    return getEvalPrice(planId);
  }, [planId]);

  /**
   * Check if the current plan can use a specific AI agent.
   * Starter: only tenant-scoring (pay-per-use).
   * Pro: tenant-scoring + smart-matching (limited evals).
   * Flex/Enterprise: all 19 agents (unlimited).
   */
  const canUseAgent = useCallback(
    (agentId: string): boolean => {
      // Flex and Enterprise have access to all agents
      if (PLAN_TIER[planId] >= PLAN_TIER['flex']) return true;

      const agents = PLAN_AGENTS[planId];
      if (Array.isArray(agents)) {
        return agents.includes(agentId);
      }
      return true;
    },
    [planId],
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

      return {
        requiredPlan: PLAN_NAMES[gate.minTier],
        labelEs: gate.labelEs,
        labelEn: gate.labelEn,
      };
    },
    [hasFeature],
  );

  /**
   * Set plan in localStorage for testing purposes.
   * In production this would be set by the backend after purchase.
   */
  const setPlan = useCallback(
    (newPlanId: AgencyPlanId) => {
      localStorage.setItem(STORAGE_KEY, newPlanId);
      setPlanId(newPlanId);
    },
    [],
  );

  return {
    /** Current plan identifier */
    planId,
    /** Whether current plan is Flex (percentage-based) */
    isFlexPlan,
    /** Check if current plan meets a minimum tier */
    hasMinPlan,
    /** Check if a specific gated feature is accessible */
    hasFeature,
    /** Get the per-evaluation AI price in COP for current plan */
    getEvaluationPrice,
    /** Check if current plan can use a specific AI agent by ID */
    canUseAgent,
    /** Get upgrade prompt info for a locked feature (null if accessible) */
    getUpgradeReason,
    /** Set plan tier — for testing only */
    setPlan,
    /** Convenience: true if plan is Pro or higher */
    hasAdvancedReports: PLAN_TIER[planId] >= PLAN_TIER.pro,
    /** Full plan details from constants */
    planDetails: getAgencyPlanById(planId),
  };
}
