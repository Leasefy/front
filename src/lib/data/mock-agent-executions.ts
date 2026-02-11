/**
 * Mock agent execution scenarios for the Beta chat interface.
 *
 * Every user message dispatches ALL 6 agents for a full "agentic" experience.
 * Each agent's task description is contextualised to the query keywords.
 *
 * Will be replaced by real orchestrator dispatch events in Phase 24.
 */

import type { AgentType } from '@/lib/types/beta-chat';

// ============================================================================
// Types
// ============================================================================

export interface MockAgentScenario {
  keywords: string[];
  agents: Array<{
    agentType: AgentType;
    taskDescription: string;
    durationMs: number;
    shouldFail?: boolean;
  }>;
}

// ============================================================================
// All-agents default scenario (used when no keyword match)
// ============================================================================

function defaultAllAgents(): MockAgentScenario['agents'] {
  return [
    { agentType: 'cobranza',      taskDescription: 'Analizando contexto financiero',       durationMs: 1200 },
    { agentType: 'pipeline',      taskDescription: 'Revisando pipeline de inquilinos',      durationMs: 1000 },
    { agentType: 'mantenimiento', taskDescription: 'Verificando estado de propiedades',     durationMs: 1400 },
    { agentType: 'documentos',    taskDescription: 'Consultando documentacion relevante',   durationMs: 1600 },
    { agentType: 'comunicacion',  taskDescription: 'Preparando resumen de comunicaciones',  durationMs: 900 },
    { agentType: 'reportes',      taskDescription: 'Generando metricas del portafolio',     durationMs: 1800 },
  ];
}

// ============================================================================
// Keyword-specific scenarios (all dispatch 6 agents with contextual tasks)
// ============================================================================

const MOCK_AGENT_SCENARIOS: MockAgentScenario[] = [
  {
    keywords: ['cobro', 'cobros', 'recaudo', 'recaudos', 'mora', 'moroso', 'deuda'],
    agents: [
      { agentType: 'cobranza',      taskDescription: 'Consultando estado de cobros y recaudos',      durationMs: 1500 },
      { agentType: 'pipeline',      taskDescription: 'Verificando inquilinos asociados',              durationMs: 800 },
      { agentType: 'mantenimiento', taskDescription: 'Comprobando costos de mantenimiento',           durationMs: 1000 },
      { agentType: 'documentos',    taskDescription: 'Revisando contratos de cobro',                  durationMs: 1300 },
      { agentType: 'comunicacion',  taskDescription: 'Preparando recordatorios de pago',              durationMs: 900 },
      { agentType: 'reportes',      taskDescription: 'Calculando metricas de recaudo',                durationMs: 1700 },
    ],
  },
  {
    keywords: ['candidato', 'candidatos', 'aplicacion', 'postulacion', 'filtro'],
    agents: [
      { agentType: 'cobranza',      taskDescription: 'Evaluando capacidad financiera',                durationMs: 1100 },
      { agentType: 'pipeline',      taskDescription: 'Buscando candidatos pre-filtrados',             durationMs: 1200 },
      { agentType: 'mantenimiento', taskDescription: 'Verificando estado del inmueble disponible',    durationMs: 900 },
      { agentType: 'documentos',    taskDescription: 'Verificando documentacion de candidatos',       durationMs: 1800 },
      { agentType: 'comunicacion',  taskDescription: 'Preparando comunicacion con candidatos',        durationMs: 800 },
      { agentType: 'reportes',      taskDescription: 'Generando reporte de scoring',                  durationMs: 1400 },
    ],
  },
  {
    keywords: ['mantenimiento', 'reparacion', 'reparar', 'arreglo', 'arreglar', 'dano'],
    agents: [
      { agentType: 'cobranza',      taskDescription: 'Verificando presupuesto disponible',            durationMs: 900 },
      { agentType: 'pipeline',      taskDescription: 'Consultando inquilino afectado',                durationMs: 700 },
      { agentType: 'mantenimiento', taskDescription: 'Revisando solicitudes de mantenimiento',        durationMs: 1400 },
      { agentType: 'documentos',    taskDescription: 'Buscando garantias y polizas',                  durationMs: 1200 },
      { agentType: 'comunicacion',  taskDescription: 'Contactando proveedores disponibles',           durationMs: 1600 },
      { agentType: 'reportes',      taskDescription: 'Calculando costos historicos',                  durationMs: 1100 },
    ],
  },
  {
    keywords: ['reporte', 'reportes', 'informe', 'resumen', 'financiero'],
    agents: [
      { agentType: 'cobranza',      taskDescription: 'Consolidando datos de cobros',                  durationMs: 1300 },
      { agentType: 'pipeline',      taskDescription: 'Agregando metricas de pipeline',                durationMs: 1000 },
      { agentType: 'mantenimiento', taskDescription: 'Sumando gastos de mantenimiento',               durationMs: 1100 },
      { agentType: 'documentos',    taskDescription: 'Recopilando documentacion financiera',          durationMs: 1500 },
      { agentType: 'comunicacion',  taskDescription: 'Revisando comunicaciones del periodo',          durationMs: 800 },
      { agentType: 'reportes',      taskDescription: 'Generando reporte financiero completo',         durationMs: 2000 },
    ],
  },
  {
    keywords: ['contrato', 'contratos', 'renovacion', 'renovar', 'arriendo'],
    agents: [
      { agentType: 'cobranza',      taskDescription: 'Verificando estado de pagos del contrato',      durationMs: 1000 },
      { agentType: 'pipeline',      taskDescription: 'Evaluando historial del inquilino',             durationMs: 900 },
      { agentType: 'mantenimiento', taskDescription: 'Revisando estado del inmueble',                 durationMs: 1100 },
      { agentType: 'documentos',    taskDescription: 'Consultando estado de contratos',               durationMs: 1300 },
      { agentType: 'comunicacion',  taskDescription: 'Preparando notificaciones de vencimiento',      durationMs: 1600 },
      { agentType: 'reportes',      taskDescription: 'Generando analisis de renovacion',              durationMs: 1400 },
    ],
  },
  {
    keywords: ['pago', 'pagos', 'consignacion', 'transferencia', 'banco'],
    agents: [
      { agentType: 'cobranza',      taskDescription: 'Verificando estado de pagos recibidos',         durationMs: 1100 },
      { agentType: 'pipeline',      taskDescription: 'Cruzando pagos con inquilinos',                 durationMs: 800 },
      { agentType: 'mantenimiento', taskDescription: 'Verificando deducciones de mantenimiento',      durationMs: 900 },
      { agentType: 'documentos',    taskDescription: 'Buscando soportes de pago',                     durationMs: 1200 },
      { agentType: 'comunicacion',  taskDescription: 'Preparando confirmaciones de pago',             durationMs: 700 },
      { agentType: 'reportes',      taskDescription: 'Calculando metricas de recaudo',                durationMs: 1700 },
    ],
  },
  {
    keywords: ['propiedad', 'propiedades', 'inmueble', 'inmuebles', 'apartamento'],
    agents: [
      { agentType: 'cobranza',      taskDescription: 'Verificando cobros por propiedad',              durationMs: 1500 },
      { agentType: 'pipeline',      taskDescription: 'Cargando estado del portafolio',                durationMs: 900 },
      { agentType: 'mantenimiento', taskDescription: 'Revisando mantenimientos pendientes',           durationMs: 1200 },
      { agentType: 'documentos',    taskDescription: 'Consultando documentos por propiedad',          durationMs: 1400 },
      { agentType: 'comunicacion',  taskDescription: 'Revisando comunicaciones de inquilinos',        durationMs: 800 },
      { agentType: 'reportes',      taskDescription: 'Generando resumen del portafolio',              durationMs: 1600 },
    ],
  },
  {
    keywords: ['inquilino', 'inquilinos', 'arrendatario', 'arrendatarios'],
    agents: [
      { agentType: 'cobranza',      taskDescription: 'Verificando historial de pagos',                durationMs: 1200 },
      { agentType: 'pipeline',      taskDescription: 'Consultando perfiles de inquilinos activos',    durationMs: 1000 },
      { agentType: 'mantenimiento', taskDescription: 'Revisando solicitudes de inquilinos',           durationMs: 800 },
      { agentType: 'documentos',    taskDescription: 'Buscando contratos vigentes',                   durationMs: 1300 },
      { agentType: 'comunicacion',  taskDescription: 'Revisando comunicaciones recientes',            durationMs: 700 },
      { agentType: 'reportes',      taskDescription: 'Generando scoring de inquilinos',               durationMs: 1500 },
    ],
  },
  {
    keywords: ['decision', 'decisiones', 'pendiente', 'pendientes', 'aprobar'],
    agents: [
      { agentType: 'cobranza',      taskDescription: 'Evaluando impacto financiero',                  durationMs: 1000 },
      { agentType: 'pipeline',      taskDescription: 'Analizando candidatos pendientes',              durationMs: 900 },
      { agentType: 'mantenimiento', taskDescription: 'Revisando decisiones de mantenimiento',         durationMs: 1100 },
      { agentType: 'documentos',    taskDescription: 'Recopilando decisiones pendientes',             durationMs: 1100 },
      { agentType: 'comunicacion',  taskDescription: 'Preparando resumen de opciones',                durationMs: 1400 },
      { agentType: 'reportes',      taskDescription: 'Generando analisis de impacto',                 durationMs: 1600 },
    ],
  },
];

// ============================================================================
// Matcher
// ============================================================================

/**
 * Returns agent execution scenarios matching the user message keywords.
 * ALWAYS returns all 6 agents for a full agentic experience.
 */
export function getMockAgentScenario(
  userMessage: string
): MockAgentScenario['agents'] {
  const normalized = userMessage.toLowerCase();

  for (const scenario of MOCK_AGENT_SCENARIOS) {
    if (scenario.keywords.some((kw) => normalized.includes(kw))) {
      return scenario.agents;
    }
  }

  // Always return all agents — every query gets the full analysis
  return defaultAllAgents();
}
