'use client';

import { useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  ChatCircleText,
  ShieldCheck,
  Receipt,
  Bank,
  Lifebuoy,
  CalendarBlank,
  Sparkle,
  Wallet,
  FilePlus,
  ClipboardText,
  GitMerge,
  Scales,
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
import { AgentHeaderBreadcrumb } from '@/components/inmobiliaria/ai/AgentHeaderBreadcrumb';

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
  const { open: openCommandPalette } = useCommandPalette();
  const router = useRouter();

  // All nav items with their corresponding permission module (null = always visible).
  // Items with children use a helper type that extends NavItem with an optional module field.
  // `roles` is an optional role-based gate (in addition to module-based gating).
  // `adminOnly` is a stricter gate: only super-admins see the item (no role list).
  type NavItemWithModule = NavItem & { module?: string | null; roles?: AgencyRole[]; adminOnly?: boolean };

  const ALL_NAV_ITEMS = useMemo((): NavItemWithModule[] => [
    // ── PRINCIPAL ──
    { kind: 'section', label: t('inmobiliaria.nav.secInicio'), href: '#sec-inicio', icon: SquaresFour, module: null },
    // AI CHAT HOME F3: "Inicio" opens the embedded chat at the panel root —
    // exact match so it doesn't stay highlighted on every subroute.
    { label: t('inmobiliaria.nav.inicio'),       href: '/panel/inmobiliaria',              icon: Sparkle,       exact: true, module: null },
    // ── AGENTES IA ──
    { kind: 'section', label: t('inmobiliaria.nav.secAgentes'), href: '#sec-agentes', icon: Sparkle, module: null },
    {
      label: t('inmobiliaria.ai.nav.cobranza'),
      href: '/panel/inmobiliaria/ai/cobranza',
      icon: ChatCircleText,
      module: 'cobranza',
      dataTourTarget: 'sidebar-cobranza',
      // Las funciones del agente (Casos/Pendientes/Inbox/Pagos/Cartas/…) ya NO
      // viven aquí: se renderizan como tabs DENTRO del workspace (WorkspaceNav),
      // alimentadas por src/lib/nav/agentWorkspaceNav.ts. El sidebar muestra el
      // agente como un único ítem para no abrumar.
    } as NavItemWithModule,
    {
      label: t('inmobiliaria.ai.nav.cotizador'),
      href: '/panel/inmobiliaria/ai/asegurabilidad',
      icon: FileText,
      module: 'cotizador',
      dataTourTarget: 'sidebar-cotizador',
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,
    {
      // Avalúos (7º agente): standalone service proxied by the agent backend;
      // read-only tracking workspace (la inmobiliaria solicita y consulta —
      // la firma del certificado la gestiona el avaluador Portofino/Leasefy).
      // Gated by the agent module 'avaluos' with the ABSENT-module = ALLOWED
      // fallback (see agent-module-access.ts) so either repo merges first.
      label: t('inmobiliaria.ai.nav.avaluos'),
      href: '/panel/inmobiliaria/ai/avaluos',
      icon: Scales,
      module: 'avaluos',
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,
    {
      // F6: Conciliación is the first complete agent workspace — the parent
      // now points at the Sala (/ai/conciliacion); the legacy /conciliacion
      // movimientos page stays reachable from the Sala's domain slot.
      label: t('inmobiliaria.nav.conciliacion'),
      href: '/panel/inmobiliaria/ai/conciliacion',
      icon: Bank,
      module: null,
      roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR],
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,
    {
      // F7: Estudio del inquilino complete workspace. Gated by the agent
      // module 'estudio' (my-permissions payload, agent-repo pair PR) with
      // an ABSENT-module = ALLOWED fallback (see agent-module-access.ts) so
      // either repo can merge first; backend still scopes by membership and
      // decisions are audit-first per T-323.
      label: t('inmobiliaria.ai.nav.estudio'),
      href: '/panel/inmobiliaria/ai/estudio',
      icon: ShieldCheck,
      module: 'estudio',
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,
    {
      // F8: Matching complete workspace. Gated by the agent module 'matching'
      // with the same ABSENT-module = ALLOWED fallback as estudio (see
      // agent-module-access.ts); backend scopes by agency membership and
      // outreach happens only with approval.
      label: t('inmobiliaria.ai.nav.matching'),
      href: '/panel/inmobiliaria/ai/matching',
      icon: GitMerge,
      module: 'matching',
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,
    {
      // F9: Pagos (AP) complete workspace — the parent now points at the Sala
      // (/ai/pagos); the deep AP/dispersiones ops stay in Tesorería and are
      // cross-linked from the Sala's domain slot. The ADMIN|CONTADOR role gate
      // from F4 is PRESERVED on the parent and both children.
      label: t('inmobiliaria.ai.nav.pagos'),
      href: '/panel/inmobiliaria/ai/pagos',
      icon: CurrencyDollar,
      module: null,
      roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR],
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,
    { label: t('inmobiliaria.nav.postulaciones'), href: '/panel/inmobiliaria/postulaciones', icon: ClipboardText, module: null },
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
    { label: t('inmobiliaria.nav.configuracion'), href: '/panel/inmobiliaria/configuracion', icon: Gear,         module: null, dataTourTarget: 'sidebar-configuraciones' },
  ], [t]);

  const INMOBILIARIA_NAV_ITEMS: NavItem[] = useMemo(() => {
    // Always filter by permission/role. While permissions load, canAccess()
    // returns false for every gated module (and isAdmin/agencyRole are null),
    // so the result is the conservative always-visible subset — gated items
    // (cobranza/cotizador/conciliación/…) only appear once access is confirmed
    // and never flash in then disappear. The desktop sidebar shows a skeleton
    // during this window instead (PlanSidebar `loading` prop below).
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
  }, [ALL_NAV_ITEMS, agencyRole, canAccess, isAdmin, permissionsLoading]);

  return (
    <div className="min-h-screen bg-plan-page">
      {/* Global ⌘K shortcut listener — context-aware (skips beta subtree) */}
      <CommandPaletteShortcuts />
      {/* Command palette modal — portal renders above everything */}
      <CommandPalette />

      {/* Inmobiliaria Sidebar */}
      <PlanSidebar
        navItems={INMOBILIARIA_NAV_ITEMS}
        loading={permissionsLoading}
        logo={{
          title: t('inmobiliaria.common.title'),
          href: '/panel/inmobiliaria',
        }}
        // cadence §Navigation: workspace switcher + search-opens-⌘K + footer cards
        workspaceName={t('inmobiliaria.common.title')}
        workspaces={[
          {
            id: 'current',
            name: t('inmobiliaria.common.title'),
            description: 'Panel de tu inmobiliaria',
            active: true,
          },
        ]}
        onSearchClick={openCommandPalette}
        searchPlaceholder="Buscar"
        showInvite
        onInvite={() => router.push('/panel/inmobiliaria/agentes')}
        showUpgrade
        upgradeHref="/panel/inmobiliaria/configuracion"
      />

      {/* Main content area */}
      <div
        className={cn(
          // pb-20 reserves space for the mobile bottom nav, which is visible
          // below lg (same breakpoint where the desktop sidebar appears).
          'transition-all duration-200 pb-20 lg:pb-0',
          isCollapsed ? 'lg:pl-16' : 'lg:pl-[240px]'
        )}
      >
        {/* Search lives only in the sidebar (aboveNav). Top bar keeps notifications + avatar.
            leftSlot carries the AI agent breadcrumb — all agent nav lives at the top now
            (breadcrumb here + WorkspaceNav tabs below), so pages drop their MigaDePan. */}
        <PlanHeader showMagnifyingGlass={false} leftSlot={<AgentHeaderBreadcrumb />} />
        <main id="main-content" tabIndex={-1}>{children}</main>
      </div>

      {/* Mobile bottom navigation — hidden at lg+ (where the sidebar appears) */}
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
    // DEV-LOCAL-OVERRIDE (2026-06-14, NO COMMIT): permite que una cuenta tenant
    // entre al panel de inmobiliaria en local para pruebas de UI. Revertir a
    // allowedRoles={['agency']} antes de cualquier commit. Buscar "DEV-LOCAL-OVERRIDE".
    <ProtectedRoute allowedRoles={['agency', 'tenant']}>
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
