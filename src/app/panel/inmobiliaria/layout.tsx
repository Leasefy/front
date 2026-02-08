'use client';

import { useState, useEffect } from 'react';
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
  Wrench,
  UserCircle,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PlanSidebar, NavItem } from '@/components/ui/plan/PlanSidebar';
import { PlanHeader } from '@/components/ui/plan/PlanHeader';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import { I18nProvider, useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Inmobiliaria Navigation Items
 * Complete navigation for real estate agency operations
 */
const INMOBILIARIA_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/panel/inmobiliaria',
    icon: SquaresFour,
    exact: true,
  },
  {
    label: 'Propietarios',
    href: '/panel/inmobiliaria/propietarios',
    icon: UserCircle,
  },
  {
    label: 'Portafolio',
    href: '/panel/inmobiliaria/portafolio',
    icon: Buildings,
  },
  {
    label: 'Pipeline',
    href: '/panel/inmobiliaria/pipeline',
    icon: Kanban,
  },
  {
    label: 'Agentes',
    href: '/panel/inmobiliaria/agentes',
    icon: Users,
  },
  {
    label: 'Cobros',
    href: '/panel/inmobiliaria/cobros',
    icon: CurrencyDollar,
  },
  {
    label: 'Dispersiones',
    href: '/panel/inmobiliaria/dispersiones',
    icon: PaperPlaneTilt,
  },
  {
    label: 'Operaciones',
    href: '/panel/inmobiliaria/operaciones',
    icon: Wrench,
  },
  {
    label: 'Reportes',
    href: '/panel/inmobiliaria/reportes',
    icon: ChartLine,
  },
  {
    label: 'Mensajes',
    href: '/panel/inmobiliaria/mensajes',
    icon: Chat,
    badge: 5,
  },
];

interface InmobiliariaLayoutProps {
  children: React.ReactNode;
}

/**
 * Inner layout that uses sidebar context
 */
function InmobiliariaLayoutInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const { locale } = useTranslation();

  return (
    <div className="min-h-screen bg-plan-page">
      {/* Inmobiliaria Sidebar */}
      <PlanSidebar
        navItems={INMOBILIARIA_NAV_ITEMS}
        logo={{
          title: 'Inmobiliaria',
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
    <ProtectedRoute allowedRoles={['landlord']}>
      <I18nProvider>
        <SidebarProvider>
          <InmobiliariaLayoutInner>{children}</InmobiliariaLayoutInner>
        </SidebarProvider>
      </I18nProvider>
    </ProtectedRoute>
  );
}
