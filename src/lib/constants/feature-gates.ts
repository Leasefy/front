/**
 * Feature gating configuration.
 *
 * Maps feature names to the minimum agency plan tier required
 * and whether the feature is restricted to flex (per-lease) plans.
 *
 * SECURITY: This is a UI-only gate. The backend MUST independently
 * verify plan access on every API call.
 *
 * @module lib/constants/feature-gates
 */

import type { AgencyPlanId } from '@/lib/types/subscription';

/**
 * All gatable feature identifiers.
 */
export type FeatureName =
  | 'advanced-reports'
  | 'executive-reports'
  | 'automatic-reminders'
  | 'contract-reminders'
  | 'ai-agents'
  | 'multi-branch'
  | 'pdf-export';

/**
 * Gate definition for a single feature.
 */
export interface FeatureGate {
  /** Minimum plan tier required to access this feature */
  minTier: AgencyPlanId;
  /** If true, feature is only available on flex (per-lease) plans */
  flexOnly?: boolean;
  /** Human-readable label in Spanish */
  labelEs: string;
  /** Human-readable label in English */
  labelEn: string;
}

/**
 * Feature-to-plan mapping.
 *
 * Each entry defines the minimum plan tier and whether the feature
 * is exclusive to flex plans. Used by `useAgencyPlan().hasFeature()`.
 */
export const FEATURE_GATES: Record<FeatureName, FeatureGate> = {
  'advanced-reports': {
    minTier: 'growth',
    labelEs: 'Reportes avanzados',
    labelEn: 'Advanced reports',
  },
  'executive-reports': {
    minTier: 'agency-business',
    labelEs: 'Reportes ejecutivos',
    labelEn: 'Executive reports',
  },
  'automatic-reminders': {
    minTier: 'growth',
    labelEs: 'Recordatorios automaticos',
    labelEn: 'Automatic reminders',
  },
  'contract-reminders': {
    minTier: 'growth',
    labelEs: 'Alertas de vencimiento de contrato',
    labelEn: 'Contract expiry alerts',
  },
  'ai-agents': {
    minTier: 'starter',
    flexOnly: true,
    labelEs: 'Agentes AI',
    labelEn: 'AI Agents',
  },
  'multi-branch': {
    minTier: 'agency-business',
    labelEs: 'Multi-sucursal',
    labelEn: 'Multi-branch',
  },
  'pdf-export': {
    minTier: 'growth',
    labelEs: 'Exportar a PDF',
    labelEn: 'PDF export',
  },
};
