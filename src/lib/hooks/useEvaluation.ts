'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TenantEvaluation } from '@/lib/types/evaluation';
import type { RiskScore } from '@/lib/types/risk-score';

const STORAGE_KEY = 'leasefy_evaluation';

interface UseEvaluationResult {
  evaluation: TenantEvaluation | null;
  isLoading: boolean;
  isPaid: boolean;
  score: RiskScore | null;
  purchaseEvaluation: () => void;
}

/**
 * Hook for tenant self-service evaluation state.
 *
 * IMPORTANT: the real evaluation flow is initiated by landlords/agencies via
 * POST /evaluations/:applicationId (see use-agent.ts). Tenant self-service
 * evaluation is a planned feature that is NOT yet connected to the backend.
 *
 * Until then this hook:
 *   - Purges any legacy mock scores persisted by the old implementation.
 *   - Always returns evaluation=null / isPaid=false / score=null.
 *   - purchaseEvaluation() is a no-op that warns and does NOT persist anything.
 */
export function useEvaluation(): UseEvaluationResult {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Purge legacy mock data written by the previous Math.random() implementation.
    // Leaving stale fake scores in storage would make them render as real data.
    localStorage.removeItem(STORAGE_KEY);
    setIsLoading(false);
  }, []);

  const purchaseEvaluation = useCallback(() => {
    // Tenant self-service evaluation purchase is not yet wired to the backend.
    // The real evaluation is launched by landlords/agencies (POST /evaluations/:applicationId).
    // Follow-up: connect this CTA to GET /evaluations/me or equivalent tenant endpoint.
    console.warn(
      '[useEvaluation] purchaseEvaluation() is a no-op. ' +
      'Tenant self-service evaluation is not yet connected to the backend. ' +
      'No score was generated or persisted.'
    );
  }, []);

  const evaluation: TenantEvaluation | null = null;
  const score: RiskScore | null = null;

  return {
    evaluation,
    isLoading,
    isPaid: false,
    score,
    purchaseEvaluation,
  };
}
