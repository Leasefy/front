/**
 * Recommendations API service
 * Fetches personalized property recommendations from the backend
 */

import { apiClient } from '@/lib/api/client';
import type { Property } from '@/lib/types/property';
import type { AcceptanceProbability, MatchFactor } from '@/lib/scoring/propertyMatching';

// ============================================================================
// Backend Types
// ============================================================================

export interface BackendRecommendation {
  propertyId: string;
  property: Property;
  matchScore: number;
  acceptanceProbability: string;
  matchFactors?: {
    affordability?: { score: number; label: string };
    riskFit?: { score: number; label: string };
    profileStrength?: { score: number; label: string };
    preferences?: { score: number; label: string };
  };
  recommendation?: string;
}

export interface BackendRecommendationsResponse {
  recommendations: BackendRecommendation[];
}

// ============================================================================
// Mapped Type (matches PropertyMatch from propertyMatching.ts)
// ============================================================================

export interface RecommendedProperty {
  property: Property;
  matchScore: number;
  acceptanceProbability: AcceptanceProbability;
  matchFactors: {
    affordability: MatchFactor;
    riskFit: MatchFactor;
    profileStrength: MatchFactor;
    preferences: MatchFactor;
  };
  recommendation: string;
}

// ============================================================================
// Mapper
// ============================================================================

const DEFAULT_FACTOR: MatchFactor = { score: 0, label: 'N/A' };

function mapProbability(p: string): AcceptanceProbability {
  if (p === 'alta' || p === 'media' || p === 'baja') return p;
  if (p === 'high') return 'alta';
  if (p === 'medium') return 'media';
  return 'baja';
}

function mapRecommendation(r: BackendRecommendation): RecommendedProperty {
  return {
    property: r.property,
    matchScore: r.matchScore,
    acceptanceProbability: mapProbability(r.acceptanceProbability),
    matchFactors: {
      affordability: r.matchFactors?.affordability || DEFAULT_FACTOR,
      riskFit: r.matchFactors?.riskFit || DEFAULT_FACTOR,
      profileStrength: r.matchFactors?.profileStrength || DEFAULT_FACTOR,
      preferences: r.matchFactors?.preferences || DEFAULT_FACTOR,
    },
    recommendation: r.recommendation || '',
  };
}

// ============================================================================
// API Service
// ============================================================================

export const recommendationsApi = {
  /**
   * Get personalized recommendations for the current user
   */
  async getMine(limit?: number): Promise<RecommendedProperty[]> {
    const params = limit ? `?limit=${limit}` : '';
    const res = await apiClient.get<BackendRecommendationsResponse>(`/recommendations${params}`);
    return res.recommendations.map(mapRecommendation);
  },
};
