/**
 * Mock briefing data for the Beta daily briefing feature.
 *
 * Generates realistic Colombian rental portfolio briefings with
 * cobros, pipeline, mantenimiento, and decisiones pendientes sections.
 */

import type { DailyBriefing, BriefingSection } from '@/lib/types/beta-chat';

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `brief_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(7, 0, 0, 0); // Briefings generated at 7am
  return d;
}

// ============================================================================
// Section Templates
// ============================================================================

const COBROS_SECTIONS: BriefingSection[] = [
  {
    id: 'cobros',
    title: 'Cobros',
    icon: 'CurrencyDollar',
    color: 'emerald',
    summary: '3 de 12 cobros recibidos este mes. $4.2M pendiente. 2 inquilinos en mora >15 dias.',
    details: [
      'Maria Gutierrez (Apt 301): $1.8M pendiente, 18 dias de mora. Recordatorio enviado ayer.',
      'Carlos Mendoza (Apt 105): $1.2M pendiente, 16 dias de mora. Sin respuesta a 2 mensajes.',
      'Proximo vencimiento masivo: 5 cobros el 1 de marzo ($6.5M total).',
    ],
    actionLabel: 'Cuentame mas sobre cobros',
    actionContext: 'Quiero un resumen detallado de mis cobros pendientes y las acciones recomendadas.',
  },
  {
    id: 'cobros',
    title: 'Cobros',
    icon: 'CurrencyDollar',
    color: 'emerald',
    summary: '7 de 12 cobros recibidos. $2.8M pendiente. 1 inquilino en mora critica.',
    details: [
      'Laura Restrepo (Apt 201): $1.5M pendiente, 22 dias de mora. Se programo llamada para hoy.',
      'Felipe Torres (Local 3): $800K pendiente, 8 dias. Pago parcial de $400K recibido ayer.',
      'Recaudo del mes: 58% ($8.2M de $14.1M).',
    ],
    actionLabel: 'Cuentame mas sobre cobros',
    actionContext: 'Dame el detalle de los cobros pendientes y que acciones tomar con los morosos.',
  },
  {
    id: 'cobros',
    title: 'Cobros',
    icon: 'CurrencyDollar',
    color: 'emerald',
    summary: '10 de 12 cobros completados. $1.1M pendiente. Sin moras criticas.',
    details: [
      'Andres Castillo (Apt 402): $650K pendiente, 5 dias. Prometio pagar el viernes.',
      'Diana Lopez (Apt 603): $450K pendiente, 3 dias. Primera vez en mora.',
      'Recaudo excelente: 92% completado este mes.',
    ],
    actionLabel: 'Cuentame mas sobre cobros',
    actionContext: 'Como va el recaudo este mes y que hago con los 2 cobros restantes?',
  },
  {
    id: 'cobros',
    title: 'Cobros',
    icon: 'CurrencyDollar',
    color: 'emerald',
    summary: '5 de 12 cobros recibidos. $3.5M pendiente. 3 en mora temprana (5-10 dias).',
    details: [
      'Juan Pablo Sierra (Apt 101): $1.2M, 10 dias de mora. WhatsApp leido sin respuesta.',
      'Sofia Herrera (Apt 404): $1.1M, 7 dias. Dice que paga el lunes.',
      'Roberto Vargas (Apt 502): $1.2M, 5 dias. Sin contacto aun.',
    ],
    actionLabel: 'Cuentame mas sobre cobros',
    actionContext: 'Necesito saber que hacer con los inquilinos en mora temprana.',
  },
  {
    id: 'cobros',
    title: 'Cobros',
    icon: 'CurrencyDollar',
    color: 'emerald',
    summary: '2 de 12 cobros recibidos. $5.8M pendiente. Inicio de mes, 10 por cobrar.',
    details: [
      'Primeros 2 cobros puntuales: Patricia Arias (Apt 201) y Miguel Duarte (Apt 302).',
      'Fecha limite masiva: 5 de febrero. 8 cobros esperados ($5.8M).',
      'Historico: 85% paga antes del dia 5, 95% antes del dia 10.',
    ],
    actionLabel: 'Cuentame mas sobre cobros',
    actionContext: 'Como viene el recaudo este mes y hay algo que deba hacer proactivamente?',
  },
];

const PIPELINE_SECTIONS: BriefingSection[] = [
  {
    id: 'pipeline',
    title: 'Pipeline',
    icon: 'FunnelSimple',
    color: 'blue',
    summary: '5 aplicaciones nuevas. 2 candidatos con score >80. 1 propiedad sin aplicantes por 7 dias.',
    details: [
      'Apt 204 (Chapinero): 3 aplicaciones. Mejor candidato: Camila Ruiz, score 87.',
      'Local 2 (Usaquen): 2 aplicaciones. Candidato destacado: Empresa ABC Ltda, score 82.',
      'Apt 601 (Cedritos): 0 aplicaciones en 7 dias. Considerar ajustar precio o publicacion.',
    ],
    actionLabel: 'Cuentame mas sobre pipeline',
    actionContext: 'Dame el detalle del pipeline de arrendamiento y los candidatos destacados.',
  },
  {
    id: 'pipeline',
    title: 'Pipeline',
    icon: 'FunnelSimple',
    color: 'blue',
    summary: '3 aplicaciones en revision. 1 candidato listo para visita. 2 propiedades vacantes.',
    details: [
      'Apt 105 (Santa Barbara): Nicolas Bernal, score 91. Visita agendada para manana 3pm.',
      'Apt 303 (Chico): 2 aplicaciones nuevas, pendientes de verificacion de referencias.',
      'Apt 601 vacante hace 12 dias. Recomendacion: reducir canon un 5%.',
    ],
    actionLabel: 'Cuentame mas sobre pipeline',
    actionContext: 'Que pasa con mis propiedades vacantes y los candidatos activos?',
  },
  {
    id: 'pipeline',
    title: 'Pipeline',
    icon: 'FunnelSimple',
    color: 'blue',
    summary: '8 aplicaciones esta semana. 4 visitas programadas. Todas las propiedades con interes.',
    details: [
      'Mejor semana del mes: 8 aplicaciones vs promedio de 4.',
      'Apt 204: 2 visitas hoy (10am Gomez, 2pm Alvarez).',
      'Local 2: Candidato preaprobado, pendiente firma de contrato.',
    ],
    actionLabel: 'Cuentame mas sobre pipeline',
    actionContext: 'Como va el pipeline de arriendos esta semana?',
  },
  {
    id: 'pipeline',
    title: 'Pipeline',
    icon: 'FunnelSimple',
    color: 'blue',
    summary: '1 nueva aplicacion. 0 visitas programadas. 1 propiedad necesita atencion.',
    details: [
      'Semana lenta: solo 1 aplicacion para Apt 105 (Andrea Moreno, score 72).',
      'Apt 303: sin aplicaciones en 15 dias. Urgente revisar publicacion.',
      'Sugerencia: mejorar fotos y descripcion en portales.',
    ],
    actionLabel: 'Cuentame mas sobre pipeline',
    actionContext: 'El pipeline esta lento, que estrategias me recomiendas?',
  },
  {
    id: 'pipeline',
    title: 'Pipeline',
    icon: 'FunnelSimple',
    color: 'blue',
    summary: '4 aplicaciones activas. 1 contrato en firma. 0 propiedades vacantes.',
    details: [
      'Apt 502: Contrato con familia Rodriguez en proceso de firma. Inicio marzo 1.',
      '3 aplicaciones de respaldo para futuras vacantes.',
      'Ocupacion del portafolio: 100% (12 de 12 unidades).',
    ],
    actionLabel: 'Cuentame mas sobre pipeline',
    actionContext: 'Como esta la ocupacion de mi portafolio y los contratos en proceso?',
  },
];

const MANTENIMIENTO_SECTIONS: BriefingSection[] = [
  {
    id: 'mantenimiento',
    title: 'Mantenimiento',
    icon: 'Wrench',
    color: 'amber',
    summary: '1 solicitud urgente (fuga Apt 502). 2 reparaciones programadas. Presupuesto: 68% utilizado.',
    details: [
      'URGENTE: Fuga de agua en Apt 502. Plomero contactado, llega hoy entre 2-4pm.',
      'Apt 301: Pintura programada para sabado. Cotizacion aprobada: $380K.',
      'Apt 105: Revision electrica pendiente. Programada para la proxima semana.',
    ],
    actionLabel: 'Cuentame mas sobre mantenimiento',
    actionContext: 'Dame el estado de las solicitudes de mantenimiento, especialmente la urgente.',
  },
  {
    id: 'mantenimiento',
    title: 'Mantenimiento',
    icon: 'Wrench',
    color: 'amber',
    summary: '0 urgencias. 3 preventivos programados. Presupuesto: 45% utilizado.',
    details: [
      'Revision de calderas: 4 unidades programadas para esta semana.',
      'Apt 201: Cambio de cerradura completado ayer. Costo: $120K.',
      'Presupuesto mensual: $2.1M utilizados de $4.7M disponibles.',
    ],
    actionLabel: 'Cuentame mas sobre mantenimiento',
    actionContext: 'Cual es el estado del mantenimiento preventivo esta semana?',
  },
  {
    id: 'mantenimiento',
    title: 'Mantenimiento',
    icon: 'Wrench',
    color: 'amber',
    summary: '2 solicitudes nuevas. 1 en progreso. Presupuesto: 82% utilizado.',
    details: [
      'Apt 404: Aire acondicionado no enfria. Tecnico asignado para manana.',
      'Local 2: Gotera en techo. Pendiente cotizacion del impermeabilizador.',
      'Apt 603: Cambio de piso en progreso. 70% completado, entrega viernes.',
    ],
    actionLabel: 'Cuentame mas sobre mantenimiento',
    actionContext: 'Hay solicitudes de mantenimiento que requieran mi atencion?',
  },
  {
    id: 'mantenimiento',
    title: 'Mantenimiento',
    icon: 'Wrench',
    color: 'amber',
    summary: '1 urgencia resuelta. 1 nueva solicitud. Presupuesto: 55% utilizado.',
    details: [
      'RESUELTO: Corto electrico Apt 302. Reparado ayer. Costo: $250K.',
      'Apt 101: Puerta del garaje no abre. Solicitud creada hoy a las 8am.',
      'Mantenimiento preventivo al dia. Proxima ronda: febrero 15.',
    ],
    actionLabel: 'Cuentame mas sobre mantenimiento',
    actionContext: 'Como quedo la urgencia de ayer y hay algo nuevo en mantenimiento?',
  },
  {
    id: 'mantenimiento',
    title: 'Mantenimiento',
    icon: 'Wrench',
    color: 'amber',
    summary: '0 solicitudes activas. Todo al dia. Presupuesto: 30% utilizado.',
    details: [
      'Semana tranquila: 0 nuevas solicitudes.',
      'Ultima solicitud cerrada hace 5 dias (pintura Apt 301).',
      'Presupuesto disponible: $3.3M para el resto del mes.',
    ],
    actionLabel: 'Cuentame mas sobre mantenimiento',
    actionContext: 'Esta todo bien con mantenimiento o hay algo preventivo que deba planear?',
  },
];

const DECISIONES_SECTIONS: BriefingSection[] = [
  {
    id: 'decisiones',
    title: 'Decisiones pendientes',
    icon: 'ListChecks',
    color: 'indigo',
    summary: '3 decisiones pendientes: renovacion contrato, aprobacion candidato, autorizacion reparacion.',
    details: [
      'Renovacion Apt 301 (Maria Gutierrez): Vence en 45 dias. Proponer aumento 5.8% (IPC).',
      'Candidato Apt 204 (Camila Ruiz): Score 87, verificacion completa. Pendiente aprobacion.',
      'Reparacion Apt 502: Cotizacion plomeria $480K. Requiere autorizacion para proceder.',
    ],
    actionLabel: 'Cuentame mas sobre decisiones',
    actionContext: 'Cuales son las decisiones pendientes y que me recomiendas en cada una?',
  },
  {
    id: 'decisiones',
    title: 'Decisiones pendientes',
    icon: 'ListChecks',
    color: 'indigo',
    summary: '2 decisiones pendientes: ajuste de precio y aprobacion de gasto.',
    details: [
      'Apt 601: Sin aplicantes en 12 dias. Reducir canon de $2.3M a $2.18M? (-5%).',
      'Mantenimiento Apt 404: AC requiere cambio de compresor. $1.8M. Aprobar?',
    ],
    actionLabel: 'Cuentame mas sobre decisiones',
    actionContext: 'Dame mas contexto sobre las decisiones pendientes para tomar una buena decision.',
  },
  {
    id: 'decisiones',
    title: 'Decisiones pendientes',
    icon: 'ListChecks',
    color: 'indigo',
    summary: '4 decisiones pendientes: 2 renovaciones, 1 desahucio, 1 aprobacion candidato.',
    details: [
      'Renovacion Apt 201: Inquilino solicita plazo adicional. Canon actual: $1.5M.',
      'Renovacion Local 2: Empresa solicita 2 anos con incremento fijo. Evaluar.',
      'Desahucio Apt 105: 3 meses consecutivos de mora. Iniciar proceso?',
      'Candidato Apt 303: Score 78. Aceptable pero no excelente. Decidir.',
    ],
    actionLabel: 'Cuentame mas sobre decisiones',
    actionContext: 'Tengo varias decisiones pendientes, prioricemos y revisemos cada una.',
  },
  {
    id: 'decisiones',
    title: 'Decisiones pendientes',
    icon: 'ListChecks',
    color: 'indigo',
    summary: '1 decision pendiente: aprobacion de presupuesto de mejoras.',
    details: [
      'Mejoras areas comunes: Propuesta de $3.2M para pintura general y jardines.',
      'ROI estimado: mejora en retencion de inquilinos y valor del portafolio.',
      'Plazo de ejecucion propuesto: 2 semanas.',
    ],
    actionLabel: 'Cuentame mas sobre decisiones',
    actionContext: 'Analizemos la propuesta de mejoras en areas comunes.',
  },
  {
    id: 'decisiones',
    title: 'Decisiones pendientes',
    icon: 'ListChecks',
    color: 'indigo',
    summary: '0 decisiones pendientes. Todo resuelto.',
    details: [
      'Todas las decisiones de la semana han sido resueltas.',
      'Proxima decision esperada: renovacion Apt 402 (vence en 30 dias).',
    ],
    actionLabel: 'Cuentame mas sobre decisiones',
    actionContext: 'No hay decisiones pendientes pero quiero anticipar las que vienen.',
  },
];

// ============================================================================
// Greetings
// ============================================================================

const GREETINGS = [
  'Buenos dias. Aqui esta tu resumen de hoy.',
  'Hola, buen dia. Esto es lo importante para hoy.',
  'Buenos dias. Tu portafolio tiene movimiento hoy.',
  'Hola. Repasemos lo que necesitas saber hoy.',
  'Buenos dias. Tu resumen diario esta listo.',
];

const OVERALL_SUMMARIES = [
  'Tu portafolio tiene 12 unidades activas. Hay 3 temas que requieren tu atencion hoy.',
  'Dia productivo: 2 pagos recibidos y 1 visita programada. 1 urgencia en mantenimiento.',
  'Todo bajo control. Pipeline activo con buenos candidatos y cobros al dia.',
  'Atencion: 2 inquilinos en mora y 1 propiedad sin aplicantes. Revisa las acciones sugeridas.',
  'Semana tranquila. Sin urgencias y cobros en buen ritmo. 2 decisiones pendientes.',
];

// ============================================================================
// Public API
// ============================================================================

/** Returns today's briefing with current data */
export function getTodayBriefing(): DailyBriefing {
  return {
    id: generateId(),
    date: new Date(),
    greeting: GREETINGS[0],
    overallSummary: OVERALL_SUMMARIES[0],
    sections: [
      COBROS_SECTIONS[0],
      PIPELINE_SECTIONS[0],
      MANTENIMIENTO_SECTIONS[0],
      DECISIONES_SECTIONS[0],
    ],
    isNew: true,
  };
}

/** Returns an array of 5 briefings for the past 5 days (including today) */
export function getMockBriefings(): DailyBriefing[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: generateId(),
    date: daysAgo(i),
    greeting: GREETINGS[i],
    overallSummary: OVERALL_SUMMARIES[i],
    sections: [
      COBROS_SECTIONS[i],
      PIPELINE_SECTIONS[i],
      MANTENIMIENTO_SECTIONS[i],
      DECISIONES_SECTIONS[i],
    ],
    isNew: i === 0,
  }));
}
