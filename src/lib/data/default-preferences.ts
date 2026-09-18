/**
 * Default preferences and helper data for the AI Beta platform settings.
 *
 * All agents default to SOMBRA (`manual`), the safest. Values are calibrated
 * for the Colombian residential rental market.
 */

import { NIVEL_POR_DEFECTO } from '@/lib/types/beta-chat';
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

/**
 * 🔴 LOS TRES NIVELES, con los nombres que pidió Nico (17/18-09-2026):
 * «tenemos 3 niveles: sombra, copilot y automático; el usuario define».
 *
 * Van del MÁS PRUDENTE al menos: el primero de la lista es el que la gente
 * elige por inercia, y ése tiene que ser Sombra.
 *
 * ⚠️ Los `id` NO cambian (`manual`/`ask_first`/`auto`): son lo que ya está
 * guardado. Ver `AutonomyLevel` en `beta-chat.ts`.
 */
export const AUTONOMY_LEVELS: AutonomyLevelOption[] = [
  {
    id: 'manual',
    label: 'Sombra',
    description: 'Analiza y propone. No escribe ni llama a nadie.',
    icon: 'Eye',
  },
  {
    id: 'ask_first',
    label: 'Copilot',
    description: 'Prepara todo y una persona aprueba antes de que salga.',
    icon: 'ChatCircle',
  },
  {
    id: 'auto',
    label: 'Automático',
    description: 'Actúa solo, dentro de la política que dejaste aprobada.',
    icon: 'Lightning',
  },
];

// ============================================================================
// Default Preferences
// ============================================================================

const AGENT_TYPES: AgentType[] = [
  'cobranza',
  'cotizador',
  'estudio',
  'matching',
  'avaluo',
  'conciliacion',
  'pagos',
  'pipeline',
  'mantenimiento',
  'documentos',
  'comunicacion',
  'reportes',
];

function createDefaultAutonomy(): Record<AgentType, AutonomyLevel> {
  const record = {} as Record<AgentType, AutonomyLevel>;
  for (const agent of AGENT_TYPES) {
    /*
     * 🔴 SOMBRA por defecto (Nico, 18-09-2026): «sin elección del usuario,
     * nunca automático». Antes era `ask_first`, que ya preparaba mensajes
     * reales esperando un clic.
     */
    record[agent] = NIVEL_POR_DEFECTO;
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
