/**
 * Recommendations API service
 * Fetches personalized property recommendations from the backend
 */

import { apiClient } from '@/lib/api/client';
import type { Property } from '@/lib/types/property';
import type { BackendProperty, PaginatedResponse } from '@/lib/api/properties.types';
import { mapBackendProperty } from '@/lib/api/properties.mapper';
import type { AcceptanceProbability, MatchFactor } from '@/lib/scoring/propertyMatching';

// ============================================================================
// Backend Types
// ============================================================================

/**
 * Lo que `GET /recommendations` devuelve DE VERDAD (back-erp
 * `RecommendationsService.getRecommendations`): una página `{ data, meta }`
 * donde cada fila es el inmueble del listado público, APLANADO, con el puntaje
 * encima — no `{ recommendations: [{ property, … }] }`.
 *
 * 🔴 Este archivo esperaba la segunda forma: `res.recommendations` llegaba
 * `undefined`, el `.map` tiraba un TypeError y /inquilino/para-ti mostraba
 * «No pudimos cargar esto» con referencia SER- (un error sin status) a todo el
 * que entraba (Nico, 2026-09-15). Y aunque la forma hubiera cuadrado, el
 * inmueble viene con las fotos como `{ url, order }`: sin `mapBackendProperty`
 * las tarjetas no tenían portada.
 */
export type BackendRecommendation = BackendProperty & {
  matchScore: number;
  acceptanceProbability: string;
  matchFactors?: {
    affordability?: { score: number; label: string };
    riskFit?: { score: number; label: string };
    profileStrength?: { score: number; label: string };
    preferences?: { score: number; label: string };
  };
  recommendation?: string;
};

export type BackendRecommendationsResponse = PaginatedResponse<BackendRecommendation>;

/** Tope del DTO del back (`@Max(50)`): pedir más es un 400. */
export const MAX_RECOMENDACIONES = 50;

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

export function mapRecommendation(r: BackendRecommendation): RecommendedProperty {
  return {
    property: mapBackendProperty(r),
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
  async getMine(limit: number = MAX_RECOMENDACIONES): Promise<RecommendedProperty[]> {
    // Sin límite el back devuelve 9: el catálogo pagina del lado del cliente,
    // así que se pide el máximo que el back acepta.
    const tope = Math.min(Math.max(1, limit), MAX_RECOMENDACIONES);
    const res = await apiClient.get<BackendRecommendationsResponse>(`/recommendations?limit=${tope}`);
    return res.data.map(mapRecommendation);
  },
};
