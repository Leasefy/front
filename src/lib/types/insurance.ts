/**
 * Insurance types for optional policy selection during contract signing
 */

// ============================================================================
// Insurance Tier
// ============================================================================

/**
 * Insurance tier levels
 * - none: No insurance selected
 * - basic: Basic protection with essential coverage
 * - premium: Premium protection with full coverage
 */
export type InsuranceTier = 'none' | 'basic' | 'premium';

// ============================================================================
// Insurance Coverage
// ============================================================================

/**
 * Coverage details for an insurance policy
 */
export interface InsuranceCoverage {
  /** Maximum coverage for property damage in COP */
  propertyDamage: number;
  /** Maximum coverage for personal liability in COP */
  personalLiability: number;
  /** Whether legal assistance is included */
  legalAssistance: boolean;
  /** Whether 24/7 emergency repairs are included */
  emergencyRepairs: boolean;
  /** Number of months of rent default covered */
  rentDefault: number;
}

// ============================================================================
// Insurance Policy
// ============================================================================

/**
 * Insurance policy definition
 */
export interface InsurancePolicy {
  /** Unique policy identifier */
  id: string;
  /** Insurance tier level */
  tier: InsuranceTier;
  /** Policy display name */
  name: string;
  /** Policy description */
  description: string;
  /** Monthly premium in COP */
  monthlyPremium: number;
  /** Coverage details */
  coverage: InsuranceCoverage;
  /** List of feature descriptions */
  features: string[];
  /** Whether this policy is recommended */
  recommended?: boolean;
}

// ============================================================================
// Selected Insurance
// ============================================================================

/**
 * User's insurance selection state
 */
export interface SelectedInsurance {
  /** Selected policy ID, null if none selected */
  policyId: string | null;
  /** Selected tier */
  tier: InsuranceTier;
  /** Monthly premium amount in COP */
  monthlyPremium: number;
}

// ============================================================================
// Insurance Labels
// ============================================================================

/**
 * Display labels for insurance tiers
 */
export const INSURANCE_TIER_LABELS: Record<InsuranceTier, string> = {
  none: 'Sin poliza',
  basic: 'Proteccion Basica',
  premium: 'Proteccion Premium',
};
