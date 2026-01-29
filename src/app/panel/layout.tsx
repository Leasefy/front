'use client';

import { Toaster } from 'sonner';
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageSquare,
  Settings,
  FileText,
  Home,
} from 'lucide-react';
import { DecisionProvider } from '@/lib/context/DecisionContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PlanSidebar, NavItem } from '@/components/ui/plan/PlanSidebar';
import { PlanHeader } from '@/components/ui/plan/PlanHeader';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import { MOCK_SUBSCRIPTION } from '@/lib/data/mock-subscriptions';
import { cn } from '@/lib/utils';

const LANDLORD_NAV_ITEMS: NavItem[] = [
  {
    label: 'Panel',
    href: '/panel',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Mis Propiedades',
    href: '/panel/propiedades',
    icon: Building2,
  },
  {
    label: 'Candidatos',
    href: '/panel/candidatos',
    icon: Users,
  },
  {
    label: 'Contratos',
    href: '/panel/contratos',
    icon: FileText,
  },
  {
    label: 'Arriendos',
    href: '/panel/leases',
    icon: Home,
  },
  {
    label: 'Mensajes',
    href: '/panel/mensajes',
    icon: MessageSquare,
    badge: 3,
  },
];

interface PanelLayoutProps {
  children: React.ReactNode;
}

/**
 * Inner layout that uses sidebar context
 */
function PanelLayoutInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const showUpgrade = MOCK_SUBSCRIPTION.planId === 'free';

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* PLan CRM Sidebar */}
      <PlanSidebar
        navItems={LANDLORD_NAV_ITEMS}
        logo={{
          title: 'PLan',
          href: '/panel',
        }}
        showUpgrade={showUpgrade}
        upgradeHref="/panel/upgrade"
        upgradeLabel="Mejorar Plan"
      />

      {/* Main content area */}
      <div className={cn(
        'transition-all duration-200',
        isCollapsed ? 'lg:pl-16' : 'lg:pl-[240px]'
      )}>
        <PlanHeader />
        <main>
          {children}
        </main>
      </div>

      {/* Toast notifications - PLan style */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '2px',
            background: '#fff',
            border: '1px solid #E5E7EB',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          },
        }}
      />
    </div>
  );
}

/**
 * Panel Layout - PLan CRM style
 */
export default function PanelLayout({ children }: PanelLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['landlord']}>
      <DecisionProvider>
        <SidebarProvider>
          <PanelLayoutInner>{children}</PanelLayoutInner>
        </SidebarProvider>
      </DecisionProvider>
    </ProtectedRoute>
  );
}
