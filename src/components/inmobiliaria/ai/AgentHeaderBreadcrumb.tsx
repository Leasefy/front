'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb';
import { findAgentWorkspace } from '@/lib/nav/agentWorkspaceNav';
import { moduloDeLaRuta } from '@/lib/nav/arquitectura-del-panel';

/**
 * AgentHeaderBreadcrumb — el breadcrumb de los workspaces de agente, en el
 * slot izquierdo del PlanHeader. Se esconde fuera de un agente.
 *
 * Antes arrancaba en «Agentes IA › /ai»: la IA era un lugar. Ahora la IA es un
 * modo dentro de cada módulo, así que arranca en el módulo dueño:
 *
 *   Cobros › Cobranza › Casos [› Detalle]
 *
 * El primer escalón sale de `arquitectura-del-panel.ts` (el módulo cuyo href
 * es prefijo de la ruta). Cuando el agente ES la raíz del módulo (Pagos,
 * Conciliación) no se repite el nombre: «Pagos › Por aprobar».
 */
export function AgentHeaderBreadcrumb() {
  const pathname = usePathname() ?? '';
  const { t } = useI18n();

  const ws = findAgentWorkspace(pathname);
  if (!ws) return null;

  // La pestaña más profunda cuyo href es la ruta actual (o un prefijo).
  const current = ws.items
    .filter((it) => pathname === it.href || (!it.exact && pathname.startsWith(`${it.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const onSubpage = current != null && current.href !== ws.basePath;

  // ¿Estamos MÁS ABAJO que la pestaña? (ficha de un caso, de una carta…)
  // `current` sale de un match por PREFIJO: en `…/cobranza/deudores/<id>` gana
  // «Casos». Si se pintara como página actual, la ficha quedaría sin salida:
  // la pestaña vuelve a ser navegable y el último escalón es «Detalle».
  const enDetalle = current != null && pathname.startsWith(`${current.href}/`);

  // Ficha que no cuelga de ninguna pestaña (`/conciliacion/<id>`,
  // `/mantenimientos/tickets/<id>` cuando la lista es la raíz exacta): el
  // agente vuelve a ser enlace y el último escalón dice «Detalle» igual, para
  // que la ficha tenga camino de vuelta desde el header.
  const fichaSuelta = current == null && pathname.startsWith(`${ws.basePath}/`);

  const items: BreadcrumbItem[] = [];
  const modulo = moduloDeLaRuta(pathname);
  if (modulo && modulo.href !== ws.basePath) {
    items.push({ label: t(modulo.labelKey), href: modulo.href });
  }
  items.push(onSubpage || fichaSuelta ? { label: t(ws.labelKey), href: ws.basePath } : { label: t(ws.labelKey) });
  if (onSubpage && current) {
    items.push(enDetalle ? { label: t(current.labelKey), href: current.href } : { label: t(current.labelKey) });
  }
  if (enDetalle || fichaSuelta) {
    items.push({ label: t('inmobiliaria.ai.breadcrumb.detalle') });
  }

  return <Breadcrumb items={items} showHouseIcon homeHref="/panel/inmobiliaria" size="sm" className="min-w-0" />;
}
