'use client';

import { useMemo } from 'react';
import { Toaster } from 'sonner';
import {
  SquaresFour,
  Buildings,
  House,
  Users,
  Chat,
  Gear,
  FileText,
  CurrencyDollar,
  Kanban,
  ChartLine,
  ChartLineUp,
  Wrench,
  UserCircle,
  PaperPlaneTilt,
  Robot,
} from '@phosphor-icons/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PlanSidebar, NavItem } from '@/components/ui/plan/PlanSidebar';
import { PlanHeader } from '@/components/ui/plan/PlanHeader';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import { PermissionsProvider, usePermissionsContext } from '@/lib/context/PermissionsContext';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface InmobiliariaLayoutProps {
  children: React.ReactNode;
}

/**
 * Inner layout that uses sidebar context
 */
function InmobiliariaLayoutInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const { locale, t } = useI18n();
  const { canAccess, isLoading: permissionsLoading } = usePermissionsContext();

  // All nav items with their corresponding permission module (null = always visible)
  const ALL_NAV_ITEMS = useMemo(() => [
    { label: t('inmobiliaria.nav.dashboard'),    href: '/panel/inmobiliaria',              icon: SquaresFour,   exact: true, module: null },
    { label: t('inmobiliaria.nav.aiAgents'),     href: '/panel/inmobiliaria/ai',           icon: Robot,                      module: null },
    { label: t('inmobiliaria.nav.propietarios'), href: '/panel/inmobiliaria/propietarios', icon: UserCircle,                 module: 'propietarios' },
    { label: t('inmobiliaria.nav.propiedades'),  href: '/panel/inmobiliaria/propiedades',  icon: House,                      module: 'portafolio' },
    { label: t('inmobiliaria.nav.portafolio'),   href: '/panel/inmobiliaria/portafolio',   icon: Buildings,                  module: 'portafolio' },
    { label: t('inmobiliaria.nav.pipeline'),     href: '/panel/inmobiliaria/pipeline',     icon: Kanban,                     module: 'pipeline' },
    { label: t('inmobiliaria.nav.agentes'),      href: '/panel/inmobiliaria/agentes',      icon: Users,                      module: 'agentes' },
    { label: t('inmobiliaria.nav.cobros'),       href: '/panel/inmobiliaria/cobros',       icon: CurrencyDollar,             module: 'cobros' },
    { label: t('inmobiliaria.nav.dispersiones'), href: '/panel/inmobiliaria/dispersiones', icon: PaperPlaneTilt,             module: 'dispersiones' },
    { label: t('inmobiliaria.nav.operaciones'),  href: '/panel/inmobiliaria/operaciones',  icon: Wrench,                     module: 'operaciones' },
    { label: t('inmobiliaria.nav.documentos'),   href: '/panel/inmobiliaria/documentos',   icon: FileText,                   module: 'documentos' },
    { label: t('inmobiliaria.nav.reportes'),     href: '/panel/inmobiliaria/reportes',     icon: ChartLine,                  module: 'reportes' },
    { label: t('inmobiliaria.nav.analitica'),    href: '/panel/inmobiliaria/analytics',    icon: ChartLineUp,                module: 'analytics' },
    { label: t('inmobiliaria.nav.mensajes'),     href: '/panel/inmobiliaria/mensajes',     icon: Chat,          badge: 5,    module: null },
  ], [t]);

  const INMOBILIARIA_NAV_ITEMS: NavItem[] = useMemo(() => {
    // While loading, show all items to avoid flash
    if (permissionsLoading) return ALL_NAV_ITEMS;
    return ALL_NAV_ITEMS.filter(({ module }) => !module || canAccess(module, 'view'));
  }, [ALL_NAV_ITEMS, canAccess, permissionsLoading]);

  return (
    <div className="min-h-screen bg-plan-page">
      {/* Inmobiliaria Sidebar */}
      <PlanSidebar
        navItems={INMOBILIARIA_NAV_ITEMS}
        logo={{
          title: t('inmobiliaria.common.title'),
          href: '/panel/inmobiliaria',
        }}
        showUpgrade={false}
      />

      {/* Main content area */}
      <div
        className={cn(
          'transition-all duration-200',
          isCollapsed ? 'lg:pl-16' : 'lg:pl-[240px]'
        )}
      >
        <PlanHeader />
        <main>{children}</main>
      </div>

      {/* Toast notifications - Premium style */}
      <Toaster
        position="top-right"
        style={{ zIndex: 9999 }}
        toastOptions={{
          style: {
            borderRadius: '16px',
            background: 'white',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
          },
        }}
      />
    </div>
  );
}

/**
 * Inmobiliaria Layout
 * Specialized dashboard for real estate agencies managing multiple properties and owners
 */
export default function InmobiliariaLayout({ children }: InmobiliariaLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['agency']}>
      <I18nProvider>
        <PermissionsProvider>
          <SidebarProvider>
            <InmobiliariaLayoutInner>{children}</InmobiliariaLayoutInner>
          </SidebarProvider>
        </PermissionsProvider>
      </I18nProvider>
    </ProtectedRoute>
  );
}
