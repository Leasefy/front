/**
 * Property Matching System for Tenant Recommendations
 *
 * Calculates match scores considering:
 * - Affordability (40% weight)
 * - Risk compatibility (30% weight)
 * - Profile completeness (15% weight)
 * - Preference matching (15% weight)
 */

import type { Property, PropertyType } from '@/lib/types/property';
import type { TenantProfile, RiskLevel } from '@/lib/context/TenantProfileContext';

// ============================================================================
// Constants
// ============================================================================

const WEIGHTS = {
  affordability: 0.40,
  riskFit: 0.30,
  profileStrength: 0.15,
  preferences: 0.15,
} as const;

// Max rent should be 30% of available income
const MAX_RENT_RATIO = 0.30;
// Ideal rent is around 22% of available income
const IDEAL_RENT_RATIO = 0.22;

// ============================================================================
// Types
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

// ============================================================================
// Main Matching Functions
// ============================================================================

/**
 * Calculate match score for a single property
 */
export function calculatePropertyMatch(
  property: Property,
  profile: TenantProfile
): PropertyMatch {
  // Calculate individual factor scores
  const affordability = calculateAffordabilityScore(property, profile);
  const riskFit = calculateRiskFitScore(property, profile);
  const profileStrength = calculateProfileStrengthScore(profile);
  const preferences = calculatePreferencesScore(property, profile);

  // Calculate weighted total
  const matchScore = Math.round(
    affordability.score * WEIGHTS.affordability +
    riskFit.score * WEIGHTS.riskFit +
    profileStrength.score * WEIGHTS.profileStrength +
    preferences.score * WEIGHTS.preferences
  );

  // Determine acceptance probability
  const acceptanceProbability = getAcceptanceProbability(matchScore, profile.riskLevel);

  // Generate recommendation text
  const recommendation = generateRecommendation(matchScore, acceptanceProbability, profile);

  return {
    property,
    matchScore,
    acceptanceProbability,
    matchFactors: {
      affordability,
      riskFit,
      profileStrength,
      preferences,
    },
    recommendation,
  };
}

/**
 * Get recommended properties sorted by match score
 */
export function getRecommendedProperties(
  properties: Property[],
  profile: TenantProfile,
  limit?: number
): PropertyMatch[] {
  // Only consider available properties
  const availableProperties = properties.filter(p => p.status === 'available');

  // Calculate matches for all properties
  const matches = availableProperties.map(property =>
    calculatePropertyMatch(property, profile)
  );

  // Sort by match score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);

  // Filter to reasonable matches (above 40%)
  const viableMatches = matches.filter(m => m.matchScore >= 40);

  return limit ? viableMatches.slice(0, limit) : viableMatches;
}

/**
 * Get top match for "best option" highlighting
 */
export function getTopMatch(
  properties: Property[],
  profile: TenantProfile
): PropertyMatch | null {
  const matches = getRecommendedProperties(properties, profile, 1);
  return matches[0] || null;
}

// ============================================================================
// Individual Factor Calculations
// ============================================================================

/**
 * Calculate affordability score (0-100)
 * Based on rent/income ratio
 */
function calculateAffordabilityScore(
  property: Property,
  profile: TenantProfile
): MatchFactor {
  const totalRent = property.monthlyRent + property.adminFee;
  const available = profile.availableForRent;

  // If no income data, return neutral score
  if (available <= 0) {
    return { score: 50, label: 'Sin datos de ingresos' };
  }

  const ratio = totalRent / available;

  // Can't afford at all
  if (ratio > MAX_RENT_RATIO) {
    const overage = Math.round((ratio - MAX_RENT_RATIO) * 100);
    return {
      score: Math.max(0, 50 - overage * 2),
      label: `Supera presupuesto en ${overage}%`,
    };
  }

  // Perfect zone (around ideal ratio)
  if (ratio >= 0.18 && ratio <= 0.25) {
    return { score: 100, label: 'Rango ideal de pago' };
  }

  // Below ideal (very affordable)
  if (ratio < 0.18) {
    return { score: 90, label: 'Muy asequible' };
  }

  // Between ideal and max
  const distanceFromIdeal = Math.abs(ratio - IDEAL_RENT_RATIO);
  const score = Math.round(100 - distanceFromIdeal * 200);

  if (ratio > 0.25 && ratio <= 0.28) {
    return { score: Math.max(70, score), label: 'Dentro del presupuesto' };
  }

  return { score: Math.max(60, score), label: 'Limite de presupuesto' };
}

/**
 * Calculate risk fit score (0-100)
 * Based on tenant's risk level and property price tier
 */
function calculateRiskFitScore(
  property: Property,
  profile: TenantProfile
): MatchFactor {
  const riskLevel = profile.riskLevel;

  // If no risk level, return neutral
  if (!riskLevel) {
    return { score: 70, label: 'Perfil no evaluado' };
  }

  // Determine property price tier (based on Colombian market)
  const totalRent = property.monthlyRent + property.adminFee;
  const tier = getPriceTier(totalRent);

  // Risk compatibility matrix
  const compatibility: Record<RiskLevel, Record<string, number>> = {
    A: { premium: 100, high: 100, medium: 100, economy: 100 },
    B: { premium: 85, high: 95, medium: 100, economy: 100 },
    C: { premium: 50, high: 70, medium: 90, economy: 100 },
    D: { premium: 20, high: 40, medium: 60, economy: 80 },
  };

  const score = compatibility[riskLevel][tier];
  const labels: Record<RiskLevel, string> = {
    A: 'Perfil excelente',
    B: 'Perfil bueno',
    C: 'Perfil moderado',
    D: 'Considera garantias adicionales',
  };

  return { score, label: labels[riskLevel] };
}

/**
 * Calculate profile strength score (0-100)
 * Based on documentation and employment stability
 */
function calculateProfileStrengthScore(profile: TenantProfile): MatchFactor {
  let score = 0;

  // Documentation (40 points max)
  if (profile.hasIdDocument) score += 10;
  if (profile.hasIncomeProof) score += 15;
  if (profile.hasEmploymentLetter) score += 10;
  if (profile.hasBankStatements) score += 5;

  // Employment stability (40 points max)
  if (profile.contractType === 'indefinite') score += 20;
  else if (profile.contractType === 'fixed-term') score += 10;
  else if (profile.contractType === 'contractor') score += 5;

  const timeAtJob = profile.timeAtJob || 0;
  if (timeAtJob >= 24) score += 20;
  else if (timeAtJob >= 12) score += 15;
  else if (timeAtJob >= 6) score += 10;
  else score += 5;

  // Income documentation (20 points max)
  if (profile.totalIncome > 0) score += 10;
  if (profile.additionalIncome > 0) score += 5;
  if (profile.monthlyObligations < profile.totalIncome * 0.4) score += 5;

  // Cap at 100
  score = Math.min(100, score);

  // Generate label
  let label: string;
  if (score >= 80) label = 'Perfil completo';
  else if (score >= 60) label = 'Documentacion parcial';
  else label = 'Falta documentacion';

  return { score, label };
}

/**
 * Calculate preferences match score (0-100)
 */
function calculatePreferencesScore(
  property: Property,
  profile: TenantProfile
): MatchFactor {
  let score = 70; // Base score
  const matches: string[] = [];

  // City preference
  if (profile.preferredCities.length > 0) {
    if (profile.preferredCities.includes(property.city)) {
      score += 15;
      matches.push('ciudad');
    } else {
      score -= 10;
    }
  } else {
    score += 5; // Neutral bonus
  }

  // Bedrooms preference
  if (profile.preferredBedrooms !== null) {
    const diff = Math.abs(profile.preferredBedrooms - property.bedrooms);
    if (diff === 0) {
      score += 10;
      matches.push('habitaciones');
    } else if (diff === 1) {
      score += 5;
    } else {
      score -= 5;
    }
  }

  // Property type preference
  if (profile.preferredPropertyTypes.length > 0) {
    if (profile.preferredPropertyTypes.includes(property.type)) {
      score += 5;
      matches.push('tipo');
    } else {
      score -= 5;
    }
  }

  // Cap score
  score = Math.min(100, Math.max(0, score));

  // Generate label
  let label: string;
  if (matches.length >= 2) label = 'Coincide con preferencias';
  else if (matches.length === 1) label = `Coincide: ${matches[0]}`;
  else if (score >= 70) label = 'Compatible';
  else label = 'Fuera de preferencias';

  return { score, label };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get price tier based on monthly rent (Colombian market)
 */
function getPriceTier(totalRent: number): string {
  if (totalRent >= 5000000) return 'premium';    // $5M+ COP
  if (totalRent >= 3000000) return 'high';       // $3M-5M COP
  if (totalRent >= 1500000) return 'medium';     // $1.5M-3M COP
  return 'economy';                               // < $1.5M COP
}

/**
 * Determine acceptance probability from match score and risk level
 */
export function getAcceptanceProbability(
  matchScore: number,
  riskLevel?: RiskLevel
): AcceptanceProbability {
  // Risk level adjustment
  const riskPenalty: Record<RiskLevel, number> = {
    A: 0,
    B: 5,
    C: 15,
    D: 25,
  };

  const adjustedScore = matchScore - (riskLevel ? riskPenalty[riskLevel] : 10);

  if (adjustedScore >= 75) return 'alta';
  if (adjustedScore >= 55) return 'media';
  return 'baja';
}

/**
 * Generate recommendation text
 */
function generateRecommendation(
  matchScore: number,
  probability: AcceptanceProbability,
  profile: TenantProfile
): string {
  const riskLevel = profile.riskLevel || 'B';

  if (matchScore >= 85) {
    return 'Excelente opcion para tu perfil';
  }

  if (matchScore >= 70) {
    if (probability === 'alta') {
      return 'Muy buena opcion, alta probabilidad de aceptacion';
    }
    return 'Buena opcion para aplicar';
  }

  if (matchScore >= 55) {
    if (riskLevel === 'C' || riskLevel === 'D') {
      return 'Considera agregar codeudor para mejorar chances';
    }
    return 'Opcion viable, revisa los requisitos';
  }

  if (matchScore >= 40) {
    return 'Puede requerir garantias adicionales';
  }

  return 'Fuera de tu presupuesto actual';
}

/**
 * Get acceptance probability label in Spanish
 */
export function getAcceptanceProbabilityLabel(probability: AcceptanceProbability): string {
  const labels: Record<AcceptanceProbability, string> = {
    alta: 'Alta probabilidad',
    media: 'Probabilidad media',
    baja: 'Baja probabilidad',
  };
  return labels[probability];
}

/**
 * Get color classes for acceptance probability
 */
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

/**
 * Get match score color
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 65) return 'text-blue-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

/**
 * Get match score background for badge
 */
export function getMatchScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 65) return 'bg-blue-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}
