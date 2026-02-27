/**
 * Mock AI responses for the Beta chat interface.
 *
 * Keyword-based response matching simulating a Colombian rental management AI.
 * Each response includes metadata for structured card display.
 *
 * Will be replaced by real Claude API calls in Phase 24.
 */

import type { ResponseMeta } from '@/lib/types/beta-chat';

// ============================================================================
// Response Map
// ============================================================================

interface MockResponseEntry {
  keywords: string[];
  response: string;
  meta: ResponseMeta;
}

const MOCK_RESPONSES: MockResponseEntry[] = [
  {
    keywords: ['cobro', 'cobros', 'recaudo', 'recaudos'],
    response:
      'Este mes tienes **12 cobros activos** por un total de **$8.450.000 COP**. Aqui va el resumen:\n\n' +
      '| Propiedad | Inquilino | Monto | Estado |\n' +
      '|-----------|-----------|-------|--------|\n' +
      '| Apt 301 | Maria Lopez | $1.450.000 | Pendiente |\n' +
      '| Apt 502 | Carlos Ruiz | $1.350.000 | Pendiente |\n' +
      '| Local 1A | Andres Martinez | $2.100.000 | Pendiente |\n' +
      '| Apt 401 | Ana Gutierrez | $1.200.000 | Pagado |\n' +
      '| Apt 601 | Luis Herrera | $2.350.000 | Pagado |\n\n' +
      'De estos, **9 ya fueron pagados** a tiempo y **3 estan pendientes**. Puedo enviar recordatorios automaticos si lo necesitas.',
    meta: {
      type: 'actionable',
      title: 'Resumen de cobros del mes',
      summary: '12 cobros activos — $8.450.000 COP — 3 pendientes',
      primaryAgent: 'cobranza',
      actions: [
        { id: 'go-cobros', label: 'Ver todos los cobros', href: '/panel/cobros', icon: 'CurrencyDollar', variant: 'primary' },
        { id: 'send-reminders', label: 'Enviar recordatorios', icon: 'ChatCircle', variant: 'secondary' },
        { id: 'export-report', label: 'Exportar reporte', icon: 'FileText', variant: 'ghost' },
      ],
      steps: [
        { id: 's1', label: 'Analisis financiero', status: 'completed', agentType: 'cobranza' },
        { id: 's2', label: 'Verificacion de inquilinos', status: 'completed', agentType: 'pipeline' },
        { id: 's3', label: 'Estado de pagos', status: 'completed', agentType: 'reportes' },
        { id: 's4', label: 'Preparar recordatorios', status: 'active', agentType: 'comunicacion' },
      ],
    },
  },
  {
    keywords: ['propiedad', 'propiedades', 'inmueble', 'inmuebles', 'apartamento'],
    response:
      'Tienes **5 propiedades** registradas en tu portafolio:\n\n' +
      '- **Apt 201** (Torres del Parque) — Vacante, 18 dias sin inquilino\n' +
      '- **Apt 301** (Torres del Parque) — Arrendado a Maria Lopez\n' +
      '- **Apt 401** (Torres del Parque) — Arrendado a Ana Gutierrez\n' +
      '- **Apt 502** (Edificio Central) — Arrendado a Carlos Ruiz\n' +
      '- **Local 1A** (Centro Comercial Norte) — Arrendado a Andres Martinez\n\n' +
      'La vacante del **Apt 201** tiene 3 candidatos pre-filtrados. Quieres que te muestre el perfil de riesgo de cada candidato?',
    meta: {
      type: 'actionable',
      title: 'Estado del portafolio',
      summary: '5 propiedades — 1 vacante — 4 arrendadas',
      primaryAgent: 'pipeline',
      actions: [
        { id: 'go-portafolio', label: 'Ver portafolio', href: '/panel/portafolio', icon: 'FunnelSimple', variant: 'primary' },
        { id: 'view-candidates', label: 'Ver candidatos Apt 201', icon: 'FunnelSimple', variant: 'secondary' },
        { id: 'add-property', label: 'Agregar propiedad', icon: 'Wrench', variant: 'ghost' },
      ],
      steps: [
        { id: 's1', label: 'Carga de portafolio', status: 'completed', agentType: 'pipeline' },
        { id: 's2', label: 'Verificacion de cobros', status: 'completed', agentType: 'cobranza' },
        { id: 's3', label: 'Mantenimientos pendientes', status: 'completed', agentType: 'mantenimiento' },
        { id: 's4', label: 'Busqueda de candidatos', status: 'active', agentType: 'pipeline' },
      ],
    },
  },
  {
    keywords: ['decision', 'decisiones', 'pendiente', 'pendientes', 'aprobar'],
    response:
      'Tienes **2 decisiones pendientes** que requieren tu aprobacion:\n\n' +
      '1. **Renovacion de contrato** — Apt 301\n' +
      '   - Inquilino solicita renovar por 12 meses\n' +
      '   - Ajuste propuesto: **5.2% (IPC)**\n' +
      '   - Score de cumplimiento del inquilino: **92/100**\n\n' +
      '2. **Mantenimiento urgente** — Apt 502\n' +
      '   - Fuga de agua en bano principal\n' +
      '   - Presupuesto estimado: **$380.000 COP**\n' +
      '   - Proveedor recomendado: Plomeria Express (4.8 estrellas)\n\n' +
      'Puedo mostrarte los detalles completos de cualquiera de las dos.',
    meta: {
      type: 'actionable',
      title: 'Decisiones pendientes',
      summary: '2 decisiones requieren tu aprobacion',
      primaryAgent: 'documentos',
      actions: [
        { id: 'go-decisions', label: 'Revisar decisiones', icon: 'ListChecks', variant: 'primary' },
        { id: 'approve-all', label: 'Aprobar recomendadas', icon: 'CheckCircle', variant: 'secondary' },
      ],
      steps: [
        { id: 's1', label: 'Recopilacion de decisiones', status: 'completed', agentType: 'documentos' },
        { id: 's2', label: 'Evaluacion de impacto', status: 'completed', agentType: 'reportes' },
        { id: 's3', label: 'Preparacion de opciones', status: 'completed', agentType: 'comunicacion' },
        { id: 's4', label: 'Tu aprobacion', status: 'active' },
      ],
    },
  },
  {
    keywords: ['reporte', 'reportes', 'informe', 'resumen', 'financiero'],
    response:
      'Tu reporte financiero de **enero 2026** muestra los siguientes resultados:\n\n' +
      '| Concepto | Monto |\n' +
      '|----------|-------|\n' +
      '| Ingresos totales | **$8.450.000 COP** |\n' +
      '| Gastos operativos | **$1.230.000 COP** |\n' +
      '| Mantenimiento preventivo | $680.000 |\n' +
      '| Seguros | $350.000 |\n' +
      '| Administracion | $200.000 |\n' +
      '| **Rentabilidad neta** | **85.4%** |\n\n' +
      'Tu rentabilidad es **2.1% mejor** que el mes anterior. El principal gasto fue mantenimiento preventivo. Quieres que genere el reporte completo en PDF?',
    meta: {
      type: 'informative',
      title: 'Reporte financiero — Enero 2026',
      summary: 'Rentabilidad neta 85.4% — +2.1% vs mes anterior',
      primaryAgent: 'reportes',
      actions: [
        { id: 'go-analytics', label: 'Ver analytics', href: '/panel/analytics', icon: 'ChartBar', variant: 'primary' },
        { id: 'export-pdf', label: 'Exportar PDF', icon: 'FileText', variant: 'secondary' },
      ],
    },
  },
  {
    keywords: ['mantenimiento', 'reparacion', 'reparar', 'arreglo', 'arreglar', 'dano'],
    response:
      'Hay **3 solicitudes de mantenimiento** activas en tu portafolio:\n\n' +
      '- **Fuga de agua** (Apt 502) — Urgente\n' +
      '  - Reportada hace 2 dias, presupuesto **$380.000 COP**\n' +
      '  - Estado: esperando aprobacion\n' +
      '- **Revision de gas** (Apt 301) — Preventivo\n' +
      '  - Vence en 15 dias, certificacion obligatoria\n' +
      '  - Proveedor asignado: GasNatural S.A.\n' +
      '- **Pintura general** (Local 1A) — Preventivo\n' +
      '  - Programada para marzo, presupuesto **$450.000 COP**\n' +
      '  - Ultima pintura: hace 14 meses\n\n' +
      'Recomiendo **priorizar la fuga del 502** para evitar danos mayores.',
    meta: {
      type: 'actionable',
      title: 'Solicitudes de mantenimiento',
      summary: '3 solicitudes activas — 1 urgente',
      primaryAgent: 'mantenimiento',
      actions: [
        { id: 'go-maint', label: 'Ver mantenimientos', href: '/panel/operaciones', icon: 'Wrench', variant: 'primary' },
        { id: 'approve-urgent', label: 'Aprobar urgente', icon: 'CheckCircle', variant: 'secondary' },
        { id: 'contact-provider', label: 'Contactar proveedor', icon: 'ChatCircle', variant: 'ghost' },
      ],
      steps: [
        { id: 's1', label: 'Revision de solicitudes', status: 'completed', agentType: 'mantenimiento' },
        { id: 's2', label: 'Verificacion de presupuesto', status: 'completed', agentType: 'cobranza' },
        { id: 's3', label: 'Busqueda de proveedores', status: 'completed', agentType: 'comunicacion' },
        { id: 's4', label: 'Aprobacion de reparacion', status: 'active' },
      ],
    },
  },
  {
    keywords: ['contrato', 'contratos', 'renovacion', 'renovar', 'arriendo'],
    response:
      'Tienes **5 contratos activos**. Aqui va el estado de cada uno:\n\n' +
      '| Propiedad | Inquilino | Vencimiento | Estado |\n' +
      '|-----------|-----------|-------------|--------|\n' +
      '| Apt 301 | Maria Lopez | 28 Feb 2026 | Proximo a vencer |\n' +
      '| Apt 401 | Ana Gutierrez | 15 Jul 2026 | Vigente |\n' +
      '| Apt 502 | Carlos Ruiz | 30 Ago 2026 | Vigente |\n' +
      '| Apt 601 | Luis Herrera | 01 Oct 2026 | Vigente |\n' +
      '| Local 1A | Andres Martinez | 31 Dic 2026 | Vigente |\n\n' +
      'El contrato del **Apt 301 vence en 18 dias**. El inquilino ya solicito renovacion por 12 meses con ajuste IPC (5.2%). Quieres que prepare el documento de renovacion?',
    meta: {
      type: 'actionable',
      title: 'Estado de contratos',
      summary: '5 contratos — 1 proximo a vencer',
      primaryAgent: 'documentos',
      actions: [
        { id: 'go-contracts', label: 'Ver contratos', href: '/panel/contratos', icon: 'FileText', variant: 'primary' },
        { id: 'renew-301', label: 'Renovar Apt 301', icon: 'FileText', variant: 'secondary' },
      ],
      steps: [
        { id: 's1', label: 'Consulta de contratos', status: 'completed', agentType: 'documentos' },
        { id: 's2', label: 'Historial de pagos', status: 'completed', agentType: 'cobranza' },
        { id: 's3', label: 'Notificaciones de vencimiento', status: 'completed', agentType: 'comunicacion' },
        { id: 's4', label: 'Preparar renovacion', status: 'active', agentType: 'documentos' },
      ],
    },
  },
  {
    keywords: ['inquilino', 'inquilinos', 'arrendatario', 'arrendatarios', 'tenant'],
    response:
      'Tienes **4 inquilinos activos** en tu portafolio:\n\n' +
      '1. **Ana Gutierrez** (Apt 401) — Score: **100/100**\n' +
      '   - Siempre paga a tiempo, inquilina modelo\n' +
      '2. **Maria Lopez** (Apt 301) — Score: **92/100**\n' +
      '   - Buen historial, contrato proximo a renovar\n' +
      '3. **Luis Herrera** (Apt 601) — Score: **85/100**\n' +
      '   - Pago tardio 1 vez en 8 meses\n' +
      '4. **Carlos Ruiz** (Apt 502) — Score: **68/100**\n' +
      '   - Pago pendiente actual, 2 atrasos en 6 meses\n\n' +
      'Score de cumplimiento promedio: **87/100**. Quieres ver el detalle de algun inquilino en particular?',
    meta: {
      type: 'informative',
      title: 'Inquilinos activos',
      summary: '4 inquilinos — Score promedio 87/100',
      primaryAgent: 'pipeline',
      actions: [
        { id: 'go-tenants', label: 'Ver inquilinos', href: '/panel/propietarios', icon: 'FunnelSimple', variant: 'primary' },
        { id: 'view-risky', label: 'Revisar Carlos Ruiz', icon: 'FunnelSimple', variant: 'secondary' },
      ],
    },
  },
  {
    keywords: ['mora', 'moroso', 'atrasado', 'atraso', 'deuda', 'debe'],
    response:
      'Actualmente tienes **1 inquilino en mora**: Carlos Ruiz del Apt 502.\n\n' +
      '**Detalle de la mora:**\n' +
      '- Canon de febrero: **$1.350.000 COP**\n' +
      '- Dias de atraso: **5 dias**\n' +
      '- Historico: ha pagado tarde 2 de los ultimos 6 meses\n' +
      '- Score actual: **68/100** (tendencia a la baja)\n\n' +
      'Opciones disponibles:\n' +
      '1. Enviar recordatorio por WhatsApp\n' +
      '2. Activar protocolo de cobro formal\n' +
      '3. Programar llamada automatica\n\n' +
      'Cual prefieres?',
    meta: {
      type: 'actionable',
      title: 'Inquilino en mora',
      summary: 'Carlos Ruiz — $1.350.000 COP — 5 dias de atraso',
      primaryAgent: 'cobranza',
      actions: [
        { id: 'send-whatsapp', label: 'Enviar recordatorio', icon: 'ChatCircle', variant: 'primary' },
        { id: 'formal-process', label: 'Cobro formal', icon: 'FileText', variant: 'secondary' },
        { id: 'schedule-call', label: 'Programar llamada', icon: 'ChatCircle', variant: 'ghost' },
      ],
      steps: [
        { id: 's1', label: 'Deteccion de mora', status: 'completed', agentType: 'cobranza' },
        { id: 's2', label: 'Evaluacion del inquilino', status: 'completed', agentType: 'pipeline' },
        { id: 's3', label: 'Opciones de accion', status: 'completed', agentType: 'comunicacion' },
        { id: 's4', label: 'Tu decision', status: 'active' },
      ],
    },
  },
  {
    keywords: ['pago', 'pagos', 'consignacion', 'transferencia', 'banco'],
    response:
      'En el ultimo mes se registraron **9 pagos exitosos** por un total de **$7.100.000 COP**:\n\n' +
      '| Metodo | Cantidad | Porcentaje |\n' +
      '|--------|----------|------------|\n' +
      '| Transferencia bancaria | 7 | 78% |\n' +
      '| Consignacion | 2 | 22% |\n\n' +
      'Tienes **3 pagos pendientes** que suman **$1.350.000 COP**.\n\n' +
      'El proximo ciclo de dispersiones a tu cuenta esta programado para el **viernes 14 de febrero**.',
    meta: {
      type: 'informative',
      title: 'Resumen de pagos',
      summary: '9 pagos recibidos — $7.100.000 COP — 3 pendientes',
      primaryAgent: 'cobranza',
      actions: [
        { id: 'go-cobros', label: 'Ver cobros', href: '/panel/cobros', icon: 'CurrencyDollar', variant: 'primary' },
        { id: 'go-dispersions', label: 'Ver dispersiones', href: '/panel/dispersiones', icon: 'CurrencyDollar', variant: 'secondary' },
      ],
    },
  },
  {
    keywords: ['candidato', 'candidatos', 'aplicacion', 'postulacion', 'filtro'],
    response:
      'Tienes **3 candidatos pre-filtrados** para el Apt 201:\n\n' +
      '1. **Laura Mendez** — Score: **92/100**\n' +
      '   - Empleada formal, contrato indefinido\n' +
      '   - Sin antecedentes negativos\n' +
      '   - Ingreso mensual: $4.200.000 COP\n\n' +
      '2. **Diego Ramirez** — Score: **78/100**\n' +
      '   - Independiente, 3 anos de actividad\n' +
      '   - Una referencia comercial pendiente\n\n' +
      '3. **Valentina Torres** — Score: **71/100**\n' +
      '   - Empleada temporal, 8 meses en cargo actual\n' +
      '   - Codeudor disponible\n\n' +
      'Quieres que programe visitas para los candidatos con score mayor a 75?',
    meta: {
      type: 'actionable',
      title: 'Candidatos para Apt 201',
      summary: '3 candidatos pre-filtrados — Score max 92/100',
      primaryAgent: 'pipeline',
      actions: [
        { id: 'go-pipeline', label: 'Ver pipeline', href: '/panel/pipeline', icon: 'FunnelSimple', variant: 'primary' },
        { id: 'schedule-visits', label: 'Programar visitas', icon: 'ChatCircle', variant: 'secondary' },
        { id: 'approve-top', label: 'Aprobar Laura Mendez', icon: 'CheckCircle', variant: 'ghost' },
      ],
      steps: [
        { id: 's1', label: 'Filtrado de candidatos', status: 'completed', agentType: 'pipeline' },
        { id: 's2', label: 'Verificacion documental', status: 'completed', agentType: 'documentos' },
        { id: 's3', label: 'Evaluacion financiera', status: 'completed', agentType: 'cobranza' },
        { id: 's4', label: 'Programar visitas', status: 'active', agentType: 'comunicacion' },
      ],
    },
  },
  {
    keywords: ['api', 'integracion', 'configurar', 'webhook', 'clave'],
    response:
      'Tu configuracion de integraciones esta asi:\n\n' +
      '**APIs activas:**\n' +
      '- WhatsApp Business (Twilio): Conectada\n' +
      '- Bancolombia Open Banking: Conectada\n' +
      '- DIAN Consultas: Pendiente\n\n' +
      'Para configurar una nueva integracion, necesitas tu API key:\n\n' +
      '```\n' +
      'LEASEFY_API_KEY=lsf_live_a1b2c3d4e5f6\n' +
      'WEBHOOK_URL=https://api.leasefy.co/v1/webhook\n' +
      '```\n\n' +
      'Puedes encontrar tus claves en **Configuracion > Integraciones**. Necesitas ayuda con alguna integracion especifica?',
    meta: {
      type: 'informative',
      title: 'Integraciones configuradas',
      summary: '2 APIs activas — 1 pendiente',
      primaryAgent: 'documentos',
      actions: [
        { id: 'go-config', label: 'Ir a configuracion', href: '/panel/config', icon: 'GearSix', variant: 'primary' },
      ],
    },
  },
  {
    keywords: ['ayuda', 'como', 'puedo', 'puedes', 'funciona', 'explicar'],
    response:
      'Como tu asistente de administracion, puedo ayudarte con:\n\n' +
      '**Gestion financiera:**\n' +
      '- Revisar cobros y pagos pendientes\n' +
      '- Generar reportes financieros\n' +
      '- Programar dispersiones\n\n' +
      '**Propiedades e inquilinos:**\n' +
      '- Estado de tu portafolio\n' +
      '- Filtrado de candidatos\n' +
      '- Scoring de inquilinos\n\n' +
      '**Operaciones:**\n' +
      '- Contratos y renovaciones\n' +
      '- Solicitudes de mantenimiento\n' +
      '- Comunicaciones automaticas\n\n' +
      'Solo preguntame lo que necesites y yo me encargo.',
    meta: {
      type: 'informative',
      title: 'Como puedo ayudarte',
      summary: 'Gestion financiera, propiedades, operaciones y mas',
      primaryAgent: 'comunicacion',
      actions: [],
    },
  },
];

const FALLBACK_RESPONSE =
  'Entiendo tu consulta. Como tu asistente de administracion de arriendos, ' +
  'puedo ayudarte con **cobros**, **propiedades**, **contratos**, **mantenimiento**, ' +
  '**inquilinos** y **reportes financieros**.\n\n' +
  'Podrias ser mas especifico sobre lo que necesitas? Por ejemplo:\n' +
  '- "Muestra mis cobros pendientes"\n' +
  '- "Como van mis propiedades?"\n' +
  '- "Genera un reporte financiero"';

const FALLBACK_META: ResponseMeta = {
  type: 'informative',
  title: 'Asistente de arriendos',
  summary: 'Puedo ayudarte con cobros, propiedades, contratos y mas',
  actions: [],
  primaryAgent: 'comunicacion',
};

// ============================================================================
// Matcher
// ============================================================================

/**
 * Returns a mock AI response based on keyword matching against the user message.
 * Falls back to a generic response if no keywords match.
 */
export function getMockResponse(userMessage: string): string {
  const normalized = userMessage.toLowerCase();

  for (const entry of MOCK_RESPONSES) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) {
      return entry.response;
    }
  }

  return FALLBACK_RESPONSE;
}

/**
 * Returns response metadata for structured card display.
 */
export function getMockResponseMeta(userMessage: string): ResponseMeta {
  const normalized = userMessage.toLowerCase();

  for (const entry of MOCK_RESPONSES) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) {
      return entry.meta;
    }
  }

  return FALLBACK_META;
}
