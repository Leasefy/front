'use client';

import { Toaster } from 'sonner';
import {
  LayoutDashboard,
  Home,
  FileSearch,
  CreditCard,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PlanSidebar, NavItem } from '@/components/ui/plan/PlanSidebar';
import { PlanHeader } from '@/components/ui/plan/PlanHeader';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import { cn } from '@/lib/utils';

const TENANT_NAV_ITEMS: NavItem[] = [
  { label: 'Panel', href: '/inquilino', icon: LayoutDashboard, exact: true },
  { label: 'Mi Arriendo', href: '/inquilino/arriendo', icon: Home },
  { label: 'Aplicaciones', href: '/inquilino/aplicaciones', icon: FileSearch },
  { label: 'Pagos', href: '/inquilino/pagos', icon: CreditCard },
  { label: 'Documentos', href: '/inquilino/documentos', icon: FileText },
  { label: 'Mensajes', href: '/inquilino/mensajes', icon: MessageSquare, badge: 2 },
];

interface InquilinoLayoutProps {
  children: React.ReactNode;
}

/**
 * Inner layout that uses sidebar context
 */
function InquilinoLayoutInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <PlanSidebar
        navItems={TENANT_NAV_ITEMS}
        logo={{
          title: 'Arriendo',
          href: '/inquilino',
        }}
      />
      <div className={cn(
        'transition-all duration-200',
        isCollapsed ? 'lg:pl-16' : 'lg:pl-[240px]'
      )}>
        <PlanHeader />
        <main>
          {children}
        </main>
      </div>
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
 * Inquilino (Tenant) Layout - PLan CRM style
 */
export default function InquilinoLayout({ children }: InquilinoLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['tenant']}>
      <SidebarProvider>
        <InquilinoLayoutInner>{children}</InquilinoLayoutInner>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
