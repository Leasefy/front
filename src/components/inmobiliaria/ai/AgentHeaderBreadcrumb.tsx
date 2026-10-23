'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb';
import { findAgentWorkspace } from '@/lib/nav/agentWorkspaceNav';
import { grupoDelModulo, moduloDeLaRuta } from '@/lib/nav/arquitectura-del-panel';
import { paginaDeLaFicha, paginaSinPestana } from '@/lib/nav/paginas-sin-pestana';

/**
 * AgentHeaderBreadcrumb — el breadcrumb de los workspaces de agente, en el
 * slot izquierdo del PlanHeader. Se esconde fuera de un agente.
 *
 * ── Dónde dice que estás (Nico, 2026-09-16) ────────────────────────────────
 *
 * Los agentes tienen su propia sección del menú, «Agentes IA», y conservan sus
 * URLs: Cobranza sigue en `/pagos/cobranza`. El primer escalón es el GRUPO del
 * módulo dueño, así que la sala se lee dentro de Agentes y no dentro de Pagos:
 *
 *   Agentes IA › Cobranza › Casos [› Detalle]
 *
 * El grupo no navega (no tiene ruta: es una cabecera del menú), por eso va sin
 * enlace. El módulo dueño sale de `moduloDeLaRuta` —el href más largo que sea
 * prefijo—, que en `/pagos/cobranza/…` es Cobranza y no Pagos. Cuando el agente
 * ES el módulo (hoy, todos) no se repite el nombre.
 *
 * Antes de la sección, el primer escalón era el módulo que hospedaba al agente
 * («Pagos › Cobranza › Casos»): decía, justamente, que la sala vivía en Pagos.
 */
export function AgentHeaderBreadcrumb() {
  const pathname = usePathname() ?? '';
  const { t } = useI18n();

  const ws = findAgentWorkspace(pathname);
  if (!ws) return null;

  // La pestaña más profunda cuyo href es la ruta actual (o un prefijo).
  // Una pestaña con segmentos (C2, r25: Cobranza agrupada en 7) cuenta por sus
  // segmentos: la miga dice la pantalla («Cartas»), no el grupo («Contactos»).
  const current = ws.items
    .flatMap((it) => (it.segmentos && it.segmentos.length > 0 ? it.segmentos : [it]))
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
  const grupo = modulo ? grupoDelModulo(modulo) : null;
  if (grupo?.labelKey) {
    items.push({ label: t(grupo.labelKey) });
  }
  if (modulo && modulo.href !== ws.basePath) {
    items.push({ label: t(modulo.labelKey), href: modulo.href });
  }
  items.push(onSubpage || fichaSuelta ? { label: t(ws.labelKey), href: ws.basePath } : { label: t(ws.labelKey) });
  if (onSubpage && current) {
    items.push(enDetalle ? { label: t(current.labelKey), href: current.href } : { label: t(current.labelKey) });
  }
  if (enDetalle || fichaSuelta) {
    // Una página con nombre propio (Reporte diario, Auditoría…) dice su
    // nombre; «Detalle» queda para la ficha de una cosa (QA-AGENTES 16-10).
    const conNombre = paginaSinPestana(pathname);
    if (conNombre) {
      for (const padre of conNombre.padres) items.push({ label: t(padre.labelKey), href: padre.href });
      items.push({ label: t(conNombre.labelKey) });
    } else {
      // La ficha de una página sin pestaña (una escalación) pasa por su página.
      for (const escalon of paginaDeLaFicha(pathname) ?? []) {
        items.push({ label: t(escalon.labelKey), href: escalon.href });
      }
      items.push({ label: t('inmobiliaria.ai.breadcrumb.detalle') });
    }
  }

  return <Breadcrumb items={items} showHouseIcon homeHref="/panel/inmobiliaria" size="sm" className="min-w-0" />;
}
