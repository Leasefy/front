'use client';

import { useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChatsCircle, AirTrafficControl } from '@phosphor-icons/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AgencySubscriptionGuard } from '@/components/auth/AgencySubscriptionGuard';
import { PlanSidebar, NavItem } from '@/components/ui/plan/PlanSidebar';
import { filterAgencyNav, type NavItemWithModule } from '@/lib/nav/agency-nav-filter';
import { filasDelSidebar } from '@/lib/nav/sidebar-del-panel';
import { SeccionesDelModulo } from '@/components/inmobiliaria/SeccionesDelModulo';
import { CabeceraDelAgente } from '@/components/inmobiliaria/ai/CabeceraDelAgente';
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
import { PilotoModoHeader } from '@/components/inmobiliaria/piloto/PilotoModoHeader';
import { TourDelPanel } from '@/components/tour/TourDelPanel';
import { PilotoDock } from '@/components/inmobiliaria/piloto/PilotoDock';
import { PilotoDockProvider } from '@/lib/hooks/piloto/piloto-dock-context'
import { PilotoFlotaProvider } from '@/lib/hooks/piloto/piloto-flota-context';
import { useAgencySubscription } from '@/lib/hooks/useAgencySubscription';
import { usePostulacionesPendientes } from '@/lib/hooks/use-postulaciones-pendientes';
import { MuroDeMigracion } from '@/components/migracion/MuroDeMigracion';
import { useMigracionesPendientes } from '@/lib/hooks/use-migraciones-pendientes';
import { usePilotoBadge } from '@/lib/hooks/piloto/use-piloto-badge';
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

  // All nav items with their corresponding permission module (null = always visible).
  // `NavItemWithModule` (imported) extends NavItem with an optional `module`
  // permission gate, an optional `roles` role gate, and `adminOnly`.
  // Paso 7: cuánta gente está esperando gestión, con dato real.
  const { pendientes: postulacionesPendientes } = usePostulacionesPendientes();
  // T-0031 WU-4: el "Retomar" del importador era page-local (N10) — sólo se
  // veía si ya se había entrado a /contratos/migrar. Este badge lo hace
  // visible siempre, en la nav.
  const { pendientes: migracionesPendientes } = useMigracionesPendientes();
  // Piloto automático: total de la bandeja (poll 60s; fail-soft a undefined ⇒
  // sin badge — un cero afirmaría que no hay nada, que es lo que no sabemos).
  const { total: pilotoPendientes } = usePilotoBadge();

  // El mismo contexto de gates para el sidebar, para resolver a qué pantalla
  // entra cada módulo y para filterAgencyNav.
  const ctxNav = useMemo(() => ({
    canAccess,
    isAdmin,
    agencyRole,
    // Sin respuesta del agente, sus módulos NO se borran del menú: se llega a
    // la pantalla, que dice «No pudimos verificar tu acceso» y ofrece
    // reintentar. Borrarlos se lee como «esto no existe».
    agentUnverified: agentAccessStatus === 'sin-verificar',
  }), [canAccess, isAdmin, agencyRole, agentAccessStatus]);

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
    // Sin encabezado de sección: la fila YA se llama «Inicio», y un rótulo
    // «INICIO» encima de una fila «Inicio» es un tartamudeo. Las dos filas de
    // arriba (Inicio · Chat) abren el grupo sin necesitar título.
    {
      // ── PILOTO AUTOMÁTICO ── la torre de control transversal de los agentes
      // (piloto-contratos-v1 §5). Va PRIMERO y es el destino de entrada al
      // panel (`getAgencyHomeRoute`): decisión de Nico el 2026-08-31 — «que
      // piloto automático siempre sea el inicio». Gate: como el hub /ai — sin
      // módulo (`module: null`), visible a todo miembro; cada widget de la
      // página se defiende solo (fail-soft por endpoint), que es lo que hace
      // seguro mandar ahí también a AGENTE/CONTADOR/VIEWER.
      // La fila se llama «Inicio» y no «Piloto» (Nico, 2026-08-31): es el
      // destino de entrada al panel, y quien abre el menú busca «dónde
      // empiezo», no el nombre del producto. El nombre propio —«Piloto
      // automático»— vive en el H1 de la sección, que es donde identifica.
      label: t('inmobiliaria.nav.piloto'),
      href: '/panel/inmobiliaria/piloto',
      icon: AirTrafficControl,
      module: null,
      // Sin píldora `ai`: el rótulo ya no nombra un agente, y «Inicio · IA»
      // se lee como si el inicio fuera un agente. El badge sí queda: dice
      // cuántas decisiones te esperan, que es información.
      badge: pilotoPendientes,
    } as NavItemWithModule,
    // AI CHAT HOME F3: la raíz del panel es el chat embebido. Se llamaba
    // «Inicio» y eso lo escondía: nadie busca un chat bajo ese nombre, y el
    // inicio ahora es el Piloto. Se llama por lo que es (Nico, 2026-08-31).
    // `exact` para que no quede resaltado en cada subruta.
    { label: t('inmobiliaria.nav.chat'),         href: '/panel/inmobiliaria',              icon: ChatsCircle,   exact: true, module: null },

    // ── LOS MÓDULOS ── por ciclo de vida del contrato.
    //
    // Captación y arriendo → Operación → Dinero → Directorio → (pie) Reportes y
    // Configuración. La estructura vive como DATOS en
    // src/lib/nav/arquitectura-del-panel.ts (grupos → módulos → pantallas) y
    // sidebar-del-panel.ts la vuelve filas: una por módulo, con la cabecera de
    // su grupo. Las pantallas de cada módulo (Cobranza, Cartera, Renovaciones,
    // Avalúos…) ya no son filas del sidebar: son las cards de SeccionesDelModulo,
    // y si son un agente traen adentro su propio WorkspaceNav. 38 filas → 21.
    //
    // Los gates NO cambian: cada fila conserva el module/roles/scope que tenía,
    // y si la raíz de un módulo no pasa pero una de sus pantallas sí, la fila
    // apunta a esa pantalla (nadie pierde una puerta que tenía). El detalle y
    // los guardianes están en arquitectura-del-panel.test.ts.
    ...filasDelSidebar(t, ctxNav, {
      // Paso 7 del recorrido: que se vea que hay alguien esperando SIN tener
      // que entrar. Sale de `stats.pending`; si no se pudo traer queda
      // `undefined` y no se dibuja nada — un cero afirmaría que no hay nadie.
      postulaciones: postulacionesPendientes,
      // T-0031 WU-4: contratos migrados con filas por completar. Sale de
      // `GET /contracts/migrar/lotes` — `undefined` si falla, nunca un cero.
      contratos: migracionesPendientes,
    }),
  ], [t, ctxNav, postulacionesPendientes, migracionesPendientes, pilotoPendientes]);

  const INMOBILIARIA_NAV_ITEMS: NavItem[] = useMemo(() => {
    // Filter by permission/role via the shared, unit-tested helper. While
    // permissions load, canAccess() returns false for every gated module (and
    // isAdmin/agencyRole are null), so only ungated items survive — gated tabs
    // never flash in then disappear. The desktop sidebar shows a skeleton during
    // this window instead (PlanSidebar `loading` prop below).
    return filterAgencyNav(ALL_NAV_ITEMS, ctxNav);
  }, [ALL_NAV_ITEMS, ctxNav]);

  return (
    <div className="min-h-screen bg-plan-page">
      {/*
        El muro de la puesta en marcha. Va acá adentro, envolviendo TODO el
        panel —sidebar, header, contenido y nav móvil—, para que cubra las
        156 rutas de una sola vez y ninguna quede por fuera por olvido.

        Cuando no bloquea (que es el caso normal, y también el caso de error)
        no dibuja nada y no le agrega una sola clase a lo de adentro.
      */}
      <MuroDeMigracion>
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
            // El lockup de Leasefy es la firma del PRODUCTO, no un atajo al
            // panel: el panel ya tiene su "Inicio" en el nav (misma ruta), así
            // que apuntar acá al panel duplicaba un destino y dejaba sin salida
            // al sitio público. El logo sale a la landing, como en cualquier
            // producto con web pública. Ruta relativa a propósito: el host
            // cambia entre dev (:3001) y producción.
            href: '/',
          }}
          // cadence §Navigation: static brand row + search-opens-⌘K + footer cards
          workspaceName={agencyName}
          workspaceLogoUrl={agencyLogoUrl}
          onSearchClick={openCommandPalette}
          searchPlaceholder="Buscar"
          // Punto de partida del panel: con 156 rutas agrupadas por módulo de
          // negocio, quien entra por primera vez no tiene dónde empezar.
          belowSearch={<BotonNuevo />}
          showInvite
          onInvite={() => router.push('/panel/inmobiliaria/configuracion/equipo')}
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
          {/* La píldora del Piloto («Piloto · Copiloto») va en `actions`, a la
              izquierda de la campana: en cada pantalla se ve en qué modo está
              la flota y se cambia con un clic (Nico, 2026-09-02). */}
          <PlanHeader
            showMagnifyingGlass={false}
            leftSlot={<AgentHeaderBreadcrumb />}
            actions={<PilotoModoHeader />}
          />
          {/* Las dos capas de navegación debajo del header, montadas UNA vez y
              auto-ocultas fuera de su contexto, cada una con su cara:
              SeccionesDelModulo (las secciones del módulo como cards:
              [Cobros] [Recaudo] [Cartera] [Cobranza]) y, DEBAJO, dentro de un
              agente, su WorkspaceNav (pestañas) + la novedad de primera visita.
              Las secciones no se esconden al entrar en el agente: la card
              sigue marcada y sus pestañas cuelgan de ella. */}
          <main id="main-content" tabIndex={-1}>
            <SeccionesDelModulo />
            <CabeceraDelAgente />
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation — hidden at lg+ (where the sidebar appears) */}
        <MobileNavBar navItems={INMOBILIARIA_NAV_ITEMS} />

        {/* El tray de procesos del Piloto, abajo a la derecha, en cualquier
            pantalla (Nico, 2026-09-02). Comparte la lectura de la flota con
            la píldora del header vía el provider de arriba. */}
        <PilotoDock />

        {/* El recorrido guiado de 3 pasos. Se monta acá —no en una pantalla—
            porque señala el sidebar y el header, que viven en este layout.
            No pinta nada salvo que la preferencia esté encendida. */}
        <TourDelPanel />
      </MuroDeMigracion>

      {/* El <Toaster> es único y vive en el layout raíz (src/app/layout.tsx), fuera de
          <ProtectedRoute>/<AgencySubscriptionGuard>: acá adentro se perdía todo toast
          emitido mientras los guards resuelven. No montés otro: sonner duplica el toast
          por cada Toaster montado. */}
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
                  <PilotoDockProvider>
      <PilotoFlotaProvider>
                    <InmobiliariaLayoutInner>{children}</InmobiliariaLayoutInner>
                  </PilotoFlotaProvider>
    </PilotoDockProvider>
                </CommandPaletteProvider>
              </SidebarProvider>
            </PanelPrefsProvider>
          </PermissionsProvider>
        </I18nProvider>
      </AgencySubscriptionGuard>
    </ProtectedRoute>
  );
}
