'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import {
  findAgentWorkspace,
  type WorkspaceNavItem,
} from '@/lib/nav/agentWorkspaceNav';

/**
 * WorkspaceNav — the AI agent's INTERNAL navigation, rendered as a horizontal
 * scrollable tab bar at the top of every agent workspace.
 *
 * Mounted once in `app/panel/inmobiliaria/ai/layout.tsx`. It self-hides on the
 * AI hub and anywhere outside a known agent (findAgentWorkspace → null). The
 * agent's functions used to live as `children:[]` on the global sidebar; they
 * now live here so the sidebar shows each agent as a single, calm item.
 *
 * Permission/role gating mirrors the sidebar (PermissionsContext) so a user
 * never sees a tab they can't open. Sticks below the 64px PlanHeader.
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
      const roleAllowed =
        isAdmin || (agencyRole !== null && (item.roles as string[]).includes(agencyRole));
      if (!roleAllowed) return false;
    }
    return true;
  });

  // Nothing to navigate between → don't render a one-tab bar.
  if (items.length < 2) return null;

  const isActive = (item: WorkspaceNavItem) =>
    pathname === item.href || (!item.exact && (pathname ?? '').startsWith(`${item.href}/`));

  return (
    <div className="sticky top-16 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="relative">
        {/* right edge fade — hints there's more to scroll */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-bg to-transparent" />
        <nav
          aria-label={`Secciones de ${t(workspace.labelKey)}`}
          // Lenis otherwise hijacks the wheel and the bar never scrolls.
          data-lenis-prevent
          className="flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                data-tour-target={item.dataTourTarget}
                className={cn(
                  'group relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3.5 text-[13px] transition-colors',
                  active
                    ? 'font-medium text-fg'
                    : 'text-fg-muted hover:text-fg'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4',
                    active
                      ? 'text-primary'
                      : 'text-fg-subtle group-hover:text-fg'
                  )}
                  weight={active ? 'fill' : 'regular'}
                />
                {t(item.labelKey)}
                <span
                  className={cn(
                    'absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary transition-opacity duration-150',
                    active ? 'opacity-100' : 'opacity-0'
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
