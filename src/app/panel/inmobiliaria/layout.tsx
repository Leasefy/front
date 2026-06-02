'use client';

import { useMemo } from 'react';
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
    // ── AGENTES IA ── (top-of-sidebar headline — Phase 38-followup
    //                   product feedback: agents are the value prop;
    //                   surface them above the daily-driver Inicio
    //                   section so the hub experience is discovered
    //                   first.)
    { kind: 'section', label: t('inmobiliaria.nav.secAutopilot'), href: '#sec-autopilot', icon: Robot, module: null },
    {
      label: t('inmobiliaria.nav.aiAgents'),
      href: '/panel/inmobiliaria/ai',
      icon: Robot,
      module: null,
      children: [
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
      ],
    },
    // ── INICIO ──
    { kind: 'section', label: t('inmobiliaria.nav.secInicio'), href: '#sec-inicio', icon: SquaresFour, module: null },
    { label: t('inmobiliaria.nav.hoy'),          href: '/panel/inmobiliaria/hoy',          icon: Sparkle,       module: null },
    { label: t('inmobiliaria.nav.dashboard'),    href: '/panel/inmobiliaria',              icon: SquaresFour,   exact: true, module: null },
    // ── CRM · COMERCIAL ──
    { kind: 'section', label: t('inmobiliaria.nav.secCrm'), href: '#sec-crm', icon: Users, module: null },
    { label: t('inmobiliaria.nav.propietarios'), href: '/panel/inmobiliaria/propietarios', icon: UserCircle,                 module: 'propietarios' },
    { label: t('inmobiliaria.nav.propiedades'),  href: '/panel/inmobiliaria/propiedades',  icon: House,                      module: 'portafolio' },
    { label: t('inmobiliaria.nav.portafolio'),   href: '/panel/inmobiliaria/portafolio',   icon: Buildings,                  module: 'portafolio' },
    { label: t('inmobiliaria.nav.pipeline'),     href: '/panel/inmobiliaria/pipeline',     icon: Kanban,                     module: 'pipeline' },
    { label: t('inmobiliaria.nav.agentes'),      href: '/panel/inmobiliaria/agentes',      icon: Users,                      module: 'agentes' },
    { label: t('inmobiliaria.nav.mensajes'),     href: '/panel/inmobiliaria/mensajes',     icon: Chat,          badge: 5,    module: null },
    // ── FINANCIERO · ERP ──
    { kind: 'section', label: t('inmobiliaria.nav.secFinanciero'), href: '#sec-financiero', icon: CurrencyDollar, module: null },
    { label: t('inmobiliaria.nav.cobros'),       href: '/panel/inmobiliaria/cobros',       icon: CurrencyDollar,             module: 'cobros' },
    { label: t('inmobiliaria.nav.dispersiones'), href: '/panel/inmobiliaria/dispersiones', icon: PaperPlaneTilt,             module: 'dispersiones' },
    { label: t('inmobiliaria.nav.facturacion'),  href: '/panel/inmobiliaria/facturacion',  icon: Receipt,       module: null },
    { label: t('inmobiliaria.nav.conciliacion'), href: '/panel/inmobiliaria/conciliacion', icon: Bank,          module: null },
    { label: t('inmobiliaria.nav.tesoreria'),    href: '/panel/inmobiliaria/tesoreria',    icon: Wallet,        module: null },
    { label: t('inmobiliaria.nav.reportes'),     href: '/panel/inmobiliaria/reportes',     icon: ChartLine,                  module: 'reportes' },
    { label: t('inmobiliaria.nav.analitica'),    href: '/panel/inmobiliaria/analytics',    icon: ChartLineUp,                module: 'analytics' },
    // ── OPERACIÓN · DOCS ──
    { kind: 'section', label: t('inmobiliaria.nav.secOperacion'), href: '#sec-operacion', icon: Wrench, module: null },
    { label: t('inmobiliaria.nav.operaciones'),  href: '/panel/inmobiliaria/operaciones',  icon: Wrench,                     module: 'operaciones' },
    { label: t('inmobiliaria.nav.pqrs'),         href: '/panel/inmobiliaria/pqrs',         icon: Lifebuoy,      module: null },
    { label: t('inmobiliaria.nav.documentos'),   href: '/panel/inmobiliaria/documentos',   icon: FileText,                   module: 'documentos' },
    { label: t('inmobiliaria.nav.agenda'),       href: '/panel/inmobiliaria/agenda',       icon: CalendarBlank, module: null },
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
      {/* Inmobiliaria Sidebar */}
      <PlanSidebar
        navItems={INMOBILIARIA_NAV_ITEMS}
        logo={{
          title: t('inmobiliaria.common.title'),
          href: '/panel/inmobiliaria',
        }}
        showUpgrade={false}
      />

      {/* Main content area */}
      <div
        className={cn(
          'transition-all duration-200 pb-20 md:pb-0',
          isCollapsed ? 'lg:pl-16' : 'lg:pl-[240px]'
        )}
      >
        <PlanHeader />
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
              <InmobiliariaLayoutInner>{children}</InmobiliariaLayoutInner>
            </SidebarProvider>
          </PanelPrefsProvider>
        </PermissionsProvider>
      </I18nProvider>
    </ProtectedRoute>
  );
}
