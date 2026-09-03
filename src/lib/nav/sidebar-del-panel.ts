import type { NavItemWithModule, NavFilterContext } from './agency-nav-filter';
import { pasaGateDeFila } from './agency-nav-filter';
import { canSeeBusinessModule } from './agency-module-scope';
import {
  ARQUITECTURA_DEL_PANEL,
  pestanasDelModulo,
  type GrupoDelPanel,
  type ModuloDelPanel,
  type PantallaDelPanel,
} from './arquitectura-del-panel';

/**
 * Del árbol de la arquitectura a las filas del sidebar.
 *
 * Una entrada de sidebar por módulo (N2), agrupadas bajo su cabecera (N1). Las
 * pantallas (N3) NO van al sidebar: viven en la barra de pestañas del módulo
 * (`ModuloTabs`). Así el menú pasa de 38 filas a 21 sin perder ninguna puerta.
 *
 * ── La regla que evita perder una puerta ───────────────────────────────────
 *
 * Varias pantallas que hoy son pestañas eran ANTES entradas propias del
 * sidebar, con su propio gate y su propio encuadre: Cobranza (`cobranza`),
 * Avalúos (`avaluos`), Tickets (`mantenimiento`), Soportes (administración),
 * Agentes IA y Aprendizaje (todo miembro)… Si la raíz del módulo no pasa pero
 * una de sus pantallas sí, la entrada se muestra igual y apunta a ESA
 * pantalla, heredando su gate y su encuadre. Nadie pierde por el sidebar una
 * pantalla a la que antes llegaba por el sidebar; y nadie gana una.
 *
 * `filterAgencyNav` corre después, como siempre, sobre lo que sale de acá.
 */

export interface BadgesDelSidebar {
  /** Postulaciones esperando gestión (dato real; `undefined` = sin badge). */
  postulaciones?: number;
  /** Contratos migrados con filas por completar. */
  contratos?: number;
}

/** Con qué gate, encuadre y ruta entra el sidebar a un módulo (o null si a ninguna). */
export function resolverEntradaDeModulo(m: ModuloDelPanel, ctx: NavFilterContext): PantallaDelPanel | null {
  const encuadre = { isAdmin: ctx.isAdmin, agencyRole: ctx.agencyRole };
  for (const p of pestanasDelModulo(m)) {
    if (pasaGateDeFila(p, ctx) && canSeeBusinessModule(p.scope, encuadre)) return p;
  }
  return null;
}

/**
 * Las filas del sidebar (sin Inicio ni Chat, que viven en el layout).
 * `t` traduce las claves; `badges` trae los contadores reales.
 */
export function filasDelSidebar(
  t: (k: string) => string,
  ctx: NavFilterContext,
  badges: BadgesDelSidebar = {},
  arquitectura: readonly GrupoDelPanel[] = ARQUITECTURA_DEL_PANEL,
): NavItemWithModule[] {
  const filas: NavItemWithModule[] = [];
  for (const g of arquitectura) {
    if (g.labelKey) {
      // Sin `scope`: el grupo mezcla encuadres, y `filterAgencyNav` ya borra la
      // cabecera que queda sin filas debajo.
      filas.push({
        kind: 'section',
        label: t(g.labelKey),
        href: `#sec-${g.key}`,
        icon: g.modulos[0]!.icon,
        module: null,
      });
    }
    for (const m of g.modulos) {
      // Si nada pasa, se emite la raíz tal cual y `filterAgencyNav` la esconde.
      const entrada = resolverEntradaDeModulo(m, ctx) ?? pestanasDelModulo(m)[0]!;
      filas.push({
        label: t(m.labelKey),
        href: entrada.href,
        icon: m.icon,
        module: entrada.module,
        roles: entrada.roles,
        scope: entrada.scope,
        exact: m.exact,
        ai: m.ia,
        hint: m.hintKey ? t(m.hintKey) : undefined,
        dataTourTarget: m.dataTourTarget,
        badge: m.key === 'postulaciones' ? badges.postulaciones : m.key === 'contratos' ? badges.contratos : undefined,
      });
    }
  }
  return filas;
}
