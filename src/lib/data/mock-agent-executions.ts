/**
 * Mock agent execution scenarios for the Beta chat interface.
 *
 * Maps user message keywords to agent execution patterns.
 * Each scenario defines which agents are dispatched and their simulated durations.
 *
 * Will be replaced by real orchestrator dispatch events in Phase 24.
 */

import type { AgentType } from '@/lib/types/beta-chat';

// ============================================================================
// Types
// ============================================================================

export interface MockAgentScenario {
  /** Keywords that trigger this scenario */
  keywords: string[];
  /** Agents dispatched for this scenario */
  agents: Array<{
    agentType: AgentType;
    taskDescription: string;
    /** Simulated duration in ms */
    durationMs: number;
    /** Whether this agent should fail (for error state testing) */
    shouldFail?: boolean;
  }>;
}

// ============================================================================
// Scenarios
// ============================================================================

const MOCK_AGENT_SCENARIOS: MockAgentScenario[] = [
  {
    keywords: ['cobro', 'cobros', 'recaudo', 'recaudos', 'mora', 'moroso', 'deuda'],
    agents: [
      {
        agentType: 'cobranza',
        taskDescription: 'Consultando estado de cobros y recaudos',
        durationMs: 1500,
      },
    ],
  },
  {
    keywords: ['candidato', 'candidatos', 'aplicacion', 'postulacion', 'filtro'],
    agents: [
      {
        agentType: 'pipeline',
        taskDescription: 'Buscando candidatos pre-filtrados',
        durationMs: 1200,
      },
      {
        agentType: 'documentos',
        taskDescription: 'Verificando documentacion de candidatos',
        durationMs: 1800,
      },
    ],
  },
  {
    keywords: ['mantenimiento', 'reparacion', 'reparar', 'arreglo', 'arreglar', 'dano'],
    agents: [
      {
        agentType: 'mantenimiento',
        taskDescription: 'Revisando solicitudes de mantenimiento activas',
        durationMs: 1400,
      },
    ],
  },
  {
    keywords: ['reporte', 'reportes', 'informe', 'resumen', 'financiero'],
    agents: [
      {
        agentType: 'reportes',
        taskDescription: 'Generando reporte financiero del periodo',
        durationMs: 2000,
      },
    ],
  },
  {
    keywords: ['contrato', 'contratos', 'renovacion', 'renovar', 'arriendo'],
    agents: [
      {
        agentType: 'documentos',
        taskDescription: 'Consultando estado de contratos',
        durationMs: 1300,
      },
      {
        agentType: 'comunicacion',
        taskDescription: 'Preparando notificaciones de vencimiento',
        durationMs: 1600,
      },
    ],
  },
  {
    keywords: ['pago', 'pagos', 'consignacion', 'transferencia', 'banco'],
    agents: [
      {
        agentType: 'cobranza',
        taskDescription: 'Verificando estado de pagos recibidos',
        durationMs: 1100,
      },
      {
        agentType: 'reportes',
        taskDescription: 'Calculando metricas de recaudo',
        durationMs: 1700,
      },
    ],
  },
  {
    keywords: ['inquilino', 'inquilinos', 'arrendatario', 'arrendatarios'],
    agents: [
      {
        agentType: 'pipeline',
        taskDescription: 'Consultando perfiles de inquilinos activos',
        durationMs: 1000,
      },
    ],
  },
  {
    keywords: ['propiedad', 'propiedades', 'inmueble', 'inmuebles', 'apartamento'],
    agents: [
      {
        agentType: 'pipeline',
        taskDescription: 'Cargando estado del portafolio',
        durationMs: 900,
      },
      {
        agentType: 'cobranza',
        taskDescription: 'Verificando cobros por propiedad',
        durationMs: 1500,
      },
      {
        agentType: 'mantenimiento',
        taskDescription: 'Revisando mantenimientos pendientes',
        durationMs: 1200,
      },
    ],
  },
  {
    keywords: ['decision', 'decisiones', 'pendiente', 'pendientes', 'aprobar'],
    agents: [
      {
        agentType: 'documentos',
        taskDescription: 'Recopilando decisiones pendientes',
        durationMs: 1100,
      },
      {
        agentType: 'comunicacion',
        taskDescription: 'Preparando resumen de opciones',
        durationMs: 1400,
      },
    ],
  },
];

// ============================================================================
// Matcher
// ============================================================================

/**
 * Returns mock agent execution scenarios matching the user message keywords.
 * Returns null if no agents should be dispatched for this message.
 */
export function getMockAgentScenario(
  userMessage: string
): MockAgentScenario['agents'] | null {
  const normalized = userMessage.toLowerCase();

  for (const scenario of MOCK_AGENT_SCENARIOS) {
    if (scenario.keywords.some((kw) => normalized.includes(kw))) {
      return scenario.agents;
    }
  }

  return null;
}
