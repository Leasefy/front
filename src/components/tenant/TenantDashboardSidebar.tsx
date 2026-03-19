'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SquaresFour, House, FileMagnifyingGlass, CreditCard, FileText, Chat, Gear, SignOut, List, Bell, UserCircle, Heart, Question, TrendUp, ArrowUpRight, CheckCircle, Circle, User, Phone, Shield, Briefcase, UserPlus } from '@phosphor-icons/react';

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

const NAV_ITEMS: { label: string; href: string; icon: typeof SquaresFour; exact?: boolean; badge?: number }[] = [
  { label: 'Panel', href: '/inquilino', icon: SquaresFour, exact: true },
  { label: 'Mi Arriendo', href: '/inquilino/arriendo', icon: House },
  { label: 'Aplicaciones', href: '/inquilino/aplicaciones', icon: FileMagnifyingGlass },
  { label: 'Guardados', href: '/inquilino/guardados', icon: Heart },
  { label: 'Pagos', href: '/inquilino/pagos', icon: CreditCard },
  { label: 'Documentos', href: '/inquilino/documentos', icon: FileText },
  { label: 'Mensajes', href: '/inquilino/mensajes', icon: Chat },
  { label: 'Notificaciones', href: '/inquilino/notificaciones', icon: Bell },
  { label: 'Perfil', href: '/inquilino/perfil', icon: UserCircle },
  { label: 'Configuracion', href: '/inquilino/configuracion', icon: Gear },
];

interface NavItemProps {
  item: (typeof NAV_ITEMS)[0];
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
        'flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
        isActive
          ? 'text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="w-[18px] h-[18px]" />
      <span className="flex-1">{item.label}</span>
      {item.badge && item.badge > 0 && (
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium',
          isActive
            ? 'bg-foreground text-white'
            : 'bg-muted text-muted-foreground'
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount } = useUnreadMessages();

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 pb-8">
        <Link href="/inquilino" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center">
            <House className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-medium text-foreground tracking-[-0.02em]">
            Mi Arriendo
          </span>
        </Link>
      </div>

      {/* Compass */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const dynamicItem = item.href === '/inquilino/mensajes' && unreadCount > 0
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

      {/* Profile completion widget */}
      <div className="px-3 mb-3">
        <Link
          href="/inquilino/perfil"
          onClick={onItemClick}
          className="block p-3 rounded-xl bg-stone-100 dark:bg-[#2a2a2e] border border-transparent dark:border-[#3a3a3e] hover:bg-stone-200/80 dark:hover:bg-[#323236] transition-colors"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm">
              <TrendUp className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Completa tu perfil</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">80% completado</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-3">
            <div className="h-full w-4/5 bg-neutral-900 dark:bg-indigo-500 rounded-full" />
          </div>

          {/* Steps summary */}
          <div className="space-y-1.5">
            {/* Completed steps */}
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              <span>Info básica, Teléfono, Identidad, Emergencia</span>
            </div>
            {/* Pending step */}
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">
              <Circle className="w-3 h-3" />
              <span>Verificar empleo</span>
              <ArrowUpRight className="w-3 h-3 ml-auto" />
            </div>
          </div>
        </Link>
      </div>

      {/* Help link */}
      <div className="px-3 mb-2">
        <Link
          href="/ayuda"
          onClick={onItemClick}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Question className="w-[18px] h-[18px]" />
          <span>Ayuda</span>
        </Link>
      </div>

      {/* User section */}
      <div className="p-4 mt-auto border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-muted-foreground text-sm font-medium">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <SignOut className="w-4 h-4" />
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}

export function TenantDashboardSidebar({ className }: { className?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0',
          'bg-white dark:bg-card border-r border-border dark:border-border',
          className
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile List Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-40"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <List className="w-5 h-5" />
      </Button>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>List</SheetTitle>
          </SheetHeader>
          <SidebarContent onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
