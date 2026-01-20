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

export const INSURANCE_POLICIES: InsurancePolicy[] = [
  {
    id: 'none',
    tier: 'none',
    name: 'Sin poliza',
    description: 'Continuar sin proteccion adicional',
    monthlyPremium: 0,
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
    monthlyPremium: 45000, // $45,000 COP/mes
    coverage: {
      propertyDamage: 10000000, // $10M COP
      personalLiability: 5000000, // $5M COP
      legalAssistance: false,
      emergencyRepairs: true,
      rentDefault: 2, // 2 months
    },
    features: [
      'Danos a la propiedad hasta $10M',
      'Responsabilidad civil hasta $5M',
      'Reparaciones de emergencia 24/7',
      '2 meses de renta garantizada',
    ],
    recommended: true,
  },
  {
    id: 'premium',
    tier: 'premium',
    name: 'Proteccion Premium',
    description: 'Maxima cobertura y tranquilidad total',
    monthlyPremium: 89000, // $89,000 COP/mes
    coverage: {
      propertyDamage: 30000000, // $30M COP
      personalLiability: 15000000, // $15M COP
      legalAssistance: true,
      emergencyRepairs: true,
      rentDefault: 4, // 4 months
    },
    features: [
      'Danos a la propiedad hasta $30M',
      'Responsabilidad civil hasta $15M',
      'Asistencia legal incluida',
      'Reparaciones de emergencia 24/7',
      '4 meses de renta garantizada',
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
