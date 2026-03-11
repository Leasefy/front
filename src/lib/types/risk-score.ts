/**
 * Risk score types for tenant evaluation
 * Used throughout the risk score display and landlord dashboard
 */

// ============================================================================
// Risk Level Types
// ============================================================================

/**
 * Risk level grades: A (excellent) through D (high risk)
 */
export type RiskLevel = 'A' | 'B' | 'C' | 'D';

// ============================================================================
// Score Components
// ============================================================================

/**
 * Individual category score (0-100)
 * Each category contributes to the overall score based on its weight
 */
export interface ScoreCategory {
  name: string;
  label: string;
  score: number; // 0-100
  weight: number; // Percentage weight (0-1)
  factors: string[]; // Contributing factors to this category
}

/**
 * Risk flags - warnings about potential concerns
 * Written in professional, non-alarmist tone
 */
export interface RiskFlag {
  id: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
}

/**
 * Suggested conditions based on profile assessment
 * Recommendations the landlord might consider
 */
export interface SuggestedCondition {
  id: string;
  condition: string;
  reason: string;
}

// ============================================================================
// Full Risk Score
// ============================================================================

/**
 * Complete risk score with all assessment components
 */
export interface RiskScore {
  /** Overall risk grade */
  level: RiskLevel;
  /** Numeric score 0-100 */
  numericScore: number;
  /** Individual category breakdowns */
  categories: ScoreCategory[];
  /** Key positive factors driving the score */
  drivers: string[];
  /** Areas of concern to consider */
  flags: RiskFlag[];
  /** Recommended lease conditions */
  suggestedConditions: SuggestedCondition[];
  /** Conversational AI explanation of the assessment */
  aiExplanation: string;
}

// ============================================================================
// Risk Level Configuration
// ============================================================================

/**
 * Metadata for each risk level
 * Used for UI display and score-to-level conversion
 */
export const RISK_LEVELS = {
  A: {
    label: 'Excelente',
    description: 'Perfil muy confiable con bajo riesgo',
    color: 'emerald',
    badgeVariant: 'risk-a' as const,
    minScore: 85,
  },
  B: {
    label: 'Bueno',
    description: 'Perfil solido con riesgo moderado-bajo',
    color: 'blue',
    badgeVariant: 'risk-b' as const,
    minScore: 70,
  },
  C: {
    label: 'Regular',
    description: 'Perfil con algunos factores a considerar',
    color: 'amber',
    badgeVariant: 'risk-c' as const,
    minScore: 50,
  },
  D: {
    label: 'Riesgoso',
    description: 'Perfil con factores de riesgo significativos',
    color: 'red',
    badgeVariant: 'risk-d' as const,
    minScore: 0,
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert numeric score to risk level
 */
export function scoreToLevel(score: number): RiskLevel {
  if (score >= RISK_LEVELS.A.minScore) return 'A';
  if (score >= RISK_LEVELS.B.minScore) return 'B';
  if (score >= RISK_LEVELS.C.minScore) return 'C';
  return 'D';
}

/**
 * Get risk level metadata
 */
export function getRiskLevelInfo(level: RiskLevel) {
  return RISK_LEVELS[level];
}

/**
 * Get badge variant for a risk level
 */
export function getRiskBadgeVariant(level: RiskLevel) {
  return RISK_LEVELS[level].badgeVariant;
}
