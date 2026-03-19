/**
 * Insurance policies for contract signing flow
 *
 * Three tiers:
 * - none: No insurance ($0/mes)
 * - basic: Basic protection (2% del arriendo/mes)
 * - premium: Premium protection (3.5% del arriendo/mes)
 *
 * Pricing based on Colombian market research (SURA, Bolivar):
 * - Market standard: 50% of first month for annual, or 1-5% monthly
 * - Coverage: 12-36 months depending on plan
 * - Includes: rent + admin + utilities + legal assistance
 */

import type { InsurancePolicy } from '@/lib/types/insurance';

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
    monthlyPremium: 0,
    percentageRate: 2,
    coverage: {
      propertyDamage: 15000000,
      personalLiability: 10000000,
      legalAssistance: false,
      emergencyRepairs: true,
      rentDefault: 12,
    },
    features: [
      '12 meses de renta garantizada',
      'Cobertura de servicios publicos',
      'Daños a la propiedad hasta $15M',
      'Reparaciones de emergencia 24/7',
    ],
    recommended: true,
  },
  {
    id: 'premium',
    tier: 'premium',
    name: 'Proteccion Premium',
    description: 'Maxima cobertura y tranquilidad total',
    monthlyPremium: 0,
    percentageRate: 3.5,
    coverage: {
      propertyDamage: 50000000,
      personalLiability: 30000000,
      legalAssistance: true,
      emergencyRepairs: true,
      rentDefault: 24,
    },
    features: [
      '24 meses de renta garantizada',
      'Cobertura de servicios publicos',
      'Daños a la propiedad hasta $50M',
      'Asistencia legal incluida',
      'Reparaciones de emergencia 24/7',
      'Gestor personal asignado',
    ],
  },
];

export function getInsuranceById(id: string): InsurancePolicy | undefined {
  return INSURANCE_POLICIES.find((p) => p.id === id);
}

export function getRecommendedInsurance(): InsurancePolicy {
  return INSURANCE_POLICIES.find((p) => p.recommended) || INSURANCE_POLICIES[1];
}

export function getInsuranceByTier(tier: string): InsurancePolicy | undefined {
  return INSURANCE_POLICIES.find((p) => p.tier === tier);
}

export function getDefaultInsuranceSelection() {
  return {
    policyId: null,
    tier: 'none' as const,
    monthlyPremium: 0,
  };
}
