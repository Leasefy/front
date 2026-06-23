// =============================================================================
// AI Agent Type Definitions & Data
// =============================================================================

export interface AIAgentDefinition {
  id: string;
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  icon: string;
  color: string;
  colorBg: string;
  status: 'active' | 'coming-soon';
  detail?: {
    taglineEn: string;
    taglineEs: string;
    triggersEn: string[];
    triggersEs: string[];
    escalationEn: string[];
    escalationEs: string[];
    impactEn: string;
    impactEs: string;
    pipelineSteps: {
      labelEn: string;
      labelEs: string;
      icon: string;
    }[];
  };
}

export type ExecutionStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ScoringAwaitingReason =
  | 'study_in_progress'
  | 'no_consent'
  | 'consent_unavailable'
  | 'cannot_launch'
  | 'no_cedula'
  | 'study_not_completed'
  | 'no_db';

/** Evaluation lifecycle status as returned by the main backend (EvaluationResponseDto). */
export type ScoringRunStatus =
  | 'PENDING'
  | 'AWAITING_EVALUATION'
  | 'COMPLETED'
  | 'FAILED';

export interface ExecutionStep {
  id: string;
  label: string;
  stepType: 'browser' | 'api' | 'analysis' | 'decision' | 'notification' | 'document' | 'search';
  status: ExecutionStepStatus;
  reasoning?: string;
  output?: string;
  durationMs?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AgentExecutionTrace {
  id: string;
  agentId: string;
  title: string;
  status: 'running' | 'completed' | 'failed';
  steps: ExecutionStep[];
  totalDurationMs?: number;
  conclusion?: string;
  result?: string;
  createdAt?: Date;
}

export interface AgentActivity {
  id: string;
  agentId: string;
  agentName: string;
  type: 'execution' | 'notification' | 'escalation' | 'error';
  title: string;
  description?: string;
  status: 'success' | 'pending' | 'failed';
  timestamp: Date;
  metadata?: {
    result?: string;
    durationMs?: number;
    applicationId?: string;
    score?: number;
    level?: string;
  };
}

// =============================================================================
// Agent Definitions
// =============================================================================

const AGENTS: AIAgentDefinition[] = [
  {
    id: 'tenant-scoring',
    nameEn: 'Tenant Scoring',
    nameEs: 'Evaluación de Inquilinos',
    descriptionEn: 'Analyzes documents, credit history, and financial consistency to evaluate rental applicants.',
    descriptionEs: 'Analiza documentos, historial crediticio y consistencia financiera para evaluar aplicantes.',
    icon: 'ShieldCheck',
    color: 'text-blue-600 dark:text-blue-400',
    colorBg: 'bg-blue-50 dark:bg-blue-950/30',
    status: 'active',
    detail: {
      taglineEn: 'Autonomous applicant evaluation in under 3 minutes',
      taglineEs: 'Evaluación autónoma de aplicantes en menos de 3 minutos',
      triggersEn: [
        'A candidate submits a rental application',
        'Documents are uploaded to an existing application',
        'Re-evaluation is requested by an agent',
      ],
      triggersEs: [
        'Un candidato envía una aplicación de arriendo',
        'Se suben documentos a una aplicación existente',
        'Un agente solicita re-evaluación',
      ],
      escalationEn: [
        'Possible fraud detected (severe document inconsistencies)',
        'Model confidence below 60%',
        'Documents illegible after 2 OCR attempts',
      ],
      escalationEs: [
        'Posible fraude detectado (inconsistencias severas en documentos)',
        'Confianza del modelo inferior al 60%',
        'Documentos ilegibles después de 2 intentos de OCR',
      ],
      impactEn: 'Reduces evaluation time from 2-3 days to under 3 minutes. 94% accuracy, 3% escalation rate.',
      impactEs: 'Reduce el tiempo de evaluación de 2-3 días a menos de 3 minutos. 94% de precisión, 3% de escalamiento.',
      pipelineSteps: [
        { labelEn: 'Receive Documents', labelEs: 'Recibir Documentos', icon: 'FileText' },
        { labelEn: 'Extract via OCR', labelEs: 'Extraer con OCR', icon: 'MagnifyingGlass' },
        { labelEn: 'Verify Consistency', labelEs: 'Verificar Consistencia', icon: 'Brain' },
        { labelEn: 'Calculate Score', labelEs: 'Calcular Score', icon: 'LightbulbFilament' },
        { labelEn: 'Generate Explanation', labelEs: 'Generar Explicación', icon: 'ChatCircleDots' },
        { labelEn: 'Store Result', labelEs: 'Guardar Resultado', icon: 'PlugsConnected' },
        { labelEn: 'Notify Team', labelEs: 'Notificar Equipo', icon: 'Bell' },
      ],
    },
  },
  {
    id: 'smart-matching',
    nameEn: 'Smart Matching',
    nameEs: 'Matching Inteligente',
    descriptionEn: 'Scans the agency portfolio to find compatible properties for each candidate.',
    descriptionEs: 'Escanea el portafolio de la inmobiliaria para encontrar propiedades compatibles.',
    icon: 'GitMerge',
    color: 'text-purple-600 dark:text-purple-400',
    colorBg: 'bg-purple-50 dark:bg-purple-950/30',
    status: 'active',
    detail: {
      taglineEn: 'Automatic property suggestions with compatibility analysis',
      taglineEs: 'Sugerencias automáticas de propiedades con análisis de compatibilidad',
      triggersEn: [
        'A candidate applies to a property',
        'A candidate is rejected (sends alternatives)',
        'Daily scan for properties with no applicants (7+ days)',
      ],
      triggersEs: [
        'Un candidato aplica a una propiedad',
        'Un candidato es rechazado (envía alternativas)',
        'Escaneo diario de propiedades sin aplicantes (7+ días)',
      ],
      escalationEn: [
        'No compatible properties found in portfolio',
        'Candidate budget below minimum property price',
      ],
      escalationEs: [
        'No se encontraron propiedades compatibles en el portafolio',
        'Presupuesto del candidato por debajo del precio mínimo',
      ],
      impactEn: 'Increases conversion by 31%. Redirects candidates to compatible properties automatically.',
      impactEs: 'Aumenta la conversión un 31%. Redirige candidatos a propiedades compatibles automáticamente.',
      pipelineSteps: [
        { labelEn: 'Load Profile', labelEs: 'Cargar Perfil', icon: 'PlugsConnected' },
        { labelEn: 'Search Portfolio', labelEs: 'Buscar en Portafolio', icon: 'MagnifyingGlass' },
        { labelEn: 'Calculate Compatibility', labelEs: 'Calcular Compatibilidad', icon: 'Brain' },
        { labelEn: 'Select Top 3', labelEs: 'Seleccionar Top 3', icon: 'LightbulbFilament' },
        { labelEn: 'Send Suggestions', labelEs: 'Enviar Sugerencias', icon: 'Bell' },
        { labelEn: 'Notify Zone Agent', labelEs: 'Notificar Agente de Zona', icon: 'Bell' },
      ],
    },
  },
  {
    id: 'cobranza',
    nameEn: 'Collections',
    nameEs: 'Cobranza',
    descriptionEn: 'Autonomous voice + WhatsApp debt recovery across 7 collection stages with Ley 2300 compliance.',
    descriptionEs: 'Recuperación autónoma de cartera por voz y WhatsApp en 7 etapas con cumplimiento de Ley 2300.',
    icon: 'Headset',
    color: 'text-violet-600 dark:text-violet-400',
    colorBg: 'bg-violet-50 dark:bg-violet-950/30',
    status: 'active',
    detail: {
      taglineEn: 'Recover overdue rent 3× faster — fully automated, fully compliant',
      taglineEs: 'Recupera cartera vencida 3× más rápido — automatizado y en cumplimiento',
      triggersEn: [
        'A debtor enters a new collection stage (S0 through S5 or SX)',
        'A cadence window opens for a scheduled voice or WhatsApp contact attempt',
        'A debtor responds to a call or WhatsApp message',
        'A payment plan installment reaches its due date without payment',
        'Daily 06:45 Bogotá scan detects debtors stalled >14 days in current stage',
      ],
      triggersEs: [
        'Un deudor entra a una nueva etapa de cobranza (S0 hasta S5 o SX)',
        'Se abre una ventana de cadencia para un intento de contacto por voz o WhatsApp',
        'Un deudor responde a una llamada o mensaje de WhatsApp',
        'Un plan de pago llega a su fecha de cuota sin pago registrado',
        'Escaneo diario 06:45 Bogotá detecta deudores estancados >14 días en su etapa actual',
      ],
      escalationEn: [
        'Debtor explicitly disputes the debt or requests Habeas Data deletion',
        'Model confidence below threshold after 3 failed contact attempts in stage',
        'Payment plan requires approval exceeding agency max discount tier',
        'Siniestro filing (T-323) or pre-judicial letter needs human sign-off',
        'Debtor enters skip-trace stage (SX) — fiador contact requires human review',
      ],
      escalationEs: [
        'El deudor impugna la deuda explícitamente o solicita eliminación de Habeas Data',
        'Confianza del modelo baja del umbral tras 3 intentos fallidos de contacto en la etapa',
        'Plan de pago requiere aprobación que supera el tier máximo de descuento de la agencia',
        'El radicado de siniestro (T-323) o carta pre-judicial requiere firma humana',
        'El deudor entra a etapa de localización (SX) — contacto de fiador requiere revisión humana',
      ],
      impactEn: 'Reduces average collection cycle by 60% and eliminates Ley 2300 violations through automated hour-window enforcement and full audit trail.',
      impactEs: 'Reduce el ciclo de cobranza promedio un 60% y elimina infracciones a la Ley 2300 con ventanas horarias automatizadas y trazabilidad completa.',
      pipelineSteps: [
        { labelEn: 'Detect Stage Entry', labelEs: 'Detectar Entrada de Etapa', icon: 'Bell' },
        { labelEn: 'Select Script', labelEs: 'Seleccionar Guión', icon: 'FileText' },
        { labelEn: 'Execute Contact', labelEs: 'Ejecutar Contacto', icon: 'Headset' },
        { labelEn: 'Classify Response', labelEs: 'Clasificar Respuesta', icon: 'Brain' },
        { labelEn: 'Update State Machine', labelEs: 'Actualizar Máquina de Estado', icon: 'PlugsConnected' },
        { labelEn: 'Notify Operator', labelEs: 'Notificar Operador', icon: 'ChatCircleDots' },
      ],
    },
  },
  {
    id: 'cotizador',
    nameEn: 'Quoting',
    nameEs: 'Cotizador',
    descriptionEn: 'Multi-carrier insurance quoting for rental applicants — streaming verdicts from Sura, Mapfre, and Bolívar in under 10 seconds.',
    descriptionEs: 'Cotización de seguro multivehículo para aplicantes — veredictos en streaming de Sura, Mapfre y Bolívar en menos de 10 segundos.',
    icon: 'ShieldStar',
    color: 'text-teal-600 dark:text-teal-400',
    colorBg: 'bg-teal-50 dark:bg-teal-950/30',
    status: 'active',
    detail: {
      taglineEn: 'Quote 3 carriers simultaneously — results in seconds, not days',
      taglineEs: 'Cotiza 3 aseguradoras simultáneamente — resultados en segundos, no días',
      triggersEn: [
        'An operator submits a new rental applicant for quoting (cédula + canon + property type)',
        'An operator re-quotes with modified inputs (e.g., lower canon, different city)',
        'A quote session times out mid-stream and a carrier retry is needed',
        'An admin enables or disables a carrier and the active quote roster changes',
      ],
      triggersEs: [
        'Un operador envía un nuevo aplicante para cotización (cédula + canon + tipo de inmueble)',
        'Un operador re-cotiza con inputs modificados (p. ej., menor canon, diferente ciudad)',
        'Una sesión de cotización expira a mitad del streaming y se requiere reintentar una aseguradora',
        'Un admin habilita o deshabilita una aseguradora y cambia el roster activo',
      ],
      escalationEn: [
        'All active carriers return an error or timeout for the same quote request',
        'A carrier verdict contains a conditional approval requiring human review of conditions',
        'An ARCO Right-to-Erasure request arrives for a cédula with active quote history',
        'Model confidence in assumption validation drops below threshold (unvalidated assumption)',
      ],
      escalationEs: [
        'Todas las aseguradoras activas retornan error o timeout para la misma solicitud',
        'Una aseguradora devuelve aprobación condicional que requiere revisión humana de condiciones',
        'Llega una solicitud ARCO de derecho al olvido para una cédula con historial de cotizaciones',
        'La confianza del modelo en la validación de supuestos cae bajo el umbral (supuesto no validado)',
      ],
      impactEn: 'Reduces quote turnaround from 2-3 business days to under 10 seconds while surfacing the best carrier option per applicant profile automatically.',
      impactEs: 'Reduce el tiempo de cotización de 2-3 días hábiles a menos de 10 segundos y selecciona automáticamente la mejor aseguradora para cada perfil de aplicante.',
      pipelineSteps: [
        { labelEn: 'Validate Applicant', labelEs: 'Validar Aplicante', icon: 'ShieldCheck' },
        { labelEn: 'Fan Out to Carriers', labelEs: 'Enviar a Aseguradoras', icon: 'PlugsConnected' },
        { labelEn: 'Stream Verdicts', labelEs: 'Recibir Veredictos', icon: 'LightbulbFilament' },
        { labelEn: 'Rank Results', labelEs: 'Ordenar Resultados', icon: 'Brain' },
        { labelEn: 'Deliver to Operator', labelEs: 'Entregar al Operador', icon: 'Bell' },
      ],
    },
  },
  {
    id: 'contracts',
    nameEn: 'Contracts',
    nameEs: 'Contratos',
    descriptionEn: 'Contract generation, e-signatures, and renewal management.',
    descriptionEs: 'Generación de contratos, firmas electrónicas y gestión de renovaciones.',
    icon: 'FileText',
    color: 'text-amber-600',
    colorBg: 'bg-amber-50',
    status: 'coming-soon',
  },
  {
    id: 'maintenance',
    nameEn: 'Maintenance',
    nameEs: 'Mantenimiento',
    descriptionEn: 'Repair coordination and vendor management for properties.',
    descriptionEs: 'Coordinación de reparaciones y gestión de proveedores.',
    icon: 'Wrench',
    color: 'text-orange-600',
    colorBg: 'bg-orange-50',
    status: 'active',
  },
];

// =============================================================================
// Accessor Functions
// =============================================================================

export function getActiveAgents(): AIAgentDefinition[] {
  return AGENTS.filter((a) => a.status === 'active');
}

export function getComingSoonAgents(): AIAgentDefinition[] {
  return AGENTS.filter((a) => a.status === 'coming-soon');
}

export function getAgentById(id: string): AIAgentDefinition | undefined {
  return AGENTS.find((a) => a.id === id);
}

// =============================================================================
// Activity Feed (initially mock, replaced by real data when API connected)
// =============================================================================

export function getMockAgentActivity(): AgentActivity[] {
  const now = new Date();
  return [
    {
      id: 'act-1',
      agentId: 'tenant-scoring',
      agentName: 'Evaluación de Inquilinos',
      type: 'execution',
      title: 'CC 1.030.567.890 evaluado',
      description: 'Carlos Martínez — Score 47/100 (Nivel C)',
      status: 'success',
      timestamp: new Date(now.getTime() - 12 * 60 * 1000),
      metadata: { score: 47, level: 'C', applicationId: 'app-test-001' },
    },
    {
      id: 'act-2',
      agentId: 'smart-matching',
      agentName: 'Matching Inteligente',
      type: 'execution',
      title: '1 propiedad compatible encontrada',
      description: 'Estudio loft en Usaquén — 60% compatible',
      status: 'success',
      timestamp: new Date(now.getTime() - 11 * 60 * 1000),
      metadata: { applicationId: 'app-test-001' },
    },
    {
      id: 'act-3',
      agentId: 'smart-matching',
      agentName: 'Matching Inteligente',
      type: 'notification',
      title: 'Sugerencias disponibles en panel',
      description: 'Estudio loft en Usaquén agregado como alternativa',
      status: 'success',
      timestamp: new Date(now.getTime() - 10 * 60 * 1000),
    },
    {
      id: 'act-4',
      agentId: 'tenant-scoring',
      agentName: 'Evaluación de Inquilinos',
      type: 'execution',
      title: 'CC 1.019.234.567 evaluado',
      description: 'Ana María Gómez — Score 82/100 (Nivel A)',
      status: 'success',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000),
      metadata: { score: 82, level: 'A' },
    },
    {
      id: 'act-5',
      agentId: 'tenant-scoring',
      agentName: 'Evaluación de Inquilinos',
      type: 'escalation',
      title: 'Escalado a revisión humana',
      description: 'Inconsistencias severas en documentos de Juan Rodríguez',
      status: 'pending',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'act-6',
      agentId: 'smart-matching',
      agentName: 'Matching Inteligente',
      type: 'execution',
      title: 'Escaneo diario completado',
      description: '2 propiedades sin aplicantes detectadas',
      status: 'success',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000),
    },
    {
      id: 'act-7',
      agentId: 'tenant-scoring',
      agentName: 'Evaluación de Inquilinos',
      type: 'execution',
      title: 'CC 1.052.891.234 evaluado',
      description: 'Pedro Sánchez — Score 71/100 (Nivel B)',
      status: 'success',
      timestamp: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      metadata: { score: 71, level: 'B' },
    },
    {
      id: 'act-8',
      agentId: 'smart-matching',
      agentName: 'Matching Inteligente',
      type: 'execution',
      title: '3 propiedades compatibles encontradas',
      description: 'Apto 2 hab Chapinero, Studio Usaquén, Casa Suba',
      status: 'success',
      timestamp: new Date(now.getTime() - 11 * 60 * 60 * 1000),
    },
    {
      id: 'act-9',
      agentId: 'tenant-scoring',
      agentName: 'Evaluación de Inquilinos',
      type: 'execution',
      title: 'CC 80.123.456 evaluado',
      description: 'Laura Torres — Score 38/100 (Nivel D)',
      status: 'success',
      timestamp: new Date(now.getTime() - 14 * 60 * 60 * 1000),
      metadata: { score: 38, level: 'D' },
    },
    {
      id: 'act-10',
      agentId: 'smart-matching',
      agentName: 'Matching Inteligente',
      type: 'notification',
      title: 'Nuevo match disponible',
      description: 'Apto en Cedritos 85% compatible con solicitud #247',
      status: 'success',
      timestamp: new Date(now.getTime() - 16 * 60 * 60 * 1000),
    },
    {
      id: 'act-11',
      agentId: 'tenant-scoring',
      agentName: 'Evaluación de Inquilinos',
      type: 'execution',
      title: 'CC 1.098.765.432 evaluado',
      description: 'Diego Ramírez — Score 91/100 (Nivel A)',
      status: 'success',
      timestamp: new Date(now.getTime() - 22 * 60 * 60 * 1000),
      metadata: { score: 91, level: 'A' },
    },
    {
      id: 'act-12',
      agentId: 'tenant-scoring',
      agentName: 'Evaluación de Inquilinos',
      type: 'escalation',
      title: 'Documentos incompletos',
      description: 'Falta certificado laboral de Camila Herrera',
      status: 'pending',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
  ];
}
