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
  // COTIZ-1 (QA 19-10-2026): «Nueva cotización» decía «Detalle» en la miga.
  ['/panel/inmobiliaria/postulaciones/asegurabilidad/nueva']: {
    labelKey: 'inmobiliaria.ai.cotizador.nueva.title',
    padres: [],
  },
  // Las de Mori que se abren desde un enlace o por URL (QA-AGENTES 16-10).
  [`${COBRANZA}/escalaciones`]: { labelKey: 'inmobiliaria.ai.cobranza.escalaciones.pageTitle', padres: [] },
  [`${COBRANZA}/analitica`]: { labelKey: 'inmobiliaria.ai.cobranza.analitica.title', padres: [] },
  [`${COBRANZA}/pendientes`]: { labelKey: 'inmobiliaria.ai.cobranza.pendientes.pageTitle', padres: [] },
  [`${COBRANZA}/plantillas`]: { labelKey: 'inmobiliaria.ai.templates.title', padres: [] },
  [`${COBRANZA}/equipo`]: { labelKey: 'inmobiliaria.ai.breadcrumb.paginas.equipo', padres: [] },
  [`${COBRANZA}/inbox`]: { labelKey: 'inmobiliaria.ai.breadcrumb.paginas.inbox', padres: [] },
  [`${COBRANZA}/promesas`]: { labelKey: 'inmobiliaria.ai.breadcrumb.paginas.promesas', padres: [] },
  [`${COBRANZA}/resultados`]: { labelKey: 'inmobiliaria.ai.breadcrumb.paginas.resultados', padres: [] },
}

/** La página con nombre de esta ruta (sin la barra final), o null. */
export function paginaSinPestana(pathname: string): PaginaSinPestana | null {
  return PAGINAS_SIN_PESTANA[pathname.replace(/\/+$/, '')] ?? null
}

/**
 * La página con nombre de la que cuelga una ficha (`…/escalaciones/<id>` →
 * Escalaciones), con sus escalones, para que la ficha tenga camino de vuelta
 * desde la miga. null si la ruta no cuelga de ninguna.
 */
export function paginaDeLaFicha(pathname: string): EscalonConNombre[] | null {
  const limpia = pathname.replace(/\/+$/, '')
  const padre = Object.keys(PAGINAS_SIN_PESTANA)
    .filter((href) => limpia.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]
  if (!padre) return null
  const pagina = PAGINAS_SIN_PESTANA[padre]
  return [...pagina.padres, { labelKey: pagina.labelKey, href: padre }]
}
