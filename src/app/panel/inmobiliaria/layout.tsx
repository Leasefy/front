'use client';

import { useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  ChatCircleText,
  ShieldCheck,
  SlidersHorizontal,
  Receipt,
  Bank,
  Lifebuoy,
  CalendarBlank,
  Sparkle,
  Wallet,
  FilePlus,
  CreditCard,
  Warning,
  ClipboardText,
  Envelope,
  PhoneCall,
  Siren,
} from '@phosphor-icons/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AGENCY_ROLES, type AgencyRole } from '@/lib/auth/agency-roles';
import { PlanSidebar, NavItem } from '@/components/ui/plan/PlanSidebar';
import { PlanHeader } from '@/components/ui/plan/PlanHeader';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import { PermissionsProvider, usePermissionsContext } from '@/lib/context/PermissionsContext';
import { PanelPrefsProvider } from '@/lib/context/PanelPrefsContext';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { MobileNavBar } from '@/components/layout/MobileNavBar';
import { CommandPaletteProvider, useCommandPalette } from '@/lib/context/CommandPaletteContext';
import { CommandPalette } from '@/components/inmobiliaria/CommandPalette';
import { CommandPaletteTrigger } from '@/components/inmobiliaria/CommandPaletteTrigger';

/** Registers the global ⌘K keyboard shortcut for the command palette. */
function CommandPaletteShortcuts() {
  const { open, close, isOpen } = useCommandPalette();
  const pathname = usePathname();
  const BETA_PREFIX = '/panel/inmobiliaria/beta';
  // AI CHAT HOME F3: the chat is also the INICIO at the exact root.
  const CHAT_ROOT = '/panel/inmobiliaria';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isOpen) { e.preventDefault(); close(); }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Yield to BetaLayout's useBetaKeyboardShortcuts inside the chat
        // (the root inicio + the /beta subtree).
        if (pathname === CHAT_ROOT || pathname?.startsWith(BETA_PREFIX)) return;
        e.preventDefault();
        if (isOpen) { close(); } else { open(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pathname, isOpen, open, close]);

  return null;
}

interface InmobiliariaLayoutProps {
  children: React.ReactNode;
}

/**
 * Inner layout that uses sidebar context
 */
function InmobiliariaLayoutInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const { locale, t } = useI18n();
  const { canAccess, isLoading: permissionsLoading, isAdmin, agencyRole } = usePermissionsContext();

  // All nav items with their corresponding permission module (null = always visible).
  // Items with children use a helper type that extends NavItem with an optional module field.
  // `roles` is an optional role-based gate (in addition to module-based gating).
  type NavItemWithModule = NavItem & { module?: string | null; roles?: AgencyRole[] };

  const ALL_NAV_ITEMS = useMemo((): NavItemWithModule[] => [
    // ── PRINCIPAL ──
    { kind: 'section', label: t('inmobiliaria.nav.secInicio'), href: '#sec-inicio', icon: SquaresFour, module: null },
    { label: t('inmobiliaria.nav.hoy'),          href: '/panel/inmobiliaria/hoy',          icon: Sparkle,       module: null },
    { label: t('inmobiliaria.nav.dashboard'),    href: '/panel/inmobiliaria/dashboard',    icon: SquaresFour,   exact: true, module: null },
    // ── AGENTES IA ──
    { kind: 'section', label: t('inmobiliaria.nav.secAgentes'), href: '#sec-agentes', icon: Sparkle, module: null },
    {
      label: t('inmobiliaria.ai.nav.cobranza'),
      href: '/panel/inmobiliaria/ai/cobranza',
      icon: ChatCircleText,
      module: 'cobranza',
      dataTourTarget: 'sidebar-cobranza',
      children: [
        {
          label: t('inmobiliaria.ai.nav.arco'),
          href: '/panel/inmobiliaria/ai/cobranza/arco',
          icon: ShieldCheck,
          module: 'cobranza',
        } as NavItemWithModule,
        {
          label: t('inmobiliaria.ai.nav.plantillas'),
          href: '/panel/inmobiliaria/ai/cobranza/plantillas',
          icon: FileText,
          module: 'cobranza',
        } as NavItemWithModule,
        {
          label: t('inmobiliaria.ai.nav.configuracion'),
          href: '/panel/inmobiliaria/ai/cobranza/configuracion',
          icon: SlidersHorizontal,
          module: 'cobranza',
          dataTourTarget: 'sidebar-configuraciones',
        } as NavItemWithModule,
        {
          label: t('inmobiliaria.ai.nav.analitica'),
          href: '/panel/inmobiliaria/ai/cobranza/analitica',
          icon: ChartLineUp,
          module: 'cobranza',
        } as NavItemWithModule,
        {
          label: t('inmobiliaria.ai.nav.deudores'),
          href: '/panel/inmobiliaria/ai/cobranza/deudores',
          icon: Users,
          module: 'cobranza',
        } as NavItemWithModule,
        {
          label: t('inmobiliaria.ai.nav.pagos'),
          href: '/panel/inmobiliaria/ai/cobranza/pagos',
          icon: CreditCard,
          module: 'cobranza',
        } as NavItemWithModule,
        {
          label: t('inmobiliaria.ai.nav.escalaciones'),
          href: '/panel/inmobiliaria/ai/cobranza/escalaciones',
          icon: Warning,
          module: 'cobranza',
        } as NavItemWithModule,
        {
          label: t('inmobiliaria.ai.nav.compliance'),
          href: '/panel/inmobiliaria/ai/cobranza/compliance',
          icon: ClipboardText,
          module: 'cobranza',
        } as NavItemWithModule,
        {
          label: t('inmobiliaria.ai.nav.cartas'),
          href: '/panel/inmobiliaria/ai/cobranza/cartas',
          icon: Envelope,
          module: 'cobranza',
        } as NavItemWithModule,
        {
          label: t('inmobiliaria.ai.nav.llamadas'),
          href: '/panel/inmobiliaria/ai/cobranza/llamadas',
          icon: PhoneCall,
          module: 'cobranza',
        } as NavItemWithModule,
      ],
    } as NavItemWithModule,
    {
      label: t('inmobiliaria.ai.nav.cotizador'),
      href: '/panel/inmobiliaria/ai/cotizador',
      icon: FileText,
      module: 'cotizador',
      dataTourTarget: 'sidebar-cotizador',
      children: [
        {
          label: t('inmobiliaria.ai.cotizador.nav.aseguradoras'),
          href: '/panel/inmobiliaria/ai/cotizador/aseguradoras',
          icon: ShieldCheck,
          module: 'cotizador',
        } as NavItemWithModule,
        {
          label: t('inmobiliaria.ai.cotizador.nav.insights'),
          href: '/panel/inmobiliaria/ai/cotizador/insights',
          icon: ChartLineUp,
          module: 'cotizador',
        } as NavItemWithModule,
        {
          label: t('inmobiliaria.ai.cotizador.nav.costos'),
          href: '/panel/inmobiliaria/ai/cotizador/costos',
          icon: CurrencyDollar,
          module: 'cotizador',
        } as NavItemWithModule,
      ],
    } as NavItemWithModule,
    { label: t('inmobiliaria.nav.conciliacion'), href: '/panel/inmobiliaria/conciliacion', icon: Bank,           module: null, roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR] },
    { label: t('inmobiliaria.ai.nav.pagos'),     href: '/panel/inmobiliaria/ai/pagos',     icon: CurrencyDollar, module: null, roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR] },
    { label: t('inmobiliaria.ai.nav.siniestros'), href: '/panel/inmobiliaria/ai/cobranza/siniestros', icon: Siren, module: 'cobranza' },
    // ── PORTAFOLIO ──
    { kind: 'section', label: t('inmobiliaria.nav.secPortafolio'), href: '#sec-portafolio', icon: Buildings, module: null },
    { label: t('inmobiliaria.nav.propiedades'),  href: '/panel/inmobiliaria/propiedades',  icon: House,         module: 'portafolio' },
    { label: t('inmobiliaria.nav.contratos'),    href: '/panel/inmobiliaria/contratos',    icon: FilePlus,      module: 'portafolio' },
    { label: t('inmobiliaria.nav.portafolio'),   href: '/panel/inmobiliaria/portafolio',   icon: Buildings,     module: 'portafolio' },
    { label: t('inmobiliaria.nav.propietarios'), href: '/panel/inmobiliaria/propietarios', icon: UserCircle,    module: 'propietarios' },
    { label: t('inmobiliaria.nav.pipeline'),     href: '/panel/inmobiliaria/pipeline',     icon: Kanban,        module: 'pipeline' },
    { label: t('inmobiliaria.nav.equipo'),       href: '/panel/inmobiliaria/agentes',      icon: Users,         module: 'agentes' },
    // ── FINANZAS ──
    { kind: 'section', label: t('inmobiliaria.nav.secFinanzas'), href: '#sec-finanzas', icon: Wallet, module: null },
    { label: t('inmobiliaria.nav.cobros'),       href: '/panel/inmobiliaria/cobros',       icon: CurrencyDollar, module: 'cobros' },
    { label: t('inmobiliaria.nav.dispersiones'), href: '/panel/inmobiliaria/dispersiones', icon: PaperPlaneTilt, module: 'dispersiones' },
    { label: t('inmobiliaria.nav.tesoreria'),    href: '/panel/inmobiliaria/tesoreria',    icon: Wallet,         module: null, roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR] },
    { label: t('inmobiliaria.nav.facturacion'),  href: '/panel/inmobiliaria/facturacion',  icon: Receipt,        module: null, roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR] },
    // ── ANÁLISIS ──
    { kind: 'section', label: t('inmobiliaria.nav.secAnalisis'), href: '#sec-analisis', icon: ChartLine, module: null },
    { label: t('inmobiliaria.nav.reportes'),     href: '/panel/inmobiliaria/reportes',     icon: ChartLine,     module: 'reportes' },
    { label: t('inmobiliaria.nav.analitica'),    href: '/panel/inmobiliaria/analytics',    icon: ChartLineUp,   module: 'analytics' },
    // ── OPERACIONES ──
    { kind: 'section', label: t('inmobiliaria.nav.secOperaciones'), href: '#sec-operaciones', icon: Wrench, module: null },
    { label: t('inmobiliaria.nav.operaciones'),  href: '/panel/inmobiliaria/operaciones',  icon: Wrench,        module: 'operaciones' },
    { label: t('inmobiliaria.nav.pqrs'),         href: '/panel/inmobiliaria/pqrs',         icon: Lifebuoy,      module: null },
    { label: t('inmobiliaria.nav.agenda'),       href: '/panel/inmobiliaria/agenda',       icon: CalendarBlank, module: null },
    { label: t('inmobiliaria.nav.mensajes'),     href: '/panel/inmobiliaria/mensajes',     icon: Chat,          badge: 5, module: null },
    // ── BOTTOM ──
    { label: t('inmobiliaria.nav.documentos'),   href: '/panel/inmobiliaria/documentos',   icon: FileText,      module: 'documentos' },
    { label: t('inmobiliaria.nav.configuracion'), href: '/panel/inmobiliaria/configuracion', icon: Gear,         module: null },
  ], [t]);

  const INMOBILIARIA_NAV_ITEMS: NavItem[] = useMemo(() => {
    // While loading, show all items to avoid flash
    if (permissionsLoading) return ALL_NAV_ITEMS;

    const filterItem = (item: NavItemWithModule): NavItemWithModule | null => {
      // Module-based gate (unchanged): cobranza/cotizador use agent permissions;
      // other modules use the legacy effectivePermissions map.
      if (item.module && !canAccess(item.module, 'view')) return null;
      // Role-based gate: if the item declares `roles`, the current user must
      // be a super-admin (isAdmin) OR have an agencyRole that is in the list.
      // isAdmin bypasses role gating so Supabase service-role users always pass.
      if (item.roles && item.roles.length > 0) {
        const roleAllowed =
          isAdmin ||
          (agencyRole !== null && (item.roles as string[]).includes(agencyRole));
        if (!roleAllowed) return null;
      }
      if (item.children && item.children.length > 0) {
        const filteredChildren = (item.children as NavItemWithModule[])
          .map(filterItem)
          .filter((c): c is NavItemWithModule => c !== null);
        return { ...item, children: filteredChildren };
      }
      return item;
    };

    const filtered = ALL_NAV_ITEMS.map(filterItem).filter((item): item is NavItem => item !== null);
    // Drop a section header left with no real items after permission filtering.
    return filtered.filter((item, idx) => {
      if (item.kind !== 'section') return true;
      const next = filtered[idx + 1];
      return next != null && next.kind !== 'section';
    });
  }, [ALL_NAV_ITEMS, canAccess, permissionsLoading, isAdmin, agencyRole]);

  return (
    <div className="min-h-screen bg-plan-page">
      {/* Global ⌘K shortcut listener — context-aware (skips beta subtree) */}
      <CommandPaletteShortcuts />
      {/* Command palette modal — portal renders above everything */}
      <CommandPalette />

      {/* Inmobiliaria Sidebar */}
      <PlanSidebar
        navItems={INMOBILIARIA_NAV_ITEMS}
        logo={{
          title: t('inmobiliaria.common.title'),
          href: '/panel/inmobiliaria',
        }}
        showUpgrade={false}
        aboveNav={<CommandPaletteTrigger className="w-full rounded-xl" />}
      />

      {/* Main content area */}
      <div
        className={cn(
          'transition-all duration-200 pb-20 md:pb-0',
          isCollapsed ? 'lg:pl-16' : 'lg:pl-[240px]'
        )}
      >
        {/* Search lives only in the sidebar (aboveNav). Top bar keeps notifications + avatar. */}
        <PlanHeader showMagnifyingGlass={false} />
        <main id="main-content" tabIndex={-1}>{children}</main>
      </div>

      {/* Mobile bottom navigation — hidden at md+ breakpoints */}
      <MobileNavBar navItems={INMOBILIARIA_NAV_ITEMS} />

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
          <PanelPrefsProvider>
            <SidebarProvider>
              {/* CommandPaletteProvider wraps the inner layout so both the
                  shortcut hook and the modal can read/write palette state. */}
              <CommandPaletteProvider>
                <InmobiliariaLayoutInner>{children}</InmobiliariaLayoutInner>
              </CommandPaletteProvider>
            </SidebarProvider>
          </PanelPrefsProvider>
        </PermissionsProvider>
      </I18nProvider>
    </ProtectedRoute>
  );
}
