'use client';

import { useCallback } from 'react';
import type { FeatureName } from '@/lib/constants/feature-gates';
import { getAgencyPlanById, getEvaluationPrice as getEvalPrice } from '@/lib/constants/subscription-plans';

/**
 * Info returned when a feature is locked behind a higher plan.
 */
export interface UpgradeReason {
  requiredPlan: string;
  labelEs: string;
  labelEn: string;
}

/**
 * Hook for agency plan access checks (UI visibility only).
 *
 * SECURITY: This is client-side only and NOT a security boundary. Feature
 * gating for the agency panel is enforced SERVER-SIDE (contrato 29 · planes
 * dinámicos). This hook is intentionally PERMISSIVE — it grants every gated
 * feature so the panel never hides a paid feature behind a client-side tier
 * check. Do NOT reintroduce tier-name Records (PLAN_TIER/PLAN_NAMES/PLAN_AGENTS)
 * or ordinal comparisons here; the closed tier set no longer exists (slugs are
 * admin-creatable). Any real gating must be added on the backend.
 */
export function useAgencyPlan() {
  // Every check below is permissive (grants access). Kept as functions with the
  // original signatures so existing callers stay source-compatible.
  const hasMinPlan = useCallback((_minPlan?: string): boolean => true, []);
  const hasFeature = useCallback((_name: FeatureName): boolean => true, []);
  const canUseAgent = useCallback((_agentId: string): boolean => true, []);
  const getUpgradeReason = useCallback((_name: FeatureName): UpgradeReason | null => null, []);

  // Presentation defaults: the panel treats the agency as fully enabled, so the
  // evaluation price / plan details mirror the top (percentage) plan. These are
  // constant lookups, not tier-name branching.
  const getEvaluationPrice = useCallback((): number => getEvalPrice('flex'), []);

  return {
    /** Whether the current plan is treated as the percentage (Flex) tier. */
    isFlexPlan: true,
    /** Check if current plan meets a minimum tier (always true — UI permissive). */
    hasMinPlan,
    /** Check if a specific gated feature is accessible (always true — UI permissive). */
    hasFeature,
    /** Get the per-evaluation AI price in COP for the current plan. */
    getEvaluationPrice,
    /** Check if current plan can use a specific AI agent (always true — UI permissive). */
    canUseAgent,
    /** Get upgrade prompt info for a locked feature (always null — nothing locked in UI). */
    getUpgradeReason,
    /** Convenience: advanced reports are always visible in the UI. */
    hasAdvancedReports: true,
    /** Full plan details for presentation (top/percentage plan). */
    planDetails: getAgencyPlanById('flex'),
  };
}
