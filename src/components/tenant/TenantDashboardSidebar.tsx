'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Home,
  FileSearch,
  CreditCard,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Bell,
  UserCircle,
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

const NAV_ITEMS = [
  { label: 'Panel', href: '/inquilino', icon: LayoutDashboard, exact: true },
  { label: 'Mi Arriendo', href: '/inquilino/arriendo', icon: Home },
  { label: 'Aplicaciones', href: '/inquilino/aplicaciones', icon: FileSearch },
  { label: 'Pagos', href: '/inquilino/pagos', icon: CreditCard },
  { label: 'Documentos', href: '/inquilino/documentos', icon: FileText },
  { label: 'Mensajes', href: '/inquilino/mensajes', icon: MessageSquare },
  { label: 'Notificaciones', href: '/inquilino/notificaciones', icon: Bell },
  { label: 'Perfil', href: '/inquilino/perfil', icon: UserCircle },
  { label: 'Configuracion', href: '/inquilino/configuracion', icon: Settings },
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
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

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
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-medium text-foreground tracking-[-0.02em]">
            Mi Arriendo
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isActive(item)}
            onClick={onItemClick}
          />
        ))}
      </nav>

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
          <LogOut className="w-4 h-4" />
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

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-40"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <SidebarContent onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
