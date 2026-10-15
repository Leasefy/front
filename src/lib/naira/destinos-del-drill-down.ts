/**
 * destinos-del-drill-down.ts — la etiqueta y el gate de cada pantalla a la que lleva un drill-down de Naira (Fase 13,
 * plan 13-02; D13-7, UI-02).
 *
 * Los mapas cerrados de 13-01 (`RUTA_DE_LA_METRICA`, `RUTA_POR_FUENTE` en fuente-a-ruta.ts) dicen A QUÉ pantalla lleva
 * un dato, pero no cómo se llama esa pantalla ni qué módulo la gobierna. Eso vive acá, con dos reglas que un test fija
 * contra la navegación real del panel (arquitectura-del-panel.ts y agentWorkspaceNav.ts):
 *   · la etiqueta es la palabra que el panel ya usa para esa pantalla (el `labelKey` de su entrada de navegación), así
 *     «Ver en Cartera» dice lo mismo que el sidebar (docs/VOCABULARIO.md);
 *   · el módulo es el de la entrada de navegación de prefijo más largo, el que su page.tsx gatea (`canAccess(modulo,
 *     'view')` antes de pintar el enlace); ninguna de estas pantallas lleva `roles`.
 *
 * Cubre EXACTAMENTE las rutas no nulas de los dos mapas de 13-01 (bicondicional, por test). Recaudo y Cartera cuelgan
 * del módulo Pagos (sin módulo propio y con roles de contador), pero su entrada de prefijo más largo es la PANTALLA, sin
 * roles y gateada por `cobros`, que es lo que su page.tsx pide. Escalaciones no es una pestaña de Cobranza: su etiqueta
 * es la clave de navegación que ya existe y no hay paridad de pestaña que medir.
 *
 * Las rutas se escriben enteras y literales: jamás se arman con un texto del agente. La búsqueda es con `Object.hasOwn`
 * (un `constructor` o un `__proto__` no son destinos).
 */

import { SIN_EL_AUXILIAR_DE_CARTERA } from '@/lib/nav/el-auxiliar-de-cartera-no-ve-los-bancos'

export interface DestinoDelDrillDown {
  /** Clave i18n de la etiqueta de la pantalla («Cartera»). */
  readonly etiquetaKey: string
  /** Módulo que gobierna la pantalla (AGENCY_MODULES, acción 'view'). */
  readonly modulo: string
  /**
   * Roles que abren la pantalla, los MISMOS de su entrada en `arquitectura-del-panel.ts` (15-10-2026: Recaudo dejó
   * de abrirse para el auxiliar de cartera). Sin `roles`, la pantalla no tiene puerta por rol.
   */
  readonly roles?: readonly string[]
}

export const DESTINOS_DEL_DRILL_DOWN: Readonly<Record<string, DestinoDelDrillDown>> = {
  '/panel/inmobiliaria/pagos/cartera': { etiquetaKey: 'inmobiliaria.nav.cartera', modulo: 'cobros' },
  '/panel/inmobiliaria/pagos/recaudo': { etiquetaKey: 'inmobiliaria.nav.recaudo', modulo: 'cobros', roles: SIN_EL_AUXILIAR_DE_CARTERA },
  '/panel/inmobiliaria/pagos/cobranza': { etiquetaKey: 'inmobiliaria.ai.nav.cobranza', modulo: 'cobranza' },
  '/panel/inmobiliaria/pagos/cobranza/acuerdos': { etiquetaKey: 'inmobiliaria.ai.nav.cobranzaAcuerdos', modulo: 'cobranza' },
  '/panel/inmobiliaria/pagos/cobranza/disputas': { etiquetaKey: 'inmobiliaria.ai.nav.cobranzaDisputas', modulo: 'cobranza' },
  '/panel/inmobiliaria/pagos/cobranza/deudores': { etiquetaKey: 'inmobiliaria.ai.nav.cobranzaCasos', modulo: 'cobranza' },
  '/panel/inmobiliaria/pagos/cobranza/pagos': { etiquetaKey: 'inmobiliaria.ai.nav.pagos', modulo: 'cobranza' },
  '/panel/inmobiliaria/pagos/cobranza/escalaciones': { etiquetaKey: 'inmobiliaria.ai.nav.escalaciones', modulo: 'cobranza' },
  '/panel/inmobiliaria/inmuebles': { etiquetaKey: 'inmobiliaria.nav.inmuebles', modulo: 'portafolio' },
  '/panel/inmobiliaria/pipeline': { etiquetaKey: 'inmobiliaria.nav.pipelineCorto', modulo: 'pipeline' },
} as const satisfies Record<string, DestinoDelDrillDown>

/** La etiqueta y el gate de una ruta de los mapas cerrados, o `null` (desconocida u hostil ⇒ null). */
export function destinoDeLaRuta(ruta: string): DestinoDelDrillDown | null {
  return Object.hasOwn(DESTINOS_DEL_DRILL_DOWN, ruta) ? DESTINOS_DEL_DRILL_DOWN[ruta] ?? null : null
}
