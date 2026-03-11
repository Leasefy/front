/**
 * Recommendations hook
 * Tries backend API first, falls back to client-side scoring
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { recommendationsApi } from '@/lib/api/recommendations.service';
import type { RecommendedProperty } from '@/lib/api/recommendations.service';
import type { PropertyMatch } from '@/lib/scoring/propertyMatching';

interface UseRecommendationsReturn {
  recommendations: (RecommendedProperty | PropertyMatch)[];
  isLoading: boolean;
  error: string | null;
  source: 'api' | 'client' | null;
  refetch: () => Promise<void>;
}

export function useRecommendations(limit: number = 6): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<(RecommendedProperty | PropertyMatch)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'api' | 'client' | null>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await recommendationsApi.getMine(limit);
      setRecommendations(data);
      setSource('api');
    } catch {
      // API failed — component should fall back to client-side scoring
      setSource('client');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    isLoading,
    error,
    source,
    refetch: fetchRecommendations,
  };
}
