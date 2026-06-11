'use client';

import { useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/toast';
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
} from '@phosphor-icons/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isOpen) { e.preventDefault(); close(); }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Yield to BetaLayout's useBetaKeyboardShortcuts when inside the beta subtree.
        if (pathname?.startsWith(BETA_PREFIX)) return;
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
  const { canAccess, isLoading: permissionsLoading } = usePermissionsContext();

  // All nav items with their corresponding permission module (null = always visible).
  // Items with children use a helper type that extends NavItem with an optional module field.
  type NavItemWithModule = NavItem & { module?: string | null };

  const ALL_NAV_ITEMS = useMemo((): NavItemWithModule[] => [
    // ── INICIO ──
    { kind: 'section', label: t('inmobiliaria.nav.secInicio'), href: '#sec-inicio', icon: SquaresFour, module: null },
    { label: t('inmobiliaria.nav.hoy'),          href: '/panel/inmobiliaria/hoy',          icon: Sparkle,       module: null },
    { label: t('inmobiliaria.nav.dashboard'),    href: '/panel/inmobiliaria',              icon: SquaresFour,   exact: true, module: null },
    // ── CARTERA ──
    { kind: 'section', label: t('inmobiliaria.nav.secCartera'), href: '#sec-cartera', icon: ChatCircleText, module: null },
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
      ],
    } as NavItemWithModule,
    { label: t('inmobiliaria.nav.cobros'),       href: '/panel/inmobiliaria/cobros',       icon: CurrencyDollar, module: 'cobros' },
    // ── PORTAFOLIO ──
    { kind: 'section', label: t('inmobiliaria.nav.secPortafolio'), href: '#sec-portafolio', icon: Buildings, module: null },
    { label: t('inmobiliaria.nav.propiedades'),  href: '/panel/inmobiliaria/propiedades',  icon: House,         module: 'portafolio' },
    { label: t('inmobiliaria.nav.portafolio'),   href: '/panel/inmobiliaria/portafolio',   icon: Buildings,     module: 'portafolio' },
    { label: t('inmobiliaria.nav.propietarios'), href: '/panel/inmobiliaria/propietarios', icon: UserCircle,    module: 'propietarios' },
    { label: t('inmobiliaria.nav.pipeline'),     href: '/panel/inmobiliaria/pipeline',     icon: Kanban,        module: 'pipeline' },
    { label: t('inmobiliaria.nav.agentes'),      href: '/panel/inmobiliaria/agentes',      icon: Users,         module: 'agentes' },
    // ── TESORERÍA ──
    { kind: 'section', label: t('inmobiliaria.nav.secTesoreria'), href: '#sec-tesoreria', icon: Wallet, module: null },
    { label: t('inmobiliaria.nav.dispersiones'), href: '/panel/inmobiliaria/dispersiones', icon: PaperPlaneTilt, module: 'dispersiones' },
    { label: t('inmobiliaria.nav.tesoreria'),    href: '/panel/inmobiliaria/tesoreria',    icon: Wallet,         module: null },
    { label: t('inmobiliaria.nav.facturacion'),  href: '/panel/inmobiliaria/facturacion',  icon: Receipt,        module: null },
    { label: t('inmobiliaria.nav.conciliacion'), href: '/panel/inmobiliaria/conciliacion', icon: Bank,           module: null },
    // ── COTIZADOR ──
    { kind: 'section', label: t('inmobiliaria.nav.secCotizador'), href: '#sec-cotizador', icon: FileText, module: null },
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
    // ── INTELIGENCIA ──
    { kind: 'section', label: t('inmobiliaria.nav.secInteligencia'), href: '#sec-inteligencia', icon: ChartLine, module: null },
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
  ], [t]);

  const INMOBILIARIA_NAV_ITEMS: NavItem[] = useMemo(() => {
    // While loading, show all items to avoid flash
    if (permissionsLoading) return ALL_NAV_ITEMS;

    const filterItem = (item: NavItemWithModule): NavItemWithModule | null => {
      if (item.module && !canAccess(item.module, 'view')) return null;
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
  }, [ALL_NAV_ITEMS, canAccess, permissionsLoading]);

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
        {/* Pass the search pill as an action to the top bar */}
        <PlanHeader actions={<CommandPaletteTrigger />} />
        <main id="main-content" tabIndex={-1}>{children}</main>
      </div>

      {/* Mobile bottom navigation — hidden at md+ breakpoints */}
      <MobileNavBar navItems={INMOBILIARIA_NAV_ITEMS} />

      {/* Toast notifications - Premium style */}
      <Toaster position="top-right" />
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
