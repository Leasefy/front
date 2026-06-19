'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SquaresFour, Buildings, Users, Chat, Gear, SignOut, List, X, CaretRight, Sparkle, FileText, House, Bell, Calendar } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useUnreadMessages } from '@/lib/hooks/useMessages';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMySubscription } from '@/lib/hooks/useSubscription';

// Compass items
interface NavItemDef {
  label: string;
  href: string;
  icon: typeof SquaresFour;
  exact?: boolean;
  badge?: number;
}

const NAV_ITEMS: NavItemDef[] = [
  { label: 'Panel', href: '/panel', icon: SquaresFour, exact: true },
  { label: 'Mis Propiedades', href: '/panel/propiedades', icon: Buildings },
  { label: 'Candidatos', href: '/panel/candidatos', icon: Users },
  { label: 'Contratos', href: '/panel/contratos', icon: FileText },
  { label: 'Arriendos', href: '/panel/leases', icon: House },
  { label: 'Visitas', href: '/panel/visitas', icon: Calendar },
  { label: 'Mensajes', href: '/panel/mensajes', icon: Chat },
  { label: 'Notificaciones', href: '/panel/notificaciones', icon: Bell },
  { label: 'Configuracion', href: '/panel/configuracion', icon: Gear },
];

interface NavItemProps {
  item: NavItemDef;
  isActive: boolean;
  onClick?: () => void;
}

function NavItem({ item, isActive, onClick }: NavItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-300',
        'rounded-sm group',
        isActive
          ? 'bg-foreground/8 text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {/* Active indicator - vertical accent line */}
      <span
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-foreground',
          'transition-all duration-300 ease-out',
          isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'
        )}
      />

      <Icon
        className={cn(
          'w-4 h-4 transition-transform duration-300',
          isActive && 'text-foreground',
          !isActive && 'group-hover:scale-110'
        )}
      />
      <span className="flex-1 font-medium">{item.label}</span>
      {item.badge && (
        <span
          className={cn(
            'text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-300',
            isActive
              ? 'bg-foreground text-white'
              : 'bg-muted text-muted-foreground group-hover:bg-foreground/10 group-hover:text-foreground'
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
  const router = useRouter();
  const { user, logout } = useAuth();
  const { subscription } = useMySubscription();
  const { unreadCount } = useUnreadMessages();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.replace('/auth');
    }
  };

  const isActive = (item: NavItemDef) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-muted/50">
      {/* Logo - Premium styling */}
      <div className="p-6">
        <Link href="/panel" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-foreground to-foreground/80 rounded-sm flex items-center justify-center shadow-foreground/20 transition-transform duration-300 group-hover:scale-105">
            <Buildings className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold text-foreground tracking-[-0.02em]">
              Arrienda
            </span>
            <span className="text-xs text-foreground font-medium -mt-0.5">
              Seguro
            </span>
          </div>
        </Link>
      </div>

      {/* Subtle divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Compass - with stagger animation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const dynamicItem = item.href === '/panel/mensajes' && unreadCount > 0
            ? { ...item, badge: unreadCount }
            : item;
          return (
            <NavItem
              key={item.href}
              item={dynamicItem}
              isActive={isActive(item)}
              onClick={onItemClick}
            />
          );
        })}
      </nav>

      {/* Upgrade CTA for base-tier users - Premium design */}
      {subscription?.planId === 'starter' && (
        <div className="px-4 py-4">
          <div className="relative overflow-hidden rounded-sm bg-gradient-to-br from-foreground to-foreground/80 p-4 shadow-foreground/25">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full blur-xl -ml-8 -mb-8" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Sparkle className="w-4 h-4 text-white/90" />
                <span className="text-xs font-normal text-white/90 font-mono uppercase tracking-wider">
                  Pro
                </span>
              </div>
              <p className="text-sm text-white/90 mb-3 leading-relaxed">
                Desbloquea el analisis AI de candidatos
              </p>
              <Link href="/panel/upgrade" onClick={onItemClick}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full bg-white text-foreground hover:bg-white/90 font-semibold"
                >
                  Mejorar plan
                  <CaretRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* User section - Premium design */}
      <div className="p-4 border-t border-border/80">
        <div className="flex items-center gap-3 px-2 py-2 rounded-sm hover:bg-muted/50 transition-colors cursor-pointer mb-2">
          <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center text-foreground font-semibold text-sm shadow-inner">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.name || 'Usuario'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-[#C4503B] hover:bg-[#F8EAE7]/80 rounded-sm transition-all duration-200"
          onClick={handleLogout}
        >
          <SignOut className="w-4 h-4" />
          <span className="text-sm">Cerrar sesion</span>
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
      {/* Desktop Sidebar - Premium styling */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0',
          'bg-white/80 dark:bg-card/80 backdrop-blur-xl border-r border-border/60',
          'shadow-[1px_0_30px_rgba(0,0,0,0.04)]',
          className
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile List Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-40 bg-white dark:bg-card border border-border"
        onClick={() => setMobileOpen(true)}
      >
        <List className="w-5 h-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>List de navegacion</SheetTitle>
          </SheetHeader>
          <SidebarContent onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export { DashboardSidebar as default };
