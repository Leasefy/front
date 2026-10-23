/**
 * Dónde está la persona dentro de Cobranza: el título de la ruta y, en las
 * sub-pantallas, a dónde se vuelve (revisora r25, C1 y C4, ronda 26).
 *
 *   · C1: la puerta del módulo (el asistente no contesta, o sin acceso) decía
 *     «Cobranza» en las 28 sub-rutas mientras la miga decía «Ley 2300 — …». El
 *     título sale del MISMO mapa que las migas: la pestaña (o su segmento) y,
 *     si la ruta no tiene pestaña, `paginaSinPestana`.
 *   · C4: las sub-pantallas sin pestaña no tenían vuelta en ninguno de sus
 *     estados (carga, vacío, fallo). El layout la pinta arriba de todo, así que
 *     está en todos.
 */
import { AGENT_WORKSPACES } from './agentWorkspaceNav'
import { paginaSinPestana } from './paginas-sin-pestana'

export const COBRANZA_BASE = '/panel/inmobiliaria/pagos/cobranza'
const C = COBRANZA_BASE

export interface Vuelta {
  href: string
  label: string
}

/** Las sub-pantallas (ruta EXACTA) y su vuelta. Las fichas (`/[id]`) ya traen la suya. */
export const VUELTA_DE_LA_SUBPANTALLA: Record<string, Vuelta> = {
  // Ronda 30 (K8): sin analítica, resultados ni pendientes: redirigen al Resumen.
  [`${C}/reporte`]: { href: C, label: 'Resumen' },
  [`${C}/inbox`]: { href: C, label: 'Resumen' },
  [`${C}/escalaciones`]: { href: C, label: 'Resumen' },
  [`${C}/reporte/suscripcion`]: { href: `${C}/reporte`, label: 'Reporte diario' },
  [`${C}/reporte/thresholds`]: { href: `${C}/reporte`, label: 'Reporte diario' },
  [`${C}/compliance/audit`]: { href: `${C}/compliance`, label: 'Cumplimiento' },
  [`${C}/compliance/ley-2300`]: { href: `${C}/compliance`, label: 'Cumplimiento' },
  [`${C}/compliance/opt-out`]: { href: `${C}/compliance`, label: 'Cumplimiento' },
}

export function vueltaDeLaRuta(pathname: string): Vuelta | null {
  const ruta = (pathname.split('?')[0] ?? pathname).replace(/\/$/, '')
  return VUELTA_DE_LA_SUBPANTALLA[ruta] ?? null
}

/** La clave i18n del título de la ruta, con el mismo criterio que las migas. */
export function claveDelTituloDeLaRuta(pathname: string): string {
  const ruta = (pathname.split('?')[0] ?? pathname).replace(/\/$/, '')
  const conNombre = paginaSinPestana(ruta)
  if (conNombre) return conNombre.labelKey
  const ws = AGENT_WORKSPACES.find((w) => w.basePath === C)
  const candidatos = (ws?.items ?? [])
    .flatMap((it) => (it.segmentos && it.segmentos.length > 0 ? it.segmentos : [it]))
    .filter((it) => ruta === it.href || (!it.exact && ruta.startsWith(`${it.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)
  const actual = candidatos[0]
  if (!actual || actual.href === C) return 'inmobiliaria.ai.nav.cobranza'
  return actual.labelKey
}
