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
  Calculator,
  ChartLineUp,
  Wrench,
  ArrowsClockwise,
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
  ListChecks,
  Brain,
  Path,
  HandCoins,
  CurrencyCircleDollar,
  Umbrella,
} from '@phosphor-icons/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AgencySubscriptionGuard } from '@/components/auth/AgencySubscriptionGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { PlanSidebar, NavItem } from '@/components/ui/plan/PlanSidebar';
import { filterAgencyNav, type NavItemWithModule } from '@/lib/nav/agency-nav-filter';
import { PlanHeader } from '@/components/ui/plan/PlanHeader';
import { SidebarProvider, useSidebar } from '@/lib/context/SidebarContext';
import { PermissionsProvider, usePermissionsContext } from '@/lib/context/PermissionsContext';
import { PanelPrefsProvider } from '@/lib/context/PanelPrefsContext';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { MobileNavBar } from '@/components/layout/MobileNavBar';
import { CommandPaletteProvider, useCommandPalette } from '@/lib/context/CommandPaletteContext';
import { CommandPalette } from '@/components/inmobiliaria/CommandPalette';
import { BotonNuevo } from '@/components/inmobiliaria/BotonNuevo';
import { AgentHeaderBreadcrumb } from '@/components/inmobiliaria/ai/AgentHeaderBreadcrumb';
import { useAgencySubscription } from '@/lib/hooks/useAgencySubscription';
import { usePostulacionesPendientes } from '@/lib/hooks/use-postulaciones-pendientes';
import { useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import { useAuth } from '@/lib/auth/use-auth';
import { hexToHslTriplet } from '@/lib/utils/hex-to-hsl';

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
  const { canAccess, isLoading: permissionsLoading, isAdmin, agencyRole, agentAccessStatus } = usePermissionsContext();
  const { open: openCommandPalette } = useCommandPalette();
  const router = useRouter();
  // Upgrade CTA only when the agency is NOT on a paid plan (i.e. on the
  // free/default plan) — derived from the plan's isDefault flag, never a tier
  // name (contrato 29). While the subscription / plan catalog is loading or
  // errored the CTA stays hidden (indeterminate) so paying users never see a
  // flash of "Upgrade".
  const { isPaidPlan, indeterminate: subIndeterminate } = useAgencySubscription();
  const showUpgradeCta = !subIndeterminate && !isPaidPlan;

  // Real agency identity for the sidebar brand row. PRIMARY source is the auth
  // membership probe (`useAuth().agency`), which is available to EVERY active
  // member regardless of role — a CONTADOR/AGENTE/VIEWER can't read
  // GET /inmobiliaria/config (it's admin-gated via @RequirePermission
  // 'configuracion'), so relying on config alone left team members with the
  // generic "Inmobiliaria" fallback. Config is kept as a secondary source for
  // admins. Falls back to the i18n title while loading / if empty, so the brand
  // never flashes empty. `logoUrl` empty → PlanSidebar shows the LeasefyMark.
  const { agency } = useAuth();
  const { config } = useInmobiliariaConfig();
  const agencyName =
    agency?.name?.trim() ||
    config?.agency?.name?.trim() ||
    t('inmobiliaria.common.title');
  const agencyLogoUrl =
    agency?.logoUrl?.trim() || config?.agency?.logoUrl?.trim() || undefined;
  // Agency brand color (Option A: sidebar accents only). Same all-members source
  // as name/logo so team members get it too. Converted to an HSL triplet because
  // PlanSidebar scopes it onto `--primary` (consumed via hsl(var(--primary))).
  // Invalid/empty → undefined → PlanSidebar keeps the DS default color.
  const agencyPrimaryColor =
    agency?.branding?.primaryColor?.trim() ||
    config?.agency?.branding?.primaryColor?.trim() ||
    undefined;
  const brandPrimaryHsl = hexToHslTriplet(agencyPrimaryColor) ?? undefined;

  // All nav items with their corresponding permission module (null = always visible).
  // `NavItemWithModule` (imported) extends NavItem with an optional `module`
  // permission gate, an optional `roles` role gate, and `adminOnly`.
  // Paso 7: cuánta gente está esperando gestión, con dato real.
  const { pendientes: postulacionesPendientes } = usePostulacionesPendientes();

  const ALL_NAV_ITEMS = useMemo((): NavItemWithModule[] => [
    // ═══════════════════════════════════════════════════════════════════════
    // Agrupación por MÓDULO DE NEGOCIO — Comercial · Administración · Finanzas
    //
    // Reemplaza el corte anterior por naturaleza técnica (Agentes IA /
    // Portafolio / Operaciones / Análisis), que obligaba a cada persona a
    // recorrer todo el menú para encontrar lo suyo: los agentes vivían juntos
    // en una sección aparte, separados del trabajo que hacen. Ahora cada ítem
    // vive donde el equipo lo busca, y el pill IA marca cuál está asistido por
    // un agente. "Una inmobiliaria se compone de esos tres factores:
    // comercial, administración y finanzas" (definición del negocio).
    //
    // Reglas de la agrupación:
    //   · Un ítem vive en UN solo módulo — nada se duplica.
    //   · Lo transversal (resúmenes, equipo, config) va a GENERAL, al final.
    //   · `ai: true` = asistido por agente · `tag` = estado ("Próximamente").
    //   · `hint` matiza sin engordar la etiqueta ("Prospección · pipeline").
    //     NO sirve para salvar un nombre repetido: dos filas con el mismo
    //     nombre se renombran (regla madre de docs/VOCABULARIO.md). Lo cuida
    //     `nav-sidebar.test.ts`, que también exige un icono distinto por fila.
    //
    // Los gates NO cambian: cada ítem conserva su `module`/`roles` exactos, así
    // que reordenar no le abre a nadie una pantalla que antes no veía.
    // ═══════════════════════════════════════════════════════════════════════

    // ── INICIO ──
    { kind: 'section', label: t('inmobiliaria.nav.secInicio'), href: '#sec-inicio', icon: SquaresFour, module: null },
    // AI CHAT HOME F3: "Inicio" opens the embedded chat at the panel root —
    // exact match so it doesn't stay highlighted on every subroute.
    { label: t('inmobiliaria.nav.inicio'),       href: '/panel/inmobiliaria',              icon: House,         exact: true, module: null },

    // ── COMERCIAL ──  Conseguir inmuebles, estudiar clientes y cerrar renta.
    { kind: 'section', label: t('inmobiliaria.nav.secComercial'), href: '#sec-comercial', scope: 'comercial', icon: Kanban, module: null },
    { label: t('inmobiliaria.nav.pipeline'),     href: '/panel/inmobiliaria/pipeline', scope: 'comercial',     icon: Kanban,        module: 'pipeline', hint: t('inmobiliaria.nav.hintPipeline') },
    // Una sola entrada. Eran dos —«Consignaciones» e «Inmuebles · catálogo»—
    // sobre la MISMA lista: medido, 10 consignaciones y 10 inmuebles con
    // correspondencia 1:1, ningún huérfano de ningún lado y el mismo permiso
    // (`portafolio`) protegiendo las dos. La consignación no desaparece: es el
    // mandato, y vive dentro del inmueble.
    { label: t('inmobiliaria.nav.inmuebles'),    href: '/panel/inmobiliaria/inmuebles', scope: 'comercial',   icon: Buildings,     module: 'portafolio', hint: t('inmobiliaria.nav.hintInmuebles') },
    {
      // Avalúos (7º agente): standalone service proxied by the agent backend;
      // read-only tracking workspace (la inmobiliaria solicita y consulta —
      // la firma del certificado la gestiona el avaluador Portofino/Leasefy).
      // Gated by the agent module 'avaluos' with the ABSENT-module = ALLOWED
      // fallback (see agent-module-access.ts) so either repo merges first.
      label: t('inmobiliaria.ai.nav.avaluos'),
      href: '/panel/inmobiliaria/ai/avaluos', scope: 'comercial',
      icon: Scales,
      module: 'avaluos',
      ai: true,
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,
    {
      // F7: Estudio del inquilino complete workspace. Gated by the agent
      // module 'estudio' (my-permissions payload, agent-repo pair PR) with
      // an ABSENT-module = ALLOWED fallback (see agent-module-access.ts) so
      // either repo can merge first; backend still scopes by membership and
      // decisions are audit-first per T-323.
      label: t('inmobiliaria.ai.nav.estudio'),
      href: '/panel/inmobiliaria/ai/estudio', scope: 'comercial',
      icon: ShieldCheck,
      module: 'estudio',
      ai: true,
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,
    {
      // Asegurabilidad va en COMERCIAL: es el paso previo a rentar — manda el
      // candidato a las aseguradoras y devuelve el máximo afianzable, que es
      // lo que define qué catálogo se le puede ofrecer.
      label: t('inmobiliaria.ai.nav.cotizador'),
      href: '/panel/inmobiliaria/ai/asegurabilidad', scope: 'comercial',
      icon: Umbrella,
      module: 'cotizador',
      ai: true,
      dataTourTarget: 'sidebar-cotizador',
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,
    // Acá hubo un rato una fila «Recorrido» encima de esta, y era la misma
    // lista con otro nombre: las postulaciones de la gente con su estado. Dos
    // filas para una cosa es el mismo defecto que tenían los dos «Documentos»
    // (`docs/VOCABULARIO.md`, regla madre). El recorrido **no es un destino**:
    // es el contexto de esta lista, y por eso vive dentro de ella —abierto
    // cuando no hay nada, plegado cuando hay trabajo—.
    {
      label: t('inmobiliaria.nav.postulaciones'),
      href: '/panel/inmobiliaria/postulaciones',
      scope: 'comercial',
      icon: ClipboardText,
      module: null,
      ai: true,
      // Paso 7 del recorrido: que se vea que hay alguien esperando SIN tener
      // que entrar. Sale de `stats.pending`, el mismo dato que después se ve
      // en la lista. Si no se pudo traer queda `undefined` y no se dibuja
      // nada — un cero afirmaría que no hay nadie, que es lo que no sabemos.
      badge: postulacionesPendientes,
    } as NavItemWithModule,
    {
      // F8: Matching complete workspace. Gated by the agent module 'matching'
      // with the same ABSENT-module = ALLOWED fallback as estudio (see
      // agent-module-access.ts); backend scopes by agency membership and
      // outreach happens only with approval.
      label: t('inmobiliaria.ai.nav.matching'),
      href: '/panel/inmobiliaria/ai/matching', scope: 'comercial',
      icon: GitMerge,
      module: 'matching',
      ai: true,
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,

    // ── ADMINISTRACIÓN ──  Sostener el contrato vivo y atender al cliente.
    { kind: 'section', label: t('inmobiliaria.nav.secAdministracion'), href: '#sec-administracion', scope: 'administracion', icon: FilePlus, module: null },
    // 'contratos' is its own AGENCY_MODULES key (all roles have contratos:['view']);
    // gating it on 'portafolio' wrongly hid it from CONTADOR (portafolio: []).
    { label: t('inmobiliaria.nav.contratos'),    href: '/panel/inmobiliaria/contratos', scope: 'administracion',    icon: FilePlus,      module: 'contratos' },
    { label: t('inmobiliaria.nav.renovaciones'), href: '/panel/inmobiliaria/renovaciones', scope: 'administracion', icon: ArrowsClockwise, module: 'operaciones' },
    { label: t('inmobiliaria.nav.propietarios'), href: '/panel/inmobiliaria/propietarios', scope: 'administracion', icon: UserCircle,    module: 'propietarios' },
    { label: t('inmobiliaria.nav.operaciones'),  href: '/panel/inmobiliaria/operaciones', scope: 'administracion',  icon: Wrench,        module: 'operaciones', ai: true },
    { label: t('inmobiliaria.nav.solicitudes'),  href: '/panel/inmobiliaria/pqrs', scope: 'administracion',         icon: Lifebuoy,      module: null, hint: t('inmobiliaria.nav.pqrs'), ai: true },
    // Sin `badge`: el 5 estaba escrito a mano, no contaba nada.
    { label: t('inmobiliaria.nav.mensajes'),     href: '/panel/inmobiliaria/mensajes', scope: 'administracion',     icon: Chat,          module: null },
    { label: t('inmobiliaria.nav.agenda'),       href: '/panel/inmobiliaria/agenda', scope: 'administracion',       icon: CalendarBlank, module: null },
    // "Soportes de candidatos", no "Documentos · revisión": había DOS filas
    // llamadas Documentos —esta y la del archivo en General—, distinguidas solo
    // por la nota al pie. Son dominios distintos y la regla madre de
    // docs/VOCABULARIO.md pide renombrar uno. Se renombra esta, que es la que
    // tiene identidad propia: la cola de papeles de una persona.
    { label: t('inmobiliaria.nav.soportes'),     href: '/panel/inmobiliaria/documentos/revision', scope: 'administracion', icon: ListChecks, module: 'documentos', ai: true },

    // ── FINANZAS ──  Cobrar, conciliar, dispersar y facturar.
    { kind: 'section', label: t('inmobiliaria.nav.secFinanzas'), href: '#sec-finanzas', scope: 'finanzas', icon: Wallet, module: null },
    {
      label: t('inmobiliaria.ai.nav.cobranza'),
      href: '/panel/inmobiliaria/ai/cobranza', scope: 'finanzas',
      icon: ChatCircleText,
      module: 'cobranza',
      ai: true,
      // SIN «Próximamente»: el módulo está entero y conectado — 12 pestañas
      // contra 33 endpoints del agente que responden con datos reales
      // (QA 2026-08-10). El cartel estaba escrito a mano y sobrevivió al
      // cableado; decía que no existe algo que la inmobiliaria ya paga.
      dataTourTarget: 'sidebar-cobranza',
      // Las funciones del agente (Casos/Pendientes/Inbox/Pagos/Cartas/…) ya NO
      // viven aquí: se renderizan como tabs DENTRO del workspace (WorkspaceNav),
      // alimentadas por src/lib/nav/agentWorkspaceNav.ts. El sidebar muestra el
      // agente como un único ítem para no abrumar.
    } as NavItemWithModule,
    { label: t('inmobiliaria.nav.cobros'),       href: '/panel/inmobiliaria/cobros', scope: 'finanzas',       icon: HandCoins,     module: 'cobros' },
    // Toda la cartera por edad de la deuda. `cobros` muestra el mes corriente;
    // esto es lo acumulado, que es lo que trae una inmobiliaria que se pasa.
    { label: t('inmobiliaria.nav.cartera'),      href: '/panel/inmobiliaria/cartera', scope: 'finanzas',      icon: CurrencyCircleDollar, module: 'cobros' },
    {
      // F6: Conciliación is the first complete agent workspace — the parent
      // now points at the Sala (/ai/conciliacion); the legacy /conciliacion
      // movimientos page stays reachable from the Sala's domain slot.
      label: t('inmobiliaria.nav.conciliacion'),
      href: '/panel/inmobiliaria/ai/conciliacion', scope: 'finanzas',
      icon: Bank,
      module: null,
      roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR],
      ai: true,
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,
    {
      // F9: Pagos (AP) complete workspace — the parent now points at the Sala
      // (/ai/pagos); the deep AP/dispersiones ops stay in Tesorería and are
      // cross-linked from the Sala's domain slot. The ADMIN|CONTADOR role gate
      // from F4 is PRESERVED on the parent and both children.
      label: t('inmobiliaria.ai.nav.pagos'),
      href: '/panel/inmobiliaria/ai/pagos', scope: 'finanzas',
      icon: CurrencyDollar,
      module: null,
      roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR],
      ai: true,
      // Funciones como tabs dentro del workspace (WorkspaceNav / agentWorkspaceNav.ts).
    } as NavItemWithModule,
    { label: t('inmobiliaria.nav.dispersiones'), href: '/panel/inmobiliaria/dispersiones', scope: 'finanzas', icon: PaperPlaneTilt, module: 'dispersiones', hint: t('inmobiliaria.nav.hintEgresos') },
    { label: t('inmobiliaria.nav.tesoreria'),    href: '/panel/inmobiliaria/tesoreria', scope: 'finanzas',    icon: Wallet,         module: null, roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR] },
    { label: t('inmobiliaria.nav.facturacion'),  href: '/panel/inmobiliaria/facturacion', scope: 'finanzas',  icon: Receipt,        module: null, roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR] },
    // Contabilidad general: pedida en la definición del módulo financiero, sin
    // pantalla todavía. Se lista deshabilitada para que el módulo se lea
    // completo y nadie la dé por perdida — `disabled` la vuelve no navegable.
    { label: t('inmobiliaria.nav.contabilidad'), href: '#', scope: 'finanzas', icon: Calculator, module: null, disabled: true, tag: t('inmobiliaria.nav.proximamente'), roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR] },

    // ── GENERAL ──  Transversal a los tres módulos.
    { kind: 'section', label: t('inmobiliaria.nav.secGeneral'), href: '#sec-general', scope: 'general', icon: ChartLine, module: null },
    // Resumen del negocio: el antiguo "Dashboard" (sin su parte de agentes IA).
    // Gated por el módulo 'dashboard' que lo gobierna (todos los roles lo tienen
    // ⇒ visible tras cargar permisos; oculto durante la carga — fail-closed).
    { label: t('inmobiliaria.nav.dashboard'),    href: '/panel/inmobiliaria/dashboard', scope: 'general',    icon: SquaresFour,   exact: true, module: 'dashboard' },
    { label: t('inmobiliaria.nav.reportes'),     href: '/panel/inmobiliaria/reportes', scope: 'general',     icon: ChartLine,     module: 'reportes' },
    { label: t('inmobiliaria.nav.analitica'),    href: '/panel/inmobiliaria/analytics', scope: 'general',    icon: ChartLineUp,   module: 'analytics' },
    { label: t('inmobiliaria.nav.equipo'),       href: '/panel/inmobiliaria/agentes', scope: 'general',      icon: Users,         module: 'agentes' },
    { label: t('inmobiliaria.nav.documentos'),   href: '/panel/inmobiliaria/documentos', scope: 'general',   icon: FileText,      module: 'documentos', exact: true },
    {
      // F3: Aprendizaje del asistente — certification fence for the AI chat's
      // self-learning lessons. Visible to every agency member (read-only for
      // VIEWER/CONTADOR; certify/discard actions inside the page are gated to
      // OPERATOR+).
      label: t('inmobiliaria.nav.aprendizaje'),
      href: '/panel/inmobiliaria/ai/aprendizaje', scope: 'general',
      icon: Brain,
      module: null,
      ai: true,
    } as NavItemWithModule,
    // Configuración → gated on 'configuracion': only ADMIN has it in the matrix
    // (AGENTE/CONTADOR/VIEWER all have configuracion:[]) ⇒ effectively admin-only.
    { label: t('inmobiliaria.nav.configuracion'), href: '/panel/inmobiliaria/configuracion', scope: 'general', icon: Gear,         module: 'configuracion', dataTourTarget: 'sidebar-configuraciones' },
  ], [t, postulacionesPendientes]);

  const INMOBILIARIA_NAV_ITEMS: NavItem[] = useMemo(() => {
    // Filter by permission/role via the shared, unit-tested helper. While
    // permissions load, canAccess() returns false for every gated module (and
    // isAdmin/agencyRole are null), so only ungated items survive — gated tabs
    // never flash in then disappear. The desktop sidebar shows a skeleton during
    // this window instead (PlanSidebar `loading` prop below).
    return filterAgencyNav(ALL_NAV_ITEMS, {
      canAccess,
      isAdmin,
      agencyRole,
      // Sin respuesta del agente, sus módulos NO se borran del menú: se llega a
      // la pantalla, que dice «No pudimos verificar tu acceso» y ofrece
      // reintentar. Borrarlos se lee como «esto no existe».
      agentUnverified: agentAccessStatus === 'sin-verificar',
    });
  }, [ALL_NAV_ITEMS, agencyRole, canAccess, isAdmin, agentAccessStatus]);

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
          title: agencyName,
          href: '/panel/inmobiliaria',
        }}
        // cadence §Navigation: static brand row + search-opens-⌘K + footer cards
        workspaceName={agencyName}
        workspaceLogoUrl={agencyLogoUrl}
        brandPrimaryHsl={brandPrimaryHsl}
        onSearchClick={openCommandPalette}
        searchPlaceholder="Buscar"
        // Punto de partida del panel: con 156 rutas agrupadas por módulo de
        // negocio, quien entra por primera vez no tiene dónde empezar.
        belowSearch={<BotonNuevo />}
        showInvite
        onInvite={() => router.push('/panel/inmobiliaria/agentes')}
        showUpgrade={showUpgradeCta}
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
  // allowAgencyMembers: dual-context users (personal role + ACTIVE agency
  // membership) are admitted alongside pure-agency users.
  return (
    <ProtectedRoute allowedRoles={['agency']} allowAgencyMembers>
      <AgencySubscriptionGuard>
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
      </AgencySubscriptionGuard>
    </ProtectedRoute>
  );
}
