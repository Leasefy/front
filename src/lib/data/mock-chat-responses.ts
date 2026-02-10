/**
 * Mock AI responses for the Beta chat interface.
 *
 * Keyword-based response matching simulating a Colombian rental management AI.
 * Each response is 2-4 sentences in realistic landlord assistant tone (Spanish).
 *
 * Will be replaced by real Claude API calls in Phase 24.
 */

// ============================================================================
// Response Map
// ============================================================================

interface MockResponseEntry {
  keywords: string[];
  response: string;
}

const MOCK_RESPONSES: MockResponseEntry[] = [
  {
    keywords: ['cobro', 'cobros', 'recaudo', 'recaudos'],
    response:
      'Este mes tienes 12 cobros activos por un total de $8.450.000 COP. ' +
      'De estos, 9 ya fueron pagados a tiempo y 3 estan pendientes. ' +
      'Los inquilinos con pagos pendientes son: Apt 301 (Maria Lopez), Apt 502 (Carlos Ruiz) y Local 1A (Andres Martinez). ' +
      'Puedo enviar recordatorios automaticos si lo necesitas.',
  },
  {
    keywords: ['propiedad', 'propiedades', 'inmueble', 'inmuebles', 'apartamento'],
    response:
      'Tienes 5 propiedades registradas en tu portafolio. ' +
      '4 estan arrendadas y 1 esta vacante (Apt 201, Edificio Torres del Parque). ' +
      'La vacante lleva 18 dias sin inquilino. Tengo 3 candidatos pre-filtrados que podrian interesarte. ' +
      'Quieres que te muestre el perfil de riesgo de cada candidato?',
  },
  {
    keywords: ['decision', 'decisiones', 'pendiente', 'pendientes', 'aprobar'],
    response:
      'Tienes 2 decisiones pendientes que requieren tu aprobacion. ' +
      'Primera: renovacion de contrato para Apt 301 — el inquilino solicita renovar por 12 meses con un ajuste del 5.2% (IPC). ' +
      'Segunda: solicitud de mantenimiento urgente en Apt 502 — fuga de agua en bano principal, presupuesto estimado $380.000 COP. ' +
      'Puedo mostrarte los detalles de cualquiera de las dos.',
  },
  {
    keywords: ['reporte', 'reportes', 'informe', 'resumen', 'financiero'],
    response:
      'Tu reporte financiero de enero muestra ingresos totales de $8.450.000 COP con gastos operativos de $1.230.000 COP. ' +
      'Tu rentabilidad neta fue del 85.4%, un 2.1% mejor que el mes anterior. ' +
      'El principal gasto fue mantenimiento preventivo ($680.000). ' +
      'Quieres que genere el reporte completo en PDF?',
  },
  {
    keywords: ['mantenimiento', 'reparacion', 'reparar', 'arreglo', 'arreglar', 'dano'],
    response:
      'Hay 3 solicitudes de mantenimiento activas en tu portafolio. ' +
      'Una urgente: fuga de agua en Apt 502 (reportada hace 2 dias, presupuesto $380.000 COP). ' +
      'Dos preventivas: revision de gas en Apt 301 (vence en 15 dias) y pintura general en Local 1A (programada para marzo). ' +
      'Recomiendo priorizar la fuga del 502 para evitar danos mayores.',
  },
  {
    keywords: ['contrato', 'contratos', 'renovacion', 'renovar', 'arriendo'],
    response:
      'Tienes 5 contratos activos. Uno esta proximo a vencer: Apt 301 vence el 28 de febrero. ' +
      'El inquilino ya solicito renovacion por 12 meses con ajuste IPC (5.2%). ' +
      'Los demas contratos tienen vigencia hasta segundo semestre. ' +
      'Quieres que prepare el documento de renovacion para el Apt 301?',
  },
  {
    keywords: ['inquilino', 'inquilinos', 'arrendatario', 'arrendatarios', 'tenant'],
    response:
      'Tienes 4 inquilinos activos en tu portafolio. ' +
      'Todos al dia excepto Carlos Ruiz (Apt 502) que tiene un pago pendiente de 5 dias. ' +
      'Score de cumplimiento promedio: 87/100. Tu mejor inquilino es Ana Gutierrez (Apt 401) con score perfecto. ' +
      'Quieres ver el detalle de algun inquilino en particular?',
  },
  {
    keywords: ['mora', 'moroso', 'atrasado', 'atraso', 'deuda', 'debe'],
    response:
      'Actualmente tienes 1 inquilino en mora: Carlos Ruiz del Apt 502. ' +
      'Debe $1.350.000 COP correspondientes al canon de febrero (5 dias de atraso). ' +
      'Su historico muestra que ha pagado tarde 2 de los ultimos 6 meses. ' +
      'Puedo enviarle un recordatorio formal o quieres que active el protocolo de cobro?',
  },
  {
    keywords: ['pago', 'pagos', 'consignacion', 'transferencia', 'banco'],
    response:
      'En el ultimo mes se registraron 9 pagos exitosos por un total de $7.100.000 COP. ' +
      'El 78% fueron por transferencia bancaria y el 22% por consignacion. ' +
      'Tienes 3 pagos pendientes que suman $1.350.000 COP. ' +
      'El proximo ciclo de dispersiones a tu cuenta esta programado para el viernes.',
  },
  {
    keywords: ['candidato', 'candidatos', 'aplicacion', 'postulacion', 'filtro'],
    response:
      'Tienes 3 candidatos pre-filtrados para el Apt 201. ' +
      'El mejor calificado es Laura Mendez con un score de riesgo de 92/100: empleada formal con contrato indefinido, sin antecedentes negativos. ' +
      'Los otros dos candidatos tienen scores de 78 y 71 respectivamente. ' +
      'Quieres que programe visitas para los candidatos con score mayor a 75?',
  },
];

const FALLBACK_RESPONSE =
  'Entiendo tu consulta. Como tu asistente de administracion de arriendos, ' +
  'puedo ayudarte con cobros, propiedades, contratos, mantenimiento, inquilinos y reportes financieros. ' +
  'Podrias ser mas especifico sobre lo que necesitas? ' +
  'Por ejemplo, puedo revisar el estado de tus cobros o generar un reporte de pagos.';

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
