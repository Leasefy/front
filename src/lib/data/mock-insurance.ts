/**
 * Mock insurance policies for contract signing flow
 *
 * Three tiers:
 * - none: No insurance ($0/mes)
 * - basic: Basic protection ($45,000 COP/mes)
 * - premium: Premium protection ($89,000 COP/mes)
 */

import type { InsurancePolicy } from '@/lib/types/insurance';

// ============================================================================
// Insurance Policies
// ============================================================================

/**
 * Insurance pricing based on Colombian market research (SURA, Bolivar):
 * - Market standard: 50% of first month for annual, or 1-5% monthly
 * - Coverage: 12-36 months depending on plan
 * - Includes: rent + admin + utilities + legal assistance
 *
 * Our pricing (competitive):
 * - Basic: 2% monthly (~$40k for $2M rent) - 12 months coverage
 * - Premium: 3.5% monthly (~$70k for $2M rent) - 24 months coverage
 */
export const INSURANCE_POLICIES: InsurancePolicy[] = [
  {
    id: 'none',
    tier: 'none',
    name: 'Sin poliza',
    description: 'Continuar sin proteccion adicional',
    monthlyPremium: 0,
    percentageRate: 0,
    coverage: {
      propertyDamage: 0,
      personalLiability: 0,
      legalAssistance: false,
      emergencyRepairs: false,
      rentDefault: 0,
    },
    features: [],
  },
  {
    id: 'basic',
    tier: 'basic',
    name: 'Proteccion Basica',
    description: 'Cobertura esencial para tu tranquilidad',
    monthlyPremium: 0, // Calculated from percentage
    percentageRate: 2, // 2% del arriendo mensual
    coverage: {
      propertyDamage: 15000000, // $15M COP
      personalLiability: 10000000, // $10M COP
      legalAssistance: false,
      emergencyRepairs: true,
      rentDefault: 12, // 12 months - industry standard
    },
    features: [
      '12 meses de renta garantizada',
      'Cobertura de servicios publicos',
      'Danos a la propiedad hasta $15M',
      'Reparaciones de emergencia 24/7',
    ],
    recommended: true,
  },
  {
    id: 'premium',
    tier: 'premium',
    name: 'Proteccion Premium',
    description: 'Maxima cobertura y tranquilidad total',
    monthlyPremium: 0, // Calculated from percentage
    percentageRate: 3.5, // 3.5% del arriendo mensual
    coverage: {
      propertyDamage: 50000000, // $50M COP
      personalLiability: 30000000, // $30M COP
      legalAssistance: true,
      emergencyRepairs: true,
      rentDefault: 24, // 24 months - premium coverage
    },
    features: [
      '24 meses de renta garantizada',
      'Cobertura de servicios publicos',
      'Danos a la propiedad hasta $50M',
      'Asistencia legal incluida',
      'Reparaciones de emergencia 24/7',
      'Gestor personal asignado',
    ],
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get insurance policy by ID
 */
export function getInsuranceById(id: string): InsurancePolicy | undefined {
  return INSURANCE_POLICIES.find((p) => p.id === id);
}

/**
 * Get the recommended insurance policy
 */
export function getRecommendedInsurance(): InsurancePolicy {
  return INSURANCE_POLICIES.find((p) => p.recommended) || INSURANCE_POLICIES[1];
}

/**
 * Get insurance policy by tier
 */
export function getInsuranceByTier(tier: string): InsurancePolicy | undefined {
  return INSURANCE_POLICIES.find((p) => p.tier === tier);
}

/**
 * Get the default (no insurance) selection
 */
export function getDefaultInsuranceSelection() {
  return {
    policyId: null,
    tier: 'none' as const,
    monthlyPremium: 0,
  };
}
