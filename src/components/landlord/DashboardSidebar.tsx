'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  FileText,
  Home,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MOCK_SUBSCRIPTION, getPlanById } from '@/lib/data/mock-subscriptions';

// Navigation items
const NAV_ITEMS = [
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
    disabled: true,
  },
  {
    label: 'Candidatos',
    href: '/panel/candidatos',
    icon: Users,
    disabled: true,
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
    disabled: true,
  },
  {
    label: 'Configuracion',
    href: '/panel/configuracion',
    icon: Settings,
    disabled: true,
  },
];

interface NavItemProps {
  item: (typeof NAV_ITEMS)[0];
  isActive: boolean;
  onClick?: () => void;
}

function NavItem({ item, isActive, onClick }: NavItemProps) {
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-[2px] text-sm',
          'text-slate-300 cursor-not-allowed'
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="bg-slate-100 text-slate-400 text-xs px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-[2px] text-sm transition-colors',
        isActive
          ? 'bg-slate-50 text-slate-900'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isActive
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-500'
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

interface SidebarContentProps {
  onItemClick?: () => void;
}

function SidebarContent({ onItemClick }: SidebarContentProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-slate-50">
        <Link href="/panel" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0f0f0f] rounded-[2px] flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-light text-slate-900 tracking-[-0.02em]">
            Arrienda Seguro
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isActive(item)}
            onClick={onItemClick}
          />
        ))}
      </nav>

      {/* Upgrade CTA for free users */}
      {MOCK_SUBSCRIPTION.planId === 'free' && (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-[2px] p-3">
            <p className="text-xs text-slate-600 mb-2">
              Desbloquea el analisis AI de candidatos
            </p>
            <Link href="/panel/upgrade" onClick={onItemClick}>
              <Button
                variant="default"
                size="sm"
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Mejorar plan
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* User section */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.name || 'Usuario'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-600 hover:text-red-600 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesion
        </Button>
      </div>
    </div>
  );
}

interface DashboardSidebarProps {
  className?: string;
}

/**
 * Dashboard Sidebar
 * - Fixed sidebar on desktop (240px)
 * - Sheet drawer on mobile
 */
export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0',
          'bg-white border-r border-slate-100',
          className
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-40 bg-white shadow-sm border border-slate-100"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de navegacion</SheetTitle>
          </SheetHeader>
          <SidebarContent onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export { DashboardSidebar as default };
