'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { findAgentWorkspace, type WorkspaceNavItem } from '@/lib/nav/agentWorkspaceNav';
import { BarraDePestanas, type PestanaDeBarra } from '@/components/inmobiliaria/BarraDePestanas';

/**
 * WorkspaceNav — la navegación INTERNA de un agente de IA, como pestañas
 * horizontales arriba de su workspace: Resumen · Casos · Acuerdos…
 *
 * Se monta UNA vez en `app/panel/inmobiliaria/layout.tsx` y se esconde sola
 * fuera de un agente conocido (`findAgentWorkspace` → null). Cuando el agente
 * vive dentro de un módulo con pestañas propias (Cobros → Cobranza), esta
 * barra va DEBAJO de la del módulo (`ModuloTabs`): por eso su `top` suma el
 * alto que aquélla publica en `--modulo-tabs-h`.
 *
 * Los gates espejan el sidebar (PermissionsContext): nadie ve una pestaña que
 * no puede abrir. La mecánica de scroll, flechas y medida vive en
 * `BarraDePestanas`, compartida con la barra del módulo.
 */
export function WorkspaceNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { canAccess, isAdmin, agencyRole } = usePermissionsContext();

  const workspace = findAgentWorkspace(pathname ?? '');
  if (!workspace) return null;

  const items = workspace.items.filter((item) => {
    if (item.module && !canAccess(item.module, 'view')) return false;
    if (item.roles && item.roles.length > 0) {
      const roleAllowed = isAdmin || (agencyRole !== null && (item.roles as string[]).includes(agencyRole));
      if (!roleAllowed) return false;
    }
    return true;
  });

  // Nada entre lo que navegar → no se dibuja una barra de una sola pestaña.
  if (items.length < 2) return null;

  const isActive = (item: WorkspaceNavItem) =>
    pathname === item.href || (!item.exact && (pathname ?? '').startsWith(`${item.href}/`));

  const pestanas: PestanaDeBarra[] = items.map((item) => ({
    href: item.href,
    label: t(item.labelKey),
    icon: item.icon,
    active: isActive(item),
    // `aria-current="page"` sólo en coincidencia EXACTA: en la ficha de un caso
    // la pestaña «Casos» es el camino de VUELTA, no la página actual.
    current: pathname === item.href,
    dataTourTarget: item.dataTourTarget,
  }));

  return (
    <BarraDePestanas
      items={pestanas}
      ariaLabel={`Secciones de ${t(workspace.labelKey)}`}
      cssVar="--workspace-nav-h"
      topClass="top-[calc(4rem+var(--modulo-tabs-h,0px))]"
      nivel="agente"
      pathname={pathname ?? ''}
    />
  );
}
