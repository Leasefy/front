/**
 * Las páginas de un agente que no son pestaña, con su nombre (QA-AGENTES 16-10).
 *
 * 🔴 La miga del encabezado (`AgentHeaderBreadcrumb`) terminaba en «Detalle»
 * en toda página que no fuera una pestaña: el Reporte diario, sus Umbrales y
 * su Suscripción (se llega desde el Resumen y desde Configuración) y las tres
 * de Cumplimiento (Auditoría, Ley 2300, Opt-out). «Detalle» es para la ficha
 * de UNA cosa (un caso, una carta); estas son pantallas con nombre propio.
 *
 * `padres`: los escalones entre el agente y la página (con enlace), cuando la
 * página cuelga de otra que tampoco es pestaña.
 */

const COBRANZA = '/panel/inmobiliaria/pagos/cobranza'

export interface EscalonConNombre {
  labelKey: string
  href: string
}

export interface PaginaSinPestana {
  labelKey: string
  padres: EscalonConNombre[]
}

const REPORTE: EscalonConNombre = {
  labelKey: 'inmobiliaria.ai.cobranza.reporte.pageTitle',
  href: `${COBRANZA}/reporte`,
}

export const PAGINAS_SIN_PESTANA: Readonly<Record<string, PaginaSinPestana>> = {
  [REPORTE.href]: { labelKey: REPORTE.labelKey, padres: [] },
  [`${COBRANZA}/reporte/thresholds`]: {
    labelKey: 'inmobiliaria.ai.cobranza.reporte.thresholds.pageTitle',
    padres: [REPORTE],
  },
  [`${COBRANZA}/reporte/suscripcion`]: {
    labelKey: 'inmobiliaria.ai.cobranza.reporte.subscription.pageTitle',
    padres: [REPORTE],
  },
  [`${COBRANZA}/compliance/audit`]: {
    labelKey: 'inmobiliaria.ai.cobranza.compliance.subPages.auditTitle',
    padres: [],
  },
  [`${COBRANZA}/compliance/ley-2300`]: {
    labelKey: 'inmobiliaria.ai.cobranza.compliance.subPages.ley2300Title',
    padres: [],
  },
  [`${COBRANZA}/compliance/opt-out`]: {
    labelKey: 'inmobiliaria.ai.cobranza.compliance.subPages.optOutTitle',
    padres: [],
  },
}

/** La página con nombre de esta ruta (sin la barra final), o null. */
export function paginaSinPestana(pathname: string): PaginaSinPestana | null {
  return PAGINAS_SIN_PESTANA[pathname.replace(/\/+$/, '')] ?? null
}
