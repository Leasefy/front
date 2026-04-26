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
    id: 'collections',
    nameEn: 'Collections',
    nameEs: 'Cobranza',
    descriptionEn: 'Automated payment reminders and escalation sequences.',
    descriptionEs: 'Recordatorios de pago automáticos y secuencias de escalamiento.',
    icon: 'CurrencyDollar',
    color: 'text-emerald-600',
    colorBg: 'bg-emerald-50',
    status: 'coming-soon',
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
    status: 'coming-soon',
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
