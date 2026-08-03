'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SquaresFour, House, FileMagnifyingGlass, CreditCard, FileText, Chat, Gear, SignOut, List, Bell, UserCircle, Heart, Question, TrendUp, ArrowUpRight, CheckCircle, Circle } from '@phosphor-icons/react';

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
// Real Cadence Sidebar component family — the nav rows / section / brand /
// footer are DS components (own hover/active/focus); the profile-completion
// widget + help link are composed AROUND them.
import {
  Sidebar,
  SidebarBrand,
  SidebarSection,
  SidebarItem,
  SidebarFooterUser,
} from '@leasefy/cadence';

// Cadence signature grain — feTurbulence fractalNoise overlay used on the
// grainy-gradient brand logo square.
const CADENCE_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='120'%20height='120'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.85'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3C/filter%3E%3Crect%20width='100%25'%20height='100%25'%20filter='url(%23n)'/%3E%3C/svg%3E\")";

interface NavItemDef {
  label: string;
  href: string;
  icon: typeof SquaresFour;
  exact?: boolean;
  badge?: number;
}

const NAV_ITEMS: NavItemDef[] = [
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

/** Tenant brand glyph — grainy cobalt→cyan square with the House mark. */
function BrandLogo() {
  return (
    <span
      className="relative flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] shadow-xs"
      style={{ background: 'linear-gradient(140deg,#1A40FF,#2BB5E8)' }}
      aria-hidden="true"
    >
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: CADENCE_GRAIN,
          backgroundSize: '120px 120px',
          mixBlendMode: 'overlay',
          opacity: 0.4,
        }}
      />
      <House className="relative w-4 h-4 text-white" weight="fill" />
    </span>
  );
}

interface NavRowProps {
  item: NavItemDef;
  isActive: boolean;
  onClick?: () => void;
}

/** A real Cadence `SidebarItem`, bridged to Next routing via legacy Link. */
function NavRow({ item, isActive, onClick }: NavRowProps) {
  const Icon = item.icon;
  return (
    <Link href={item.href} legacyBehavior passHref>
      <SidebarItem
        icon={<Icon weight={isActive ? 'fill' : 'regular'} />}
        label={item.label}
        active={isActive}
        count={item.badge && item.badge > 0 ? item.badge : undefined}
        onClick={onClick}
      />
    </Link>
  );
}

interface SidebarShellProps {
  className?: string;
  onItemClick?: () => void;
}

function SidebarShell({ className, onItemClick }: SidebarShellProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount } = useUnreadMessages();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.replace('/auth');
    }
  };

  const isActive = (item: NavItemDef) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const helpActive = (pathname ?? '').startsWith('/ayuda');

  return (
    <Sidebar
      className={className}
      header={
        <Link href="/inquilino" onClick={onItemClick} className="flex w-full items-center gap-2.5">
          <SidebarBrand logo={<BrandLogo />} name="Mi Arriendo" />
        </Link>
      }
    >
      <SidebarSection label="Panel">
        {NAV_ITEMS.map((item) => {
          const dynamicItem = item.href === '/inquilino/mensajes' && unreadCount > 0
            ? { ...item, badge: unreadCount }
            : item;
          return (
            <NavRow
              key={item.href}
              item={dynamicItem}
              isActive={isActive(item)}
              onClick={onItemClick}
            />
          );
        })}
      </SidebarSection>

      {/* Profile widget + help + user pinned to the bottom of the rail. */}
      <div className="mt-auto pt-3">
        {/* Profile completion widget */}
        <div className="px-2 mb-3">
          <Link
            href="/inquilino/perfil"
            onClick={onItemClick}
            className="block p-3 rounded-xl bg-surface-muted border border-border-faint hover:bg-surface-hover transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-[10px] bg-surface border border-border-faint flex items-center justify-center">
                <TrendUp className="w-4 h-4 text-fg-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg">Completa tu perfil</p>
                <p className="text-xs text-fg-subtle font-mono tabular-nums">80% completado</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-border rounded-full overflow-hidden mb-3">
              <div className="h-full w-4/5 bg-primary rounded-full" />
            </div>

            {/* Steps summary */}
            <div className="space-y-1.5">
              {/* Completed steps */}
              <div className="flex items-center gap-1.5 text-[11px] text-success">
                <CheckCircle className="w-3 h-3" weight="fill" />
                <span>Info básica, Teléfono, Identidad, Emergencia</span>
              </div>
              {/* Pending step */}
              <div className="flex items-center gap-1.5 text-[11px] text-fg-muted font-medium">
                <Circle className="w-3 h-3" />
                <span>Verificar empleo</span>
                <ArrowUpRight className="w-3 h-3 ml-auto" />
              </div>
            </div>
          </Link>
        </div>

        {/* Help link — also a real SidebarItem */}
        <div className="mb-2">
          <Link href="/ayuda" legacyBehavior passHref>
            <SidebarItem
              icon={<Question weight={helpActive ? 'fill' : 'regular'} />}
              label="Ayuda"
              active={helpActive}
              onClick={onItemClick}
            />
          </Link>
        </div>

        {/* User section — real SidebarFooterUser + logout */}
        <div className="border-t border-border px-2 pt-3">
          <div className="flex items-center gap-[9px] px-1 py-1 mb-1">
            <SidebarFooterUser
              initials={user?.name?.charAt(0).toUpperCase() || 'U'}
              orgName={user?.name || 'Usuario'}
              plan={user?.email || ''}
            />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-fg-muted hover:text-fg rounded-full"
            onClick={handleLogout}
          >
            <SignOut className="w-4 h-4" />
            <span className="text-sm">Cerrar sesion</span>
          </Button>
        </div>
      </div>
    </Sidebar>
  );
}

export function TenantDashboardSidebar({ className }: { className?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop rail — the Cadence Sidebar IS the <aside>. */}
      <SidebarShell className={cn('hidden lg:flex lg:fixed lg:inset-y-0 lg:w-64', className)} />

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
          <SidebarShell className="h-full w-full border-r-0" onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
