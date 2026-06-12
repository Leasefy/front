'use client';

import { useState, useEffect, useCallback } from 'react';
import { recommendationsApi, type RecommendedProperty } from '@/lib/api/recommendations.service';

interface UseRecommendationsReturn {
  recommendations: RecommendedProperty[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRecommendations(limit?: number): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<RecommendedProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await recommendationsApi.getMine(limit);
      setRecommendations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar recomendaciones');
      setRecommendations([]);
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
    refetch: fetchRecommendations,
  };
}
