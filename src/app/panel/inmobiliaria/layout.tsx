'use client';

import { useState, useEffect, useMemo } from 'react';
import { Toaster } from 'sonner';
import {
  SquaresFour,
  Buildings,
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
import { I18nProvider, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface InmobiliariaLayoutProps {
  children: React.ReactNode;
}

/**
 * Inner layout that uses sidebar context
 */
function InmobiliariaLayoutInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const { locale, t } = useI18n();
  const { canAccess, isAdmin, isLoading: permissionsLoading } = usePermissions();

  // Map each nav item to its permission module for filtering
  const ALL_NAV_ITEMS: (NavItem & { permModule?: string })[] = useMemo(() => [
    { label: t('inmobiliaria.nav.dashboard'), href: '/panel/inmobiliaria', icon: SquaresFour, exact: true, permModule: 'dashboard' },
    { label: t('inmobiliaria.nav.propietarios'), href: '/panel/inmobiliaria/propietarios', icon: UserCircle, permModule: 'propietarios' },
    { label: t('inmobiliaria.nav.portafolio'), href: '/panel/inmobiliaria/portafolio', icon: Buildings, permModule: 'portafolio' },
    { label: t('inmobiliaria.nav.pipeline'), href: '/panel/inmobiliaria/pipeline', icon: Kanban, permModule: 'pipeline' },
    { label: t('inmobiliaria.nav.agentes'), href: '/panel/inmobiliaria/agentes', icon: Users, permModule: 'agentes' },
    { label: t('inmobiliaria.nav.cobros'), href: '/panel/inmobiliaria/cobros', icon: CurrencyDollar, permModule: 'cobros' },
    { label: t('inmobiliaria.nav.dispersiones'), href: '/panel/inmobiliaria/dispersiones', icon: PaperPlaneTilt, permModule: 'dispersiones' },
    { label: t('inmobiliaria.nav.operaciones'), href: '/panel/inmobiliaria/operaciones', icon: Wrench, permModule: 'operaciones' },
    { label: t('inmobiliaria.nav.documentos'), href: '/panel/inmobiliaria/documentos', icon: FileText, permModule: 'documentos' },
    { label: t('inmobiliaria.nav.reportes'), href: '/panel/inmobiliaria/reportes', icon: ChartLine, permModule: 'reportes' },
    { label: t('inmobiliaria.nav.analitica'), href: '/panel/inmobiliaria/analytics', icon: ChartLineUp, permModule: 'analytics' },
    { label: t('inmobiliaria.nav.mensajes') , href: '/panel/inmobiliaria/mensajes', icon: Chat, badge: 5 },
    { label: t('inmobiliaria.nav.aiAgents') || 'Agentes AI', href: '/panel/inmobiliaria/ai', icon: Robot },
  ], [t]);

  // Filter nav items based on user permissions (show all while loading to avoid flash)
  const INMOBILIARIA_NAV_ITEMS: NavItem[] = useMemo(() => {
    if (permissionsLoading || isAdmin) return ALL_NAV_ITEMS;
    return ALL_NAV_ITEMS.filter((item) => {
      if (!item.permModule) return true; // No permission module = always visible
      return canAccess(item.permModule, 'view');
    });
  }, [ALL_NAV_ITEMS, permissionsLoading, isAdmin, canAccess]);

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
        <SidebarProvider>
          <InmobiliariaLayoutInner>{children}</InmobiliariaLayoutInner>
        </SidebarProvider>
      </I18nProvider>
    </ProtectedRoute>
  );
}
