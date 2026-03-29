/**
 * AI Agent types for the inmobiliaria agent ecosystem
 * These represent the autonomous agents that power the platform
 */

export type AIAgentId =
  | 'tenant-scoring'
  | 'smart-matching'
  | 'collections'
  | 'contracts'
  | 'disbursements'
  | 'pipeline'
  | 'maintenance'
  | 'renewals'
  | 'communication'
  | 'documents'
  | 'analytics'
  | 'pricing'
  | 'property-verification'
  | 'visits'
  | 'fraud-kyc'
  | 'legal'
  | 'onboarding'
  | 'retention';

export type AIAgentStatus = 'active' | 'coming_soon' | 'beta';

export type ExecutionStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ExecutionStep {
  id: string;
  label: string;
  description?: string;
  status: ExecutionStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  /** What the agent was "thinking" at this step */
  reasoning?: string;
  /** Data the agent found/produced */
  output?: string;
  /** Icon hint for the step type */
  stepType?: 'browser' | 'api' | 'analysis' | 'decision' | 'notification' | 'document' | 'search';
}

export interface AgentExecutionTrace {
  id: string;
  activityId: string;
  agentId: AIAgentId;
  title: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  totalDurationMs?: number;
  steps: ExecutionStep[];
  /** Final result summary */
  result?: string;
  /** Final reasoning / conclusion */
  conclusion?: string;
}

export interface AIAgentActivity {
  id: string;
  agentId: AIAgentId;
  description: string;
  detail?: string;
  timestamp: Date;
  status: 'completed' | 'in_progress' | 'requires_attention';
  metadata?: Record<string, string | number>;
  /** Linked execution trace */
  executionTrace?: AgentExecutionTrace;
}

export interface AgentDetailSection {
  titleEs: string;
  titleEn: string;
  contentEs: string;
  contentEn: string;
}

export interface AIAgentDefinition {
  id: AIAgentId;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  status: AIAgentStatus;
  icon: string;
  color: string;
  colorBg: string;
  colorBgDark: string;
  /** Full explanation for the detail sidebar */
  detail?: {
    taglineEs: string;
    taglineEn: string;
    sections: AgentDetailSection[];
    autonomyLevel: 'full' | 'semi' | 'supervised';
    triggersEs: string[];
    triggersEn: string[];
  };
  metrics?: {
    label: string;
    value: string | number;
  }[];
  recentActivity?: AIAgentActivity[];
}

/**
 * Agent registry — all agents in the ecosystem
 */
export const AI_AGENTS: AIAgentDefinition[] = [
  // === ACTIVE AGENTS ===
  {
    id: 'tenant-scoring',
    nameEs: 'Evaluación de Inquilinos',
    nameEn: 'Tenant Scoring',
    descriptionEs: 'Evalúa candidatos automáticamente analizando documentos, centrales de riesgo y generando scores verificables.',
    descriptionEn: 'Automatically evaluates candidates by analyzing documents, credit bureaus, and generating verifiable scores.',
    status: 'active',
    icon: 'ShieldCheck',
    color: 'text-neutral-700 dark:text-neutral-300',
    colorBg: 'bg-neutral-100 dark:bg-neutral-800',
    colorBgDark: 'bg-neutral-700',
    detail: {
      taglineEs: 'Tu analista de riesgo autónomo que nunca duerme',
      taglineEn: 'Your autonomous risk analyst that never sleeps',
      sections: [
        {
          titleEs: '¿Qué hace exactamente?',
          titleEn: 'What does it do exactly?',
          contentEs: 'Cuando un candidato aplica a una de tus propiedades y sube sus documentos (cédula, certificación laboral, extractos bancarios), este agente los analiza automáticamente. Extrae datos con OCR, cruza con DataCrédito y TransUnion, verifica que los ingresos coincidan con los extractos, y genera un score de 0 a 100 con nivel A/B/C/D.',
          contentEn: 'When a candidate applies to one of your properties and uploads documents (ID, employment letter, bank statements), this agent analyzes them automatically. It extracts data with OCR, cross-references with credit bureaus, verifies income matches bank statements, and generates a 0-100 score with A/B/C/D level.',
        },
        {
          titleEs: '¿Cómo evalúa?',
          titleEn: 'How does it evaluate?',
          contentEs: 'El score se compone de 4 categorías:\n\n• Estabilidad financiera (35%) — ¿puede pagar? ¿sus ingresos son estables?\n• Historial de arriendo (25%) — ¿ha pagado bien antes? ¿tiene referencias?\n• Verificación documental (25%) — ¿los documentos son auténticos y consistentes?\n• Perfil personal (15%) — ¿antigüedad laboral? ¿estabilidad?',
          contentEn: 'The score is composed of 4 categories:\n\n• Financial stability (35%) — can they pay? are their earnings stable?\n• Rental history (25%) — have they paid well before? references?\n• Document verification (25%) — are documents authentic and consistent?\n• Personal profile (15%) — job tenure? stability?',
        },
        {
          titleEs: '¿Qué produce?',
          titleEn: 'What does it produce?',
          contentEs: 'Un reporte completo con: score numérico, nivel de riesgo (A/B/C/D), explicación en lenguaje natural de por qué obtuvo ese score, factores positivos, alertas de riesgo, y un PDF descargable con código QR de verificación válido por 90 días.',
          contentEn: 'A complete report with: numeric score, risk level (A/B/C/D), plain-language explanation of the score, positive factors, risk flags, and a downloadable PDF with QR verification code valid for 90 days.',
        },
        {
          titleEs: '¿Cuándo escala a un humano?',
          titleEn: 'When does it escalate to a human?',
          contentEs: 'Solo en 3 casos: cuando detecta posible fraude (inconsistencias graves entre documentos), cuando su nivel de confianza es menor al 60%, o cuando los documentos son ilegibles. En todos los demás casos, opera de forma 100% autónoma.',
          contentEn: 'Only in 3 cases: when it detects possible fraud (severe document inconsistencies), when its confidence level is below 60%, or when documents are illegible. In all other cases, it operates 100% autonomously.',
        },
      ],
      autonomyLevel: 'full',
      triggersEs: [
        'Un candidato sube documentos para evaluación',
        'Un propietario solicita evaluación de un aplicante',
        'Tu equipo procesa candidatos en el pipeline',
      ],
      triggersEn: [
        'A candidate uploads documents for evaluation',
        'An owner requests evaluation of an applicant',
        'Your team processes candidates in the pipeline',
      ],
    },
  },
  {
    id: 'smart-matching',
    nameEs: 'Matching Inteligente',
    nameEn: 'Smart Matching',
    descriptionEs: 'Cuando un candidato aplica a un inmueble, analiza su perfil y le sugiere otras propiedades compatibles de tu portafolio. Redistribuye leads y envía recomendaciones automáticas.',
    descriptionEn: 'When a candidate applies to a property, analyzes their profile and suggests other compatible properties from your portfolio. Redistributes leads and sends automatic recommendations.',
    status: 'active',
    icon: 'GitMerge',
    color: 'text-neutral-700 dark:text-neutral-300',
    colorBg: 'bg-neutral-100 dark:bg-neutral-800',
    colorBgDark: 'bg-neutral-700',
    detail: {
      taglineEs: 'Tu agente comercial digital que maximiza cada aplicación',
      taglineEn: 'Your digital sales agent that maximizes every application',
      sections: [
        {
          titleEs: '¿Qué hace exactamente?',
          titleEn: 'What does it do exactly?',
          contentEs: 'Cada vez que un candidato aplica a una propiedad, este agente revisa todo tu portafolio para encontrar otras opciones compatibles. Si el candidato aplica a un apartamento en Usaquén, el agente busca propiedades similares en zona, precio y características — y le envía sugerencias automáticas al candidato y notifica a tu equipo.',
          contentEn: 'Every time a candidate applies to a property, this agent reviews your entire portfolio to find other compatible options. If a candidate applies to an apartment in Usaquén, the agent searches for similar properties by zone, price, and features — and automatically sends suggestions to the candidate and notifies your team.',
        },
        {
          titleEs: '¿Cómo calcula la compatibilidad?',
          titleEn: 'How does it calculate compatibility?',
          contentEs: 'Usa 4 factores:\n\n• Capacidad de pago (40%) — ¿el canon está dentro del presupuesto del candidato?\n• Compatibilidad de riesgo (30%) — ¿su score es aceptable para esa propiedad?\n• Preferencias (15%) — ¿coincide zona, tipo, número de habitaciones, amenities?\n• Probabilidad de aceptación (15%) — ¿el propietario aceptaría a este candidato?',
          contentEn: 'Uses 4 factors:\n\n• Affordability (40%) — is the rent within the candidate\'s budget?\n• Risk compatibility (30%) — is their score acceptable for that property?\n• Preferences (15%) — does zone, type, bedrooms, amenities match?\n• Acceptance probability (15%) — would the owner accept this candidate?',
        },
        {
          titleEs: '¿Qué más hace?',
          titleEn: 'What else does it do?',
          contentEs: '• Reasigna leads al agente comercial que mejor conoce la zona del candidato\n• Cuando una propiedad lleva más de 7 días sin aplicantes, busca candidatos activos que podrían ser compatibles y les envía la sugerencia\n• Cuando un candidato es rechazado en una propiedad, automáticamente le sugiere alternativas',
          contentEn: '• Reassigns leads to the sales agent who knows the candidate\'s zone best\n• When a property has had no applicants for 7+ days, finds active candidates who might be compatible and sends suggestions\n• When a candidate is rejected from a property, automatically suggests alternatives',
        },
      ],
      autonomyLevel: 'full',
      triggersEs: [
        'Un candidato aplica a una de tus propiedades',
        'Se publica una nueva propiedad en el portafolio',
        'Un candidato es rechazado y necesita alternativas',
        'Una propiedad lleva +7 días sin aplicantes',
      ],
      triggersEn: [
        'A candidate applies to one of your properties',
        'A new property is listed in the portfolio',
        'A candidate is rejected and needs alternatives',
        'A property has had no applicants for 7+ days',
      ],
    },
  },
  // === COMING SOON ===
  {
    id: 'collections',
    nameEs: 'Cobranza',
    nameEn: 'Collections',
    descriptionEs: 'Automatiza recordatorios, seguimiento de mora y escalación de cobros.',
    descriptionEn: 'Automates reminders, late payment tracking, and collection escalation.',
    status: 'coming_soon',
    icon: 'CurrencyDollar',
    color: 'text-amber-600 dark:text-amber-400',
    colorBg: 'bg-amber-100 dark:bg-amber-900/30',
    colorBgDark: 'bg-amber-500',
  },
  {
    id: 'contracts',
    nameEs: 'Contratos',
    nameEn: 'Contracts',
    descriptionEs: 'Genera, gestiona firmas electrónicas, renovaciones y terminaciones de contratos.',
    descriptionEn: 'Generates contracts, manages e-signatures, renewals, and terminations.',
    status: 'coming_soon',
    icon: 'FileText',
    color: 'text-purple-600 dark:text-purple-400',
    colorBg: 'bg-purple-100 dark:bg-purple-900/30',
    colorBgDark: 'bg-purple-500',
  },
  {
    id: 'disbursements',
    nameEs: 'Dispersiones',
    nameEn: 'Disbursements',
    descriptionEs: 'Calcula comisiones, consolida cobros y ejecuta pagos a propietarios automáticamente.',
    descriptionEn: 'Calculates commissions, consolidates collections, and executes payments to owners.',
    status: 'coming_soon',
    icon: 'PaperPlaneTilt',
    color: 'text-indigo-600 dark:text-indigo-400',
    colorBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    colorBgDark: 'bg-indigo-500',
  },
  {
    id: 'pipeline',
    nameEs: 'Pipeline',
    nameEn: 'Pipeline',
    descriptionEs: 'Gestiona el embudo de arrendamiento, predice cierres y detecta leads estancados.',
    descriptionEn: 'Manages the rental funnel, predicts closings, and detects stale leads.',
    status: 'coming_soon',
    icon: 'Kanban',
    color: 'text-cyan-600 dark:text-cyan-400',
    colorBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    colorBgDark: 'bg-cyan-500',
  },
  {
    id: 'maintenance',
    nameEs: 'Mantenimiento',
    nameEn: 'Maintenance',
    descriptionEs: 'Coordina solicitudes de mantenimiento entre inquilinos, propietarios y proveedores.',
    descriptionEn: 'Coordinates maintenance requests between tenants, owners, and providers.',
    status: 'coming_soon',
    icon: 'Wrench',
    color: 'text-orange-600 dark:text-orange-400',
    colorBg: 'bg-orange-100 dark:bg-orange-900/30',
    colorBgDark: 'bg-orange-500',
  },
  {
    id: 'renewals',
    nameEs: 'Renovaciones',
    nameEn: 'Renewals',
    descriptionEs: 'Gestiona proactivamente renovaciones de contratos y negociación de condiciones.',
    descriptionEn: 'Proactively manages contract renewals and condition negotiations.',
    status: 'coming_soon',
    icon: 'ArrowsClockwise',
    color: 'text-teal-600 dark:text-teal-400',
    colorBg: 'bg-teal-100 dark:bg-teal-900/30',
    colorBgDark: 'bg-teal-500',
  },
];

/**
 * Mock activity data for active agents
 */
export function getMockAgentActivity(): AIAgentActivity[] {
  const now = new Date();
  return [
    {
      id: 'act-live-1',
      agentId: 'tenant-scoring',
      description: 'Evaluando a Pedro Ramírez',
      detail: 'Analizando extractos bancarios y certificación laboral...',
      timestamp: new Date(now.getTime() - 15 * 1000),
      status: 'in_progress',
      executionTrace: {
        id: 'trace-live-1',
        activityId: 'act-live-1',
        agentId: 'tenant-scoring',
        title: 'Evaluación de Pedro Ramírez — CC 1.023.456.789',
        status: 'running',
        startedAt: new Date(now.getTime() - 90 * 1000),
        steps: [
          {
            id: 's1', label: 'Recibiendo documentos', status: 'completed',
            stepType: 'document',
            durationMs: 2100,
            reasoning: 'El candidato subió 3 documentos: cédula, certificación laboral de Bancolombia, y extractos bancarios de los últimos 3 meses.',
            output: '3 archivos recibidos (PDF, 2.1 MB total)',
          },
          {
            id: 's2', label: 'Extracción OCR de documentos', status: 'completed',
            stepType: 'analysis',
            durationMs: 8400,
            reasoning: 'Ejecutando OCR sobre los 3 documentos. La cédula es legible. La certificación laboral es de Bancolombia, emitida hace 15 días. Los extractos muestran ingresos regulares.',
            output: 'Nombre: Pedro Ramírez López | CC: 1.023.456.789 | Empresa: Bancolombia S.A. | Cargo: Analista Senior | Salario: $6.800.000/mes | Antigüedad: 4 años 2 meses',
          },
          {
            id: 's3', label: 'Consultando DataCrédito', status: 'completed',
            stepType: 'browser',
            durationMs: 12300,
            reasoning: 'Accediendo a DataCrédito para verificar historial crediticio. Buscando por número de cédula 1.023.456.789.',
            output: 'Score DataCrédito: 780/900 (Excelente) | Obligaciones vigentes: 2 (tarjeta Visa, crédito vehículo) | Sin reportes negativos | Comportamiento: A en últimos 24 meses',
          },
          {
            id: 's4', label: 'Verificando consistencia de ingresos', status: 'running',
            stepType: 'analysis',
            reasoning: 'Cruzando el salario declarado ($6.800.000) con los depósitos en extractos bancarios. Verificando que los montos coincidan y que la empresa Bancolombia figure como pagadora...',
          },
          {
            id: 's5', label: 'Calculando score de riesgo', status: 'pending', stepType: 'analysis' },
          {
            id: 's6', label: 'Generando explicación y PDF', status: 'pending', stepType: 'document' },
          {
            id: 's7', label: 'Notificando resultado', status: 'pending', stepType: 'notification' },
        ],
      },
    },
    {
      id: 'act-live-2',
      agentId: 'smart-matching',
      description: 'Analizando candidato para sugerencias',
      detail: 'Carlos Ruiz aplicó a Apto 501 — Buscando alternativas compatibles en tu portafolio...',
      timestamp: new Date(now.getTime() - 45 * 1000),
      status: 'in_progress',
      executionTrace: {
        id: 'trace-live-2',
        activityId: 'act-live-2',
        agentId: 'smart-matching',
        title: 'Sugerencias para Carlos Ruiz — aplicó a Apto 501 Usaquén',
        status: 'running',
        startedAt: new Date(now.getTime() - 45 * 1000),
        steps: [
          {
            id: 's1', label: 'Analizando perfil del candidato', status: 'completed',
            stepType: 'analysis',
            durationMs: 1800,
            reasoning: 'Carlos Ruiz aplicó a Apto 501 Usaquén ($3.200.000/mes). Score B (78/100). Presupuesto declarado: $2.5M-$3.5M. Prefiere zona norte, 2+ habitaciones.',
            output: 'Candidato: Carlos Ruiz | Score: B (78) | Presupuesto: $2.5M-$3.5M | Zona: Norte Bogotá | Tipo: Apartamento 2+ hab',
          },
          {
            id: 's2', label: 'Buscando propiedades compatibles en portafolio', status: 'completed',
            stepType: 'search',
            durationMs: 3200,
            reasoning: 'Del portafolio de 87 propiedades disponibles, filtro por: canon $2.5M-$3.5M, zona norte (Usaquén/Cedritos/Santa Bárbara/Chapinero), 2+ habitaciones, score mínimo B aceptado.',
            output: '12 propiedades compatibles encontradas en el portafolio',
          },
          {
            id: 's3', label: 'Calculando compatibilidad de cada propiedad', status: 'running',
            stepType: 'analysis',
            reasoning: 'Calculando score de compatibilidad para las 12 propiedades. Factores: affordability (40%), risk fit (30%), preferencias del candidato (15%), probabilidad de aceptación (15%). Procesadas 8 de 12...',
          },
          {
            id: 's4', label: 'Seleccionando top 3 sugerencias', status: 'pending', stepType: 'decision' },
          {
            id: 's5', label: 'Enviando sugerencias al candidato', status: 'pending', stepType: 'notification' },
          {
            id: 's6', label: 'Notificando al agente asignado', status: 'pending', stepType: 'notification' },
        ],
      },
    },
    {
      id: 'act-1',
      agentId: 'tenant-scoring',
      description: 'Evaluó a María García',
      detail: 'Score A (92/100) — Apt 302 Chapinero',
      timestamp: new Date(now.getTime() - 3 * 60 * 1000),
      status: 'completed',
      metadata: { score: 92, level: 'A' },
      executionTrace: {
        id: 'trace-1',
        activityId: 'act-1',
        agentId: 'tenant-scoring',
        title: 'Evaluación de María García — CC 52.789.123',
        status: 'completed',
        startedAt: new Date(now.getTime() - 5 * 60 * 1000),
        completedAt: new Date(now.getTime() - 3 * 60 * 1000),
        totalDurationMs: 127000,
        steps: [
          {
            id: 's1', label: 'Recibiendo documentos', status: 'completed', stepType: 'document', durationMs: 1500,
            reasoning: 'Candidata subió cédula, certificación laboral de Google Colombia, y extractos bancarios Davivienda.',
            output: '3 archivos recibidos (PDF, 1.8 MB total)',
          },
          {
            id: 's2', label: 'Extracción OCR de documentos', status: 'completed', stepType: 'analysis', durationMs: 7200,
            reasoning: 'Documentos de alta calidad. Certificación laboral emitida hace 8 días, vigente.',
            output: 'Nombre: María García Pérez | CC: 52.789.123 | Empresa: Google Colombia SAS | Cargo: Product Manager | Salario: $12.500.000/mes | Antigüedad: 2 años 8 meses',
          },
          {
            id: 's3', label: 'Consultando DataCrédito', status: 'completed', stepType: 'browser', durationMs: 11500,
            reasoning: 'Historial crediticio impecable. Score 850/900. Sin reportes negativos en los últimos 5 años.',
            output: 'Score DataCrédito: 850/900 (Excelente) | 0 reportes negativos | Comportamiento: A+ últimos 60 meses',
          },
          {
            id: 's4', label: 'Verificando consistencia de ingresos', status: 'completed', stepType: 'analysis', durationMs: 5400,
            reasoning: 'Los extractos muestran depósitos consistentes de ~$12.5M los últimos 3 meses, coincide con salario declarado. Empresa Google Colombia verificada en RUES.',
            output: 'Ingresos verificados: $12.500.000/mes ✓ | Empresa activa en RUES ✓ | Consistencia: 100%',
          },
          {
            id: 's5', label: 'Calculando score de riesgo', status: 'completed', stepType: 'analysis', durationMs: 3200,
            reasoning: 'Todos los indicadores son positivos. Estabilidad financiera excelente (ingreso 4x canon típico), historial crediticio impecable, documentación completa y consistente.',
            output: 'Score: 92/100 — Nivel A | Financiera: 95 | Historial: 90 | Docs: 93 | Perfil: 88',
          },
          {
            id: 's6', label: 'Generando explicación y PDF', status: 'completed', stepType: 'document', durationMs: 4100,
            reasoning: 'Generando reporte completo con código de verificación.',
            output: 'PDF generado | Código: XK8M2P4T | Válido hasta: 2026-06-25',
          },
          {
            id: 's7', label: 'Notificando resultado', status: 'completed', stepType: 'notification', durationMs: 800,
            output: 'Notificación enviada a inmobiliaria y candidata por email + push',
          },
        ],
        result: 'Score A (92/100) — Candidata altamente calificada',
        conclusion: 'María García presenta un perfil excepcional. Ingresos verificados de $12.5M/mes (4x el canon promedio), historial crediticio impecable con DataCrédito 850/900, y documentación 100% consistente. Recomendación: aprobación inmediata sin condiciones.',
      },
    },
    {
      id: 'act-2',
      agentId: 'smart-matching',
      description: '3 propiedades sugeridas a candidato',
      detail: 'Carlos Ruiz aplicó a Apt 501 — le envió 3 alternativas compatibles en Usaquén',
      timestamp: new Date(now.getTime() - 12 * 60 * 1000),
      status: 'completed',
      metadata: { matches: 3, topMatch: 89 },
    },
    {
      id: 'act-3',
      agentId: 'tenant-scoring',
      description: 'Evaluación batch completada',
      detail: '5 candidatos procesados — 2A, 2B, 1C',
      timestamp: new Date(now.getTime() - 60 * 60 * 1000),
      status: 'completed',
      metadata: { processed: 5 },
    },
    {
      id: 'act-4',
      agentId: 'smart-matching',
      description: 'Reasignó candidato a agente de zona',
      detail: 'Candidato en Suba reasignado a Ana Torres (especialista del sector)',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      status: 'completed',
    },
    {
      id: 'act-5',
      agentId: 'tenant-scoring',
      description: 'Detectó inconsistencia documental',
      detail: 'Candidato Juan López — certificación laboral no coincide con extractos',
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      status: 'requires_attention',
    },
    {
      id: 'act-6',
      agentId: 'smart-matching',
      description: 'Envió sugerencias a 7 candidatos',
      detail: 'Casa Cedritos publicada hace 2h — notificó a 7 candidatos que habían aplicado a inmuebles similares',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      status: 'completed',
    },
    {
      id: 'act-7',
      agentId: 'tenant-scoring',
      description: 'Evaluó a Santiago Herrera',
      detail: 'Score B (74/100) — Apto 108 Santa Bárbara',
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      status: 'completed',
    },
    {
      id: 'act-8',
      agentId: 'smart-matching',
      description: '2 propiedades sugeridas a candidata',
      detail: 'Laura Mejía aplicó a Casa 45 Chía — le envió alternativas en Cajicá y Sopó',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      status: 'completed',
    },
    {
      id: 'act-9',
      agentId: 'tenant-scoring',
      description: 'Evaluó a Camila Ortiz',
      detail: 'Score A (88/100) — Apto 901 El Poblado',
      timestamp: new Date(now.getTime() - 7 * 60 * 60 * 1000),
      status: 'completed',
    },
    {
      id: 'act-10',
      agentId: 'smart-matching',
      description: 'Reasignó 3 candidatos a nuevo agente',
      detail: 'Agente Paula Ríos asumió zona Chapinero — 3 leads transferidos automáticamente',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      status: 'completed',
    },
    {
      id: 'act-11',
      agentId: 'tenant-scoring',
      description: 'Evaluación rechazada por documentos',
      detail: 'Candidato Andrés Vargas — extractos bancarios ilegibles, solicitó reenvío',
      timestamp: new Date(now.getTime() - 9 * 60 * 60 * 1000),
      status: 'requires_attention',
    },
    {
      id: 'act-12',
      agentId: 'smart-matching',
      description: 'Re-escaneo automático de portafolio',
      detail: 'Apto 302 Laureles lleva 8 días sin aplicantes — envió sugerencia a 4 candidatos compatibles',
      timestamp: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      status: 'completed',
    },
  ];
}

export function getAgentById(id: AIAgentId): AIAgentDefinition | undefined {
  return AI_AGENTS.find(a => a.id === id);
}

export function getActiveAgents(): AIAgentDefinition[] {
  return AI_AGENTS.filter(a => a.status === 'active');
}

export function getComingSoonAgents(): AIAgentDefinition[] {
  return AI_AGENTS.filter(a => a.status === 'coming_soon');
}
