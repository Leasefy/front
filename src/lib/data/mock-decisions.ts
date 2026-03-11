/**
 * Mock decision scenarios for the Beta chat interface.
 *
 * Maps user message keywords to pending decision cards.
 * Each scenario defines a realistic Colombian rental management decision
 * with 2-4 options and AI recommendation levels.
 *
 * Will be replaced by real orchestrator decision requests in Phase 24.
 */

import type { AgentType, PendingDecision, DecisionOption } from '@/lib/types/beta-chat';

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `dec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createOption(
  label: string,
  description: string,
  recommendation: DecisionOption['recommendation']
): DecisionOption {
  return { id: generateId(), label, description, recommendation };
}

// ============================================================================
// Decision Scenario Definitions
// ============================================================================

interface DecisionScenario {
  keywords: string[];
  build: () => PendingDecision;
}

const DECISION_SCENARIOS: DecisionScenario[] = [
  {
    keywords: ['renovar', 'renovacion'],
    build: () => ({
      id: generateId(),
      title: 'Renovacion de contrato - Apt 302',
      description:
        'El contrato de Maria Lopez vence en 18 dias. El IPC actual es 9.28%. La inquilina lleva 3 anos sin incidentes.',
      options: [
        createOption(
          'Renovar con IPC',
          'Incremento del 9.28% segun IPC. Canon actual $2.1M -> $2.29M COP.',
          'recommended'
        ),
        createOption(
          'Negociar incremento menor',
          'Proponer 7% para retener inquilina. Canon $2.1M -> $2.25M COP.',
          'neutral'
        ),
        createOption(
          'No renovar',
          'Liberar propiedad para nueva publicacion. Vacancia estimada: 45 dias.',
          'not_recommended'
        ),
      ],
      category: 'documentos' as AgentType,
    }),
  },
  {
    keywords: ['aprobar', 'candidato', 'score'],
    build: () => ({
      id: generateId(),
      title: 'Aprobar candidato - Score 78/100',
      description:
        'Juan Perez aplico para Apt 205. Score crediticio 78, ingresos 3.8x canon, sin antecedentes.',
      options: [
        createOption(
          'Aprobar candidato',
          'Score 78 cumple el umbral (75+). Ingresos 3.8x superan requisito 3x.',
          'recommended'
        ),
        createOption(
          'Rechazar candidato',
          'Esperar candidatos con score mas alto. Riesgo de vacancia extendida.',
          'not_recommended'
        ),
        createOption(
          'Solicitar mas informacion',
          'Pedir referencias laborales adicionales antes de decidir.',
          'neutral'
        ),
      ],
      category: 'pipeline' as AgentType,
    }),
  },
  {
    keywords: ['reparacion', 'autorizar', 'presupuesto'],
    build: () => ({
      id: generateId(),
      title: 'Autorizar reparacion - $450.000 COP',
      description:
        'Fuga en tuberia de agua caliente, Apt 502. Proveedor PlomerosPro cotiza $450K. Reparacion urgente.',
      options: [
        createOption(
          'Autorizar reparacion',
          'PlomerosPro tiene rating 4.8/5. Disponibilidad inmediata.',
          'recommended'
        ),
        createOption(
          'Buscar otro proveedor',
          'Solicitar segunda cotizacion. Demora estimada 2-3 dias.',
          'neutral'
        ),
        createOption(
          'Diferir reparacion',
          'Reparacion temporal por $120K. Riesgo de dano mayor.',
          'not_recommended'
        ),
      ],
      category: 'mantenimiento' as AgentType,
    }),
  },
  {
    keywords: ['mora', 'cobro formal'],
    build: () => ({
      id: generateId(),
      title: 'Accion sobre mora - Apt 108',
      description:
        'Carlos Ruiz lleva 32 dias de mora. Deuda acumulada $3.4M COP. Sin respuesta a recordatorios previos.',
      options: [
        createOption(
          'Enviar recordatorio final',
          'Ultimo aviso amistoso con plazo de 5 dias. Tono cordial.',
          'neutral'
        ),
        createOption(
          'Iniciar cobro formal',
          'Enviar carta de cobro juridico. Incluye costos de gestion.',
          'recommended'
        ),
        createOption(
          'Negociar plan de pago',
          'Ofrecer pago en 3 cuotas sin recargo adicional.',
          'neutral'
        ),
        createOption(
          'Iniciar proceso legal',
          'Proceso de restitucion de inmueble. Tiempo estimado 3-6 meses.',
          'not_recommended'
        ),
      ],
      category: 'cobranza' as AgentType,
    }),
  },
  {
    // Default decision for generic "decision"/"decisiones" queries
    keywords: ['decision', 'decisiones'],
    build: () => ({
      id: generateId(),
      title: 'Renovacion de contrato - Apt 302',
      description:
        'El contrato de Maria Lopez vence en 18 dias. El IPC actual es 9.28%. La inquilina lleva 3 anos sin incidentes.',
      options: [
        createOption(
          'Renovar con IPC',
          'Incremento del 9.28% segun IPC. Canon actual $2.1M -> $2.29M COP.',
          'recommended'
        ),
        createOption(
          'Negociar incremento menor',
          'Proponer 7% para retener inquilina. Canon $2.1M -> $2.25M COP.',
          'neutral'
        ),
        createOption(
          'No renovar',
          'Liberar propiedad para nueva publicacion. Vacancia estimada: 45 dias.',
          'not_recommended'
        ),
      ],
      category: 'documentos' as AgentType,
    }),
  },
];

// ============================================================================
// Matcher
// ============================================================================

/**
 * Returns a mock PendingDecision matching user message keywords, or null
 * if no decision scenario should be triggered for this message.
 */
export function getMockDecisionScenario(userMessage: string): PendingDecision | null {
  const normalized = userMessage.toLowerCase();

  for (const scenario of DECISION_SCENARIOS) {
    if (scenario.keywords.some((kw) => normalized.includes(kw))) {
      return scenario.build();
    }
  }

  return null;
}
