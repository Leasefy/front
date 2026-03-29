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
  | 'all-ai-agents'
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
    minTier: 'pro',
    labelEs: 'Reportes avanzados',
    labelEn: 'Advanced reports',
  },
  'executive-reports': {
    minTier: 'flex',
    labelEs: 'Reportes ejecutivos',
    labelEn: 'Executive reports',
  },
  'automatic-reminders': {
    minTier: 'pro',
    labelEs: 'Recordatorios automaticos',
    labelEn: 'Automatic reminders',
  },
  'contract-reminders': {
    minTier: 'pro',
    labelEs: 'Alertas de vencimiento de contrato',
    labelEn: 'Contract expiry alerts',
  },
  'ai-agents': {
    minTier: 'pro',
    labelEs: 'Agentes AI (Scoring + Matching)',
    labelEn: 'AI Agents (Scoring + Matching)',
  },
  'all-ai-agents': {
    minTier: 'flex',
    flexOnly: true,
    labelEs: 'Todos los 19 agentes AI',
    labelEn: 'All 19 AI Agents',
  },
  'multi-branch': {
    minTier: 'flex',
    labelEs: 'Multi-sucursal',
    labelEn: 'Multi-branch',
  },
  'pdf-export': {
    minTier: 'pro',
    labelEs: 'Exportar a PDF',
    labelEn: 'PDF export',
  },
};
