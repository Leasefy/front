import type { NavItem } from '@/components/ui/plan/PlanSidebar';
import { canSeeBusinessModule, type BusinessModule } from './agency-module-scope';
import { isAgentModule } from '@/lib/auth/agent-module-access';

/**
 * A sidebar nav item that may carry a permission `module` gate and/or an
 * agency-`roles` gate. Mirrors the inline type used by the inmobiliaria layout.
 */
export type NavItemWithModule = NavItem & {
  /** AGENCY_MODULES key that governs this item ('view' access required). */
  module?: string | null;
  /** Agency roles allowed (in addition to isAdmin). */
  roles?: readonly string[];
  adminOnly?: boolean;
  /**
   * Módulo de negocio al que pertenece la fila. Recorta la navegación por rol
   * vía ROLE_MODULE_SCOPE — encuadre, NO seguridad (ver agency-module-scope.ts).
   * Sin `scope` la fila es transversal y no se recorta.
   */
  scope?: BusinessModule;
};

export interface NavFilterContext {
  /** PermissionsContext.canAccess — returns false for every gated module while
   *  permissions load (fail-closed), and true for everything when isAdmin. */
  canAccess: (module: string, action: string) => boolean;
  isAdmin: boolean;
  agencyRole: string | null;
  /**
   * El servicio del agente NO contestó (`agentAccessStatus === 'sin-verificar'`).
   *
   * `cobranza` y `cotizador` fallan cerrado a propósito, y para «el agente dijo
   * que no» eso está bien. Pero cuando **no pudimos preguntar** —el agente caído,
   * un 401, la agencia sin aprovisionar— fallar cerrado **borra la fila del
   * menú**, y un módulo que desaparece sin decir nada se lee como «esto no
   * existe», no como «no pudimos verificarlo».
   *
   * Con esto la fila sobrevive SÓLO en ese caso. No afloja ningún permiso: la
   * pantalla sigue gateada y muestra «No pudimos verificar tu acceso» con su
   * reintentar, que es la verdad. Ver `agent-module-access.ts`.
   */
  agentUnverified?: boolean;
}

/**
 * Filter the agency sidebar nav by permission/role, then drop section headers
 * left with no items.
 *
 * - Module gate: an item with `module` is hidden unless `canAccess(module,'view')`.
 * - Role gate: an item with `roles` is hidden unless `isAdmin` OR `agencyRole`
 *   is in the list.
 * - Fail CLOSED while permissions load: `canAccess` returns false for every
 *   gated module and `isAdmin`/`agencyRole` are falsy, so only ungated items
 *   (module null, no roles) survive — gated tabs never flash in then out.
 * - isAdmin sees everything: `canAccess` returns true for all modules and
 *   `isAdmin` bypasses every role gate.
 */
/**
 * ¿Pasa esta fila su gate de permisos (módulo + roles)? NO mira el `scope`:
 * eso es encuadre, y lo aplica `filterAgencyNav` aparte. Lo comparten el
 * sidebar, `ModuloTabs` (las pestañas de cada módulo) y `sidebar-del-panel.ts`
 * (qué pantalla abre cada fila), para que una misma persona vea lo mismo en
 * los tres lugares.
 */
export function pasaGateDeFila(
  fila: { module?: string | null; roles?: readonly string[] },
  ctx: NavFilterContext,
): boolean {
  // Module-based gate: agent modules use agent permissions, others use the
  // monolith effectivePermissions map — both resolved inside canAccess.
  if (fila.module && !ctx.canAccess(fila.module, 'view')) {
    // Excepción única: el agente no contestó y el módulo es suyo. No es que
    // no tenga permiso — es que no pudimos preguntar. Ver `agentUnverified`.
    const esDelAgente = ctx.agentUnverified === true && isAgentModule(fila.module);
    if (!esDelAgente) return false;
  }
  // Role-based gate: isAdmin bypasses; otherwise the current agencyRole must
  // be in the item's allow-list.
  if (fila.roles && fila.roles.length > 0) {
    const roleAllowed =
      ctx.isAdmin || (ctx.agencyRole !== null && fila.roles.includes(ctx.agencyRole));
    if (!roleAllowed) return false;
  }
  return true;
}

export function filterAgencyNav(
  items: NavItemWithModule[],
  ctx: NavFilterContext,
): NavItem[] {
  const filterItem = (item: NavItemWithModule): NavItemWithModule | null => {
    if (!pasaGateDeFila(item, ctx)) return null;
    // Encuadre por módulo de negocio: recorta el menú al trabajo del rol.
    // Corre DESPUÉS del gate de permisos a propósito — solo puede quitar filas
    // que el permiso ya concedía, nunca devolver una que el permiso negó.
    if (!canSeeBusinessModule(item.scope, { isAdmin: ctx.isAdmin, agencyRole: ctx.agencyRole })) {
      return null;
    }
    if (item.children && item.children.length > 0) {
      const filteredChildren = (item.children as NavItemWithModule[])
        .map(filterItem)
        .filter((c): c is NavItemWithModule => c !== null);
      return { ...item, children: filteredChildren };
    }
    return item;
  };

  const filtered = items.map(filterItem).filter((item): item is NavItem => item !== null);
  // Drop a section header left with no real items after permission filtering.
  return filtered.filter((item, idx) => {
    if (item.kind !== 'section') return true;
    const next = filtered[idx + 1];
    return next != null && next.kind !== 'section';
  });
}
