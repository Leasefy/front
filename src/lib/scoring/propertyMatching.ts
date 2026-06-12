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
    alta: { bg: 'bg-[#2C7A53]/10', text: 'text-[#2C7A53]', border: 'border-[#2C7A53]/20' },
    media: { bg: 'bg-[#B7791F]/10', text: 'text-[#B7791F]', border: 'border-[#B7791F]/20' },
    baja: { bg: 'bg-[#C4503B]/10', text: 'text-[#C4503B]', border: 'border-[#C4503B]/20' },
  };
  return colors[probability];
}

export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-[#2C7A53]';
  if (score >= 65) return "text-neutral-600 dark:text-neutral-300";
  if (score >= 50) return 'text-[#B7791F]';
  return 'text-[#C4503B]';
}

export function getMatchScoreBgColor(score: number): string {
  if (score >= 80) return "bg-[#2C7A53]";
  if (score >= 65) return "bg-neutral-400";
  if (score >= 50) return "bg-[#B7791F]";
  return "bg-[#C4503B]";
}
