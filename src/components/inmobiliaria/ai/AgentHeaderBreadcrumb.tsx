'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb';
import { findAgentWorkspace } from '@/lib/nav/agentWorkspaceNav';

/**
 * AgentHeaderBreadcrumb — the single navigation breadcrumb for AI agent
 * workspaces, rendered in the PlanHeader's left slot (top bar). Replaces both
 * the per-agent-layout `<Breadcrumb>` and the per-page `MigaDePan`; all agent
 * navigation now lives at the top (breadcrumb here + WorkspaceNav tabs below).
 *
 * Self-hides on the AI hub and outside any known agent. Shows
 *   Agentes IA › <Agent> [› <Function>]
 * deriving the current function from the deepest matching workspace tab.
 */
export function AgentHeaderBreadcrumb() {
  const pathname = usePathname() ?? '';
  const { t } = useI18n();

  const ws = findAgentWorkspace(pathname);
  if (!ws) return null;

  // Deepest workspace tab whose href is the current path (or a prefix of it).
  const current = ws.items
    .filter(
      (it) =>
        pathname === it.href ||
        (!it.exact && pathname.startsWith(`${it.href}/`))
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  const onSubpage = current != null && current.href !== ws.basePath;

  const items: BreadcrumbItem[] = [
    { label: t('inmobiliaria.ai.breadcrumb.aiAgents'), href: '/panel/inmobiliaria/ai' },
    onSubpage ? { label: t(ws.labelKey), href: ws.basePath } : { label: t(ws.labelKey) },
  ];
  if (onSubpage && current) {
    items.push({ label: t(current.labelKey) });
  }

  return (
    <Breadcrumb
      items={items}
      showHouseIcon
      homeHref="/panel/inmobiliaria"
      size="sm"
      className="min-w-0"
    />
  );
}
