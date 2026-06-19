/**
 * Risk level constants and utilities
 * Central configuration for risk level colors, labels, and conversions
 */

import type { RiskLevel } from '@/lib/types/risk-score';

// ============================================================================
// Color Configuration
// ============================================================================

/**
 * Tailwind color classes for each risk level
 * Designed to work with Luxterra aesthetic (muted, professional)
 */
export const RISK_LEVEL_COLORS = {
  A: {
    bg: 'bg-risk-a',
    bgLight: 'bg-risk-a/10',
    bgMuted: 'bg-risk-a/10',
    text: 'text-risk-a',
    textLight: 'text-risk-a',
    border: 'border-risk-a/30',
    ring: 'ring-risk-a',
  },
  B: {
    bg: 'bg-risk-b',
    bgLight: 'bg-risk-b/10',
    bgMuted: 'bg-risk-b/10',
    text: 'text-risk-b',
    textLight: 'text-risk-b',
    border: 'border-risk-b/30',
    ring: 'ring-risk-b',
  },
  C: {
    bg: 'bg-risk-c',
    bgLight: 'bg-risk-c/10',
    bgMuted: 'bg-risk-c/10',
    text: 'text-risk-c',
    textLight: 'text-risk-c',
    border: 'border-risk-c/30',
    ring: 'ring-risk-c',
  },
  D: {
    bg: 'bg-risk-d',
    bgLight: 'bg-risk-d/10',
    bgMuted: 'bg-risk-d/10',
    text: 'text-risk-d',
    textLight: 'text-risk-d',
    border: 'border-risk-d/30',
    ring: 'ring-risk-d',
  },
} as const;

// ============================================================================
// Badge Variant Mapping
// ============================================================================

/**
 * Maps risk levels to badge component variants
 * Matches the risk-a, risk-b, risk-c, risk-d variants in badge.tsx
 */
export const RISK_LEVEL_BADGE_VARIANTS = {
  A: 'risk-a',
  B: 'risk-b',
  C: 'risk-c',
  D: 'risk-d',
} as const;

// ============================================================================
// Labels and Descriptions
// ============================================================================

/**
 * Human-readable labels for risk levels
 */
export const RISK_LEVEL_LABELS = {
  A: 'Excelente',
  B: 'Bueno',
  C: 'Regular',
  D: 'Riesgoso',
} as const;

/**
 * Detailed descriptions for each level
 */
export const RISK_LEVEL_DESCRIPTIONS = {
  A: 'Perfil muy confiable. Cumple con todos los criterios de evaluacion y presenta un historial solido.',
  B: 'Buen perfil en general. Cumple con la mayoria de criterios con algunos aspectos menores a considerar.',
  C: 'Perfil con factores mixtos. Recomendamos revisar las condiciones sugeridas antes de proceder.',
  D: 'Perfil con factores de riesgo significativos. Considere requerir garantias adicionales.',
} as const;

/**
 * Short recommendations for landlords
 */
export const RISK_LEVEL_RECOMMENDATIONS = {
  A: 'Puede proceder con confianza. Condiciones estandar recomendadas.',
  B: 'Perfil solido. Verifique las referencias para mayor seguridad.',
  C: 'Considere deposito adicional o codeudor. Revise las condiciones sugeridas.',
  D: 'Recomendamos firmemente requerir codeudor y garantias adicionales.',
} as const;

// ============================================================================
// Score Thresholds
// ============================================================================

/**
 * Minimum numeric score for each level
 */
export const RISK_LEVEL_THRESHOLDS = {
  A: 85,
  B: 70,
  C: 50,
  D: 0,
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert numeric score to risk level
 */
export function getScoreLevel(score: number): RiskLevel {
  if (score >= RISK_LEVEL_THRESHOLDS.A) return 'A';
  if (score >= RISK_LEVEL_THRESHOLDS.B) return 'B';
  if (score >= RISK_LEVEL_THRESHOLDS.C) return 'C';
  return 'D';
}

/**
 * Get all color classes for a risk level
 */
export function getRiskColors(level: RiskLevel) {
  return RISK_LEVEL_COLORS[level];
}

/**
 * Get badge variant for a risk level
 */
export function getBadgeVariant(level: RiskLevel) {
  return RISK_LEVEL_BADGE_VARIANTS[level];
}

/**
 * Get label for a risk level
 */
export function getRiskLabel(level: RiskLevel) {
  return RISK_LEVEL_LABELS[level];
}

/**
 * Get description for a risk level
 */
export function getRiskDescription(level: RiskLevel) {
  return RISK_LEVEL_DESCRIPTIONS[level];
}

/**
 * Get recommendation for a risk level
 */
export function getRiskRecommendation(level: RiskLevel) {
  return RISK_LEVEL_RECOMMENDATIONS[level];
}

/**
 * Check if a risk level is considered safe (A or B)
 */
export function isSafeRiskLevel(level: RiskLevel): boolean {
  return level === 'A' || level === 'B';
}

/**
 * Check if a risk level requires extra attention (C or D)
 */
export function requiresAttention(level: RiskLevel): boolean {
  return level === 'C' || level === 'D';
}

/**
 * Get severity indicator text based on flag severity
 */
export function getSeverityIndicator(severity: 'low' | 'medium' | 'high') {
  const indicators = {
    low: { label: 'Menor', color: 'text-muted-foreground' },
    medium: { label: 'Moderado', color: 'text-[#B7791F]' },
    high: { label: 'Importante', color: 'text-[#C4503B]' },
  };
  return indicators[severity];
}
