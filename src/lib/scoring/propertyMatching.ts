/**
 * Tipos y helpers de UI para match de propiedades.
 *
 * La lógica de cómputo vive en `rent/agent` (smart-matching agent).
 * Estos tipos reflejan el shape que devuelve GET /recommendations.
 */

import type { Property } from '@/lib/types/property';

// ============================================================================
// Types (also used by QualificationResult consumers)
// ============================================================================

export type AcceptanceProbability = 'alta' | 'media' | 'baja';

export interface MatchFactor {
  score: number; // 0-100
  label: string;
}

export interface PropertyMatch {
  property: Property;
  matchScore: number; // 0-100
  acceptanceProbability: AcceptanceProbability;
  matchFactors: {
    affordability: MatchFactor;
    riskFit: MatchFactor;
    profileStrength: MatchFactor;
    preferences: MatchFactor;
  };
  recommendation: string;
}

/** Resultado de calificación de un inquilino para una propiedad (display only). */
export interface QualificationResult {
  qualifies: boolean;
  score: number; // 0-100
  reason?: string;
}

// ============================================================================
// UI Helpers (display only — no business logic)
// ============================================================================

export function getAcceptanceProbabilityLabel(probability: AcceptanceProbability): string {
  const labels: Record<AcceptanceProbability, string> = {
    alta: 'Alta probabilidad',
    media: 'Probabilidad media',
    baja: 'Baja probabilidad',
  };
  return labels[probability];
}

export function getAcceptanceProbabilityColors(probability: AcceptanceProbability): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<AcceptanceProbability, { bg: string; text: string; border: string }> = {
    alta: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
    media: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
    baja: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/20' },
  };
  return colors[probability];
}

export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 65) return 'text-blue-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export function getMatchScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 65) return 'bg-blue-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}
