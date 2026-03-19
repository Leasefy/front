/**
 * Default preferences and helper data for the AI Beta platform settings.
 *
 * All agents default to 'ask_first' (safest). Values are calibrated
 * for the Colombian residential rental market.
 */

import type { BetaPreferences, AutonomyLevel, AgentType } from '@/lib/types/beta-chat';

// ============================================================================
// Autonomy Level UI Metadata
// ============================================================================

export interface AutonomyLevelOption {
  id: AutonomyLevel;
  label: string;
  description: string;
  /** Phosphor icon name */
  icon: string;
}

export const AUTONOMY_LEVELS: AutonomyLevelOption[] = [
  {
    id: 'auto',
    label: 'Automatico',
    description: 'El agente actua sin consultar',
    icon: 'Lightning',
  },
  {
    id: 'ask_first',
    label: 'Preguntar primero',
    description: 'El agente consulta antes de actuar',
    icon: 'ChatCircle',
  },
  {
    id: 'manual',
    label: 'Manual',
    description: 'Deshabilitado — tu tomas las acciones',
    icon: 'Hand',
  },
];

// ============================================================================
// Default Preferences
// ============================================================================

const AGENT_TYPES: AgentType[] = [
  'cobranza',
  'pipeline',
  'mantenimiento',
  'documentos',
  'comunicacion',
  'reportes',
];

function createDefaultAutonomy(): Record<AgentType, AutonomyLevel> {
  const record = {} as Record<AgentType, AutonomyLevel>;
  for (const agent of AGENT_TYPES) {
    record[agent] = 'ask_first';
  }
  return record;
}

function createDefaultNotificationCategories(): Record<AgentType, boolean> {
  const record = {} as Record<AgentType, boolean>;
  for (const agent of AGENT_TYPES) {
    record[agent] = true;
  }
  return record;
}

export const DEFAULT_PREFERENCES: BetaPreferences = {
  autonomy: createDefaultAutonomy(),
  notifications: {
    categories: createDefaultNotificationCategories(),
    channel: 'in_app',
  },
  tone: 'professional',
  thresholds: {
    moraTolerance: 5,
    maintenanceBudgetLimit: 500000,
    minCandidateScore: 70,
  },
};
