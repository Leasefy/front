'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Icon } from '@phosphor-icons/react';
import { CaretLeft, CaretRight, CaretDown, SignOut, Question, TrendUp, CheckCircle, Circle, ArrowUpRight, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { LeasefyLogo, LeasefySymbol, LeasefyLogotype } from '@/components/brand';
import { SidebarThemeToggle } from './SidebarThemeToggle';
import { useAuth } from '@/lib/auth';
import { useSidebar } from '@/lib/context/SidebarContext';
import { hrefDeLaFilaActiva } from '@/lib/nav/fila-activa-del-menu';
import {
  agruparEnSecciones,
  almacenLocal,
  estaAbierta,
  guardarSecciones,
  leerSecciones,
  llaveDeAlmacenamiento,
  resumenDeSeccion,
  type BloqueDelMenu,
  type EstadoDeSecciones,
} from '@/lib/nav/secciones-del-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
// Real Cadence Sidebar building blocks. The collapse/expand rail, nested-group
// disclosure, disabled rows, `tag` pills and the collapse-aware brand are
// composed AROUND these (the primitive does not model them — see ## Gaps in
// CADENCE-COMPONENTS.md). Expanded leaf rows + group labels ARE the real
// components so they inherit the DS hover/active/focus states.
import {
  SidebarItem,
  SidebarSearch,
  SidebarInviteCard,
  SidebarUpgradeButton,
} from '@leasefy/cadence';

// ─────────────────────────────────────────────────────────────────────────────
// Mobile sidebar opener — module-level pub-sub.
//
// The mobile menu trigger lives in PlanHeader (so it sits inline in the top
// bar instead of floating over it), but the Sheet + nav data live here.
// Every layout renders PlanSidebar + PlanHeader as siblings, so a tiny
// pub-sub avoids threading open-state through each layout. No-op when no
// PlanSidebar is mounted.
// ─────────────────────────────────────────────────────────────────────────────
type MobileSidebarListener = () => void;
const mobileSidebarListeners = new Set<MobileSidebarListener>();

/** Opens the PlanSidebar mobile navigation Sheet (called from PlanHeader). */
const INVITE_DISMISSED_KEY = 'leasefy-sidebar-invite-dismissed';

export function openPlanMobileSidebar() {
  mobileSidebarListeners.forEach((listener) => listener());
}

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
  exact?: boolean;
  disabled?: boolean;
  badge?: number;
  children?: NavItem[];
  /** When 'section', renders a non-interactive group label (desktop sidebar only). Additive — flat navs ignore it. */
  kind?: 'section';
  /** Small pill shown after the label (e.g. "Pronto" for not-yet-built sections). Additive. */
  tag?: string;
  /**
   * Qualifier appended to the label as `Etiqueta · pista`. Disambiguates rows
   * that share a noun ("Documentos" vs "Documentos · revisión") without
   * inflating the label. Additive — items without it render unchanged.
   */
  hint?: string;
  /**
   * Marks the row as backed by an AI agent → renders the "IA" pill. A flag
   * rather than another free-text `tag` so every agent row reads identically,
   * and so a row can carry BOTH pills (Cobranza = IA + Próximamente).
   */
  ai?: boolean;
  /** data-tour-target attribute for Phase 38 PanelTour primitive. Additive — items without it render unchanged. */
  dataTourTarget?: string;
  /**
   * La fila no pertenece a la sección de arriba aunque venga después de ella
   * (el «pie» del panel, sin cabecera). Ver `secciones-del-menu.ts`.
   */
  suelta?: boolean;
}

/** Label as rendered: `Etiqueta · pista` when a hint is present. */
function displayLabel(item: NavItem): string {
  return item.hint ? `${item.label} · ${item.hint}` : item.label;
}

/**
 * Right-aligned pills for a row: the "IA" marker and/or the free-text `tag`
 * ("Próximamente"). Returns undefined when the row carries neither, so
 * SidebarItem keeps rendering its numeric `count` untouched.
 */
function TrailingPills({ item }: { item: NavItem }) {
  if (!item.ai && !item.tag) return null;
  return (
    <span className="flex items-center gap-1.5">
      {item.ai && (
        <span className="text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary-soft text-primary">
          IA
        </span>
      )}
      {item.tag && (
        <span className="text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-warning-soft text-warning">
          {item.tag}
        </span>
      )}
    </span>
  );
}

export interface ProfileCompletionStep {
  id: number;
  labelEs: string;
  labelEn: string;
  completed: boolean;
}

export interface ProfileCompletionConfig {
  percentage: number;
  href: string;
  label?: string;
  completedCount?: number;
  totalSteps?: number;
  steps?: ProfileCompletionStep[];
  locale?: 'es' | 'en';
}

export interface PlanSidebarProps {
  navItems: NavItem[];
  logo?: {
    title: string;
    href: string;
  };
  className?: string;
  defaultCollapsed?: boolean;
  showUpgrade?: boolean;
  upgradeHref?: string;
  upgradeLabel?: string;
  profileCompletion?: ProfileCompletionConfig;
  /** Optional element rendered between the logo and the nav (e.g. ⌘K trigger).
   *  Used as the search-slot fallback when `onSearchClick` is not provided. */
  aboveNav?: React.ReactNode;
  /** When true, the nav list is replaced by a skeleton placeholder (e.g. while
   *  permissions load) so permission-gated items never flash in then disappear. */
  loading?: boolean;
  // ── cadence §Navigation composition (workspace switcher + search + footer) ──
  /** Opens the command palette when the cadence SidebarSearch is clicked. When
   *  set, SidebarSearch replaces the `aboveNav` slot. */
  onSearchClick?: () => void;
  /** Slot right under the search box — the panel's starting point (the agency
   *  passes its «Nuevo» launcher here). Hidden while collapsed, like search. */
  belowSearch?: React.ReactNode;
  /** Placeholder for the cadence SidebarSearch field. */
  searchPlaceholder?: string;
  /** Workspace name shown in the static header brand row (defaults to `logo.title`). */
  workspaceName?: string;
  /** Optional workspace logo URL. When a non-empty string, it replaces the
   *  LeasefyMark brand tile in both the expanded brand row and the collapsed rail. */
  workspaceLogoUrl?: string;
  /** Show the "Invita a tu equipo" footer card (cadence §Navigation). */
  showInvite?: boolean;
  /** Handler for the invite-card button. */
  onInvite?: () => void;
  /**
   * Tarjetas del pie, ANTES de la de invitar: el recordatorio de migración
   * (Nico, 2026-09-07). Un slot y no props sueltas: la tarjeta sabe sola qué
   * decir (lee el estado de la migración del contexto del panel).
   */
  footerCards?: React.ReactNode;
}

interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
  depth?: number;
  /**
   * La fila cuelga de una sección plegable: la fila activa enciende su tramo
   * de la guía vertical de la sección (la raya de la izquierda), para que se
   * lea «estás acá, dentro de esto».
   */
  enSeccion?: boolean;
}

function NavItemComponent({ item, isActive, isCollapsed, onClick, depth = 0, enSeccion = false }: NavItemComponentProps) {
  const Icon = item.icon;
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const pathname = usePathname();

  const checkChildActive = (children: NavItem[]) => {
    return children.some(child => {
      if (child.exact) return pathname === child.href;
      return pathname === child.href || pathname.startsWith(`${child.href}/`);
    });
  };

  const isChildActive = hasChildren && checkChildActive(item.children!);

  if (item.disabled) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2 text-[13px]',
          'text-muted-foreground/70 cursor-not-allowed',
          isCollapsed && 'justify-center px-2'
        )}
        title={isCollapsed ? `${displayLabel(item)}${item.tag ? ` — ${item.tag}` : ''}` : undefined}
      >
        <Icon className="w-[18px] h-[18px] stroke-[1.5px]" />
        {!isCollapsed && <span className="flex-1">{displayLabel(item)}</span>}
        {!isCollapsed && (
          <span className="ml-auto">
            <TrailingPills item={item} />
          </span>
        )}
      </div>
    );
  }

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          data-tour-target={item.dataTourTarget}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2 text-[13px]',
            'transition-colors duration-100',
            (isActive || isChildActive)
              ? 'text-primary font-medium'
              : 'text-plan-secondary hover:text-plan-primary',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <Icon
            weight={(isActive || isChildActive) ? 'duotone' : 'regular'}
            className={cn(
              'w-[18px] h-[18px] stroke-[1.5px]',
              (isActive || isChildActive) ? 'text-primary' : 'text-plan-muted'
            )}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <CaretDown
                className={cn(
                  'w-4 h-4 text-plan-muted transition-transform duration-150',
                  isExpanded && 'rotate-180'
                )}
              />
            </>
          )}
        </button>
        {!isCollapsed && isExpanded && (
          <div className="ml-6 border-l border-plan-border">
            {item.children!.map((child) => (
              <NavItemComponent
                key={child.href}
                item={child}
                isActive={child.exact ? pathname === child.href : pathname === child.href || pathname.startsWith(`${child.href}/`)}
                isCollapsed={false}
                onClick={onClick}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Collapsed icon-rail row: SidebarItem has no icon-only/collapsed mode, so the
  // rail row stays composed (see ## Gaps). title + data-tour-target preserved.
  if (isCollapsed) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        data-tour-target={item.dataTourTarget}
        title={`${displayLabel(item)}${item.ai ? ' — IA' : ''}${item.tag ? ` — ${item.tag}` : ''}`}
        className={cn(
          'flex items-center justify-center px-2.5 py-2.5 rounded-full transition-colors',
          isActive
            ? 'text-primary bg-primary-soft'
            : 'text-fg-muted hover:text-fg hover:bg-surface-muted'
        )}
      >
        <Icon
          weight={isActive ? 'duotone' : 'regular'}
          className={cn('w-[18px] h-[18px]', isActive ? 'text-primary' : 'text-fg-muted')}
        />
      </Link>
    );
  }

  // Expanded leaf row — the REAL Cadence SidebarItem (owns hover/active/focus).
  // legacyBehavior + passHref bridges Next client routing onto the DS anchor.
  // SidebarItemProps (HTMLAttributes) can't type data-*, so the PanelTour hook
  // rides on a minimal wrapper only when present.
  const row = (
    <Link href={item.href} legacyBehavior passHref>
      <SidebarItem
        icon={<Icon weight={isActive ? 'duotone' : 'regular'} className={cn('w-[18px] h-[18px]', isActive && '!text-primary')} />}
        label={displayLabel(item)}
        active={isActive}
        count={item.badge !== undefined && item.badge > 0 ? item.badge : undefined}
        // `badge` takes a node and renders it as-is (see SidebarItemProps), so
        // the IA / Próximamente pills ride here without forking the DS row.
        badge={item.ai || item.tag ? <TrailingPills item={item} /> : undefined}
        depth={depth}
        onClick={onClick}
        className={
          enSeccion
            ? // El tramo encendido cae exactamente sobre la guía de la sección
              // (`GUIA_DE_SECCION`: 1 px de borde + 3 px de aire → centro a −3,5 px).
              "data-[active]:before:absolute data-[active]:before:-left-[4.5px] data-[active]:before:top-1.5 data-[active]:before:bottom-1.5 data-[active]:before:w-[2px] data-[active]:before:rounded-full data-[active]:before:bg-primary data-[active]:before:content-['']"
            : undefined
        }
        // SidebarItem fija su padding con `style` y esparce los props DESPUÉS,
        // así que este `style` gana: dentro de una sección el aire es de 8/6 px.
        style={enSeccion ? { paddingLeft: 8, paddingRight: 6 } : undefined}
        title={enSeccion ? displayLabel(item) : undefined}
      />
    </Link>
  );

  return item.dataTourTarget ? <div data-tour-target={item.dataTourTarget}>{row}</div> : row;
}

/**
 * Placeholder shown while permissions load. Mirrors the real nav's rhythm
 * (a group label + a few item rows) so the sidebar holds its shape and gated
 * items never flash in then disappear. Widths are fixed so the SSR markup and
 * the hydrated client markup match exactly (no hydration mismatch).
 */
function NavSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  const groups: number[][] = [[68, 52], [60, 74, 48, 56], [64, 50, 70]];
  return (
    <div className="space-y-3" aria-hidden="true" data-testid="sidebar-nav-skeleton">
      {groups.map((rows, gi) => (
        <div key={gi} className="space-y-1.5">
          {!isCollapsed && (
            <div className="ml-4 h-2 w-16 rounded bg-surface-muted animate-pulse" />
          )}
          {rows.map((w, ri) => (
            <div
              key={ri}
              className={cn(
                'flex items-center gap-3 py-2',
                isCollapsed ? 'justify-center px-2' : 'px-3'
              )}
            >
              <div className="h-[18px] w-[18px] flex-shrink-0 rounded-lg bg-surface-muted animate-pulse" />
              {!isCollapsed && (
                <div
                  className="h-3 rounded bg-surface-muted animate-pulse"
                  style={{ width: `${w}%` }}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Secciones plegables (Nico, 2026-09-22: «no se distingue muy bien entre la
// sección y las opciones; deberíamos volverlas secciones con dropdown porque
// tenemos mucha información»).
//
// Antes la cabecera era el `SidebarSection` de Cadence: mono, 11 px, MAYÚSCULAS,
// en `text-fg-subtle` (#726E68) — y las filas iban en `text-fg-muted`
// (#6E6A63). Mismo gris con 2 puntos de diferencia: la jerarquía la cargaba
// sólo el tamaño. Ahora la cabecera es un CONTROL:
//   · tinta plena (`text-fg`) y semibold, contra filas en gris con ícono;
//   · en sentence case, porque en Cadence los controles van así (los eyebrows
//     mono en mayúsculas son rótulos, y esto ya no es un rótulo: se aprieta);
//   · un chevron que gira, y un fondo al pasar el mouse — forma de botón;
//   · las filas cuelgan de una guía vertical (la raya de la izquierda) y la
//     fila activa enciende su tramo.
// Plegada, la cabecera sigue diciendo lo que adentro importa: la suma de los
// contadores y, si la página actual vive ahí, la cabecera va en el azul.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sangría + guía. La raya cae a 11 px, justo donde empieza el texto de la
 * cabecera (10 px): se lee como «esto cuelga de eso». La sangría es corta a
 * propósito —la fila recorta su propio aire de 10 a 8 px a la izquierda y a
 * 6 a la derecha— porque cada píxel sale del ancho de la etiqueta: con 15 px
 * de sangría «Solicitudes · PQRS» + la píldora IA se cortaba en «PQ…»
 * (captura del 22-09). Ningún nombre se corta al ancho normal de 240 px.
 */
const GUIA_DE_SECCION = 'ml-[11px] border-l border-border pl-[3px]';

interface SeccionPlegableProps {
  bloque: Extract<BloqueDelMenu<NavItem>, { tipo: 'seccion' }>;
  abierta: boolean;
  contieneLaActiva: boolean;
  onAlternar: () => void;
  isActive: (item: NavItem) => boolean;
  onItemClick?: () => void;
}

function SeccionPlegable({ bloque, abierta, contieneLaActiva, onAlternar, isActive, onItemClick }: SeccionPlegableProps) {
  const idFilas = `menu-seccion-${bloque.clave}`;
  const { pendientes } = resumenDeSeccion(bloque.filas);
  // Plegada, la sección no puede tragarse lo que las filas avisaban.
  const mostrarResumen = !abierta;
  const marcada = contieneLaActiva && !abierta;

  return (
    <div data-seccion={bloque.clave} className="pt-1">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierta}
        aria-controls={idFilas}
        className={cn(
          'group/seccion flex w-full items-center gap-2 rounded-[12px] px-[10px] py-[7px] text-left',
          'transition-colors duration-150 hover:bg-surface-muted',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'active:scale-[0.99] motion-reduce:active:scale-100',
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.01em]',
            marcada ? 'text-primary' : 'text-fg',
          )}
        >
          {bloque.cabecera.label}
          {marcada && <span className="sr-only"> (contiene la página actual)</span>}
        </span>

        {/* Sin marca de «IA» en el resumen, a propósito (22-09, medido en la
            vitrina): un punto azul se confundía con la cabecera azul de «estás
            acá», y la píldora «IA» + el contador cortaban «Captación y
            arriendo» en «Captación y arrie…». El contador es lo que no se
            puede perder al plegar; la IA se ve al abrir. */}
        {mostrarResumen && pendientes > 0 && (
          <span
            data-testid="resumen-de-seccion"
            className="rounded-full bg-surface-muted px-1.5 py-px font-mono text-[11px] font-medium tabular-nums text-fg-muted group-hover/seccion:bg-surface"
          >
            {pendientes}
            <span className="sr-only"> pendientes</span>
          </span>
        )}

        <CaretDown
          aria-hidden="true"
          weight="bold"
          className={cn(
            'h-3 w-3 shrink-0 text-fg-subtle transition-transform duration-200 ease-out group-hover/seccion:text-fg',
            'motion-reduce:transition-none',
            !abierta && '-rotate-90',
          )}
        />
      </button>

      {/* La altura se anima con `grid-template-rows` 0fr↔1fr: no hay que
          medir nada y funciona con cualquier cantidad de filas. Cerrada, la
          caja es `inert`: sus enlaces salen del orden del Tab y del árbol de
          accesibilidad (prop booleana desde React 19; el string vacío de
          React 18 ahí se lee como falso — ver MuroDeMigracion). */}
      <div
        id={idFilas}
        data-abierta={abierta ? 'true' : 'false'}
        className="grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: abierta ? '1fr' : '0fr', opacity: abierta ? 1 : 0 }}
        inert={!abierta}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={cn(GUIA_DE_SECCION, 'mb-1 mt-0.5 space-y-0.5')}>
            {bloque.filas.map((item) => (
              <NavItemComponent
                key={item.href}
                item={item}
                isActive={isActive(item)}
                isCollapsed={false}
                onClick={onItemClick}
                enSeccion
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * El riel plegado (64 px, sólo íconos) NO pliega secciones: un acordeón sin
 * rótulo visible es un botón que no se sabe qué abre. Cada sección es un
 * grupo de íconos con su nombre para el lector de pantalla, separado del
 * anterior por una raya; cada ícono lleva su `title`.
 */
function GrupoDelRiel({
  bloque,
  isActive,
  onItemClick,
  primero,
}: {
  bloque: BloqueDelMenu<NavItem>;
  isActive: (item: NavItem) => boolean;
  onItemClick?: () => void;
  primero: boolean;
}) {
  const etiqueta = bloque.tipo === 'seccion' ? bloque.cabecera.label : undefined;
  return (
    <div role={etiqueta ? 'group' : undefined} aria-label={etiqueta} className="space-y-0.5">
      {!primero && <div className="mx-2 my-2 border-t border-border" aria-hidden="true" />}
      {bloque.filas.map((item) => (
        <NavItemComponent key={item.href} item={item} isActive={isActive(item)} isCollapsed onClick={onItemClick} />
      ))}
    </div>
  );
}

/**
 * Qué secciones están abiertas, recordado por persona en el navegador.
 *
 * Se lee en un efecto y no en el inicializador: el servidor pinta todo
 * abierto (no tiene el almacenamiento) y el primer render del cliente tiene
 * que coincidir, o React avisa de un mismatch.
 *
 * La sección de la página actual se abre sola cada vez que se navega a otra
 * sección — y queda así guardada. Si después la persona la cierra, se respeta
 * hasta la próxima navegación: abrirla a la fuerza en cada render sería un
 * botón que no obedece.
 */
function useSeccionesAbiertas(usuarioId: string | null | undefined, claveActiva: string | null) {
  const llave = llaveDeAlmacenamiento(usuarioId);
  const [estado, setEstado] = useState<EstadoDeSecciones>({});

  useEffect(() => {
    setEstado(leerSecciones(llave, almacenLocal()));
  }, [llave]);

  // Va DESPUÉS del de lectura a propósito: los dos actualizadores se encolan
  // en orden, así que éste ve lo leído y no el `{}` del primer render.
  useEffect(() => {
    if (!claveActiva) return;
    setEstado((prev) => {
      if (estaAbierta(prev, claveActiva)) return prev;
      const siguiente = { ...prev, [claveActiva]: true };
      guardarSecciones(llave, siguiente, almacenLocal());
      return siguiente;
    });
  }, [claveActiva, llave]);

  const alternar = (clave: string) => {
    setEstado((prev) => {
      const siguiente = { ...prev, [clave]: !estaAbierta(prev, clave) };
      guardarSecciones(llave, siguiente, almacenLocal());
      return siguiente;
    });
  };

  return { estado, alternar };
}

interface SidebarContentProps {
  navItems: NavItem[];
  logo?: PlanSidebarProps['logo'];
  isCollapsed: boolean;
  onCollapse: () => void;
  onItemClick?: () => void;
  showUpgrade?: boolean;
  upgradeHref?: string;
  upgradeLabel?: string;
  showCollapseButton?: boolean;
  profileCompletion?: ProfileCompletionConfig;
  aboveNav?: React.ReactNode;
  belowSearch?: React.ReactNode;
  loading?: boolean;
  onSearchClick?: () => void;
  searchPlaceholder?: string;
  workspaceName?: string;
  workspaceLogoUrl?: string;
  showInvite?: boolean;
  onInvite?: () => void;
  footerCards?: React.ReactNode;
  /**
   * Sólo para la vitrina (`/sidebar-preview`): pinta el menú como si la
   * página actual fuera ésta. En el panel no se pasa y manda la URL real.
   */
  rutaActual?: string;
}

/**
 * Exportado para la vitrina `/sidebar-preview`, que muestra las variantes
 * (secciones abiertas/cerradas, riel, paneles con una o ninguna sección) con
 * el componente REAL y no con una copia que se desactualiza.
 */
export function SidebarContent({
  navItems,
  logo,
  isCollapsed,
  onCollapse,
  onItemClick,
  showCollapseButton = true,
  showUpgrade = false,
  upgradeHref,
  upgradeLabel,
  profileCompletion,
  aboveNav,
  belowSearch,
  loading = false,
  onSearchClick,
  searchPlaceholder,
  workspaceName,
  workspaceLogoUrl,
  showInvite = false,
  onInvite,
  footerCards,
  rutaActual,
}: SidebarContentProps) {
  const pathnameReal = usePathname();
  const pathname = rutaActual ?? pathnameReal;
  const router = useRouter();
  const { user, logout } = useAuth();

  // Dismissible invite card — hidden persists across sessions via localStorage.
  // Read in an effect (not the initializer) to avoid an SSR hydration mismatch.
  const [inviteDismissed, setInviteDismissed] = useState(false);
  useEffect(() => {
    try {
      setInviteDismissed(localStorage.getItem(INVITE_DISMISSED_KEY) === '1');
    } catch {
      // localStorage unavailable — keep the card visible
    }
  }, []);
  const dismissInvite = () => {
    setInviteDismissed(true);
    try {
      localStorage.setItem(INVITE_DISMISSED_KEY, '1');
    } catch {
      // Non-critical: card stays hidden for this session only
    }
  };

  // UNA sola fila marcada: la más específica que calce con la ruta. Con los
  // agentes en su sección y sus URLs intactas, `/pagos/cobranza` calza con
  // «Pagos» y con «Cobranza»; marcar las dos era decir que la sala vive en los
  // dos lados (`fila-activa-del-menu.ts`).
  const hrefActivo = hrefDeLaFilaActiva(navItems, pathname);
  const isActive = (item: NavItem) => item.href === hrefActivo;

  const bloques = useMemo(() => agruparEnSecciones(navItems), [navItems]);
  const claveActiva = useMemo(() => {
    for (const b of bloques) {
      if (b.tipo === 'seccion' && b.filas.some((f) => f.href === hrefActivo)) return b.clave;
    }
    return null;
  }, [bloques, hrefActivo]);
  const { estado: estadoSecciones, alternar: alternarSeccion } = useSeccionesAbiertas(user?.id, claveActiva);

  return (
    // El sidebar NO pisa `--primary`: el primario es el del tema y nada más
    // (2026-08-16, definición de producto). Antes había un tinte de marca que
    // lo reemplazaba en claro por el hex de la agencia y dejaba dos azules
    // distintos para el mismo rol en la misma pantalla. Ver globals.css.
    <div className="flex flex-col h-full bg-bg relative">
      {/* Collapse Button */}
      {showCollapseButton && (
        <button
          onClick={onCollapse}
          aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          aria-expanded={!isCollapsed}
          className={cn(
            'absolute top-6 -right-3 z-50',
            'w-6 h-6 rounded-full bg-surface',
            'border border-border',
            'flex items-center justify-center',
            'text-fg-subtle hover:text-fg-muted',
            'shadow-xs transition-colors',
            // ≥44px hit target without changing the 24px visual (24 + 2×10 = 44)
            "before:absolute before:-inset-2.5 before:rounded-full before:content-['']",
            'outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1'
          )}
        >
          {isCollapsed ? (
            <CaretRight className="w-3.5 h-3.5" />
          ) : (
            <CaretLeft className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Header — cadence §Navigation workspace switcher (expanded) or the
          brand mark on the collapsed rail. */}
      {isCollapsed ? (
        <div className="h-[60px] flex items-center justify-center px-2">
          <Link href={logo?.href ?? '/'} className="flex items-center" onClick={onItemClick}>
            {workspaceLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={workspaceLogoUrl}
                alt={workspaceName ?? logo?.title ?? ''}
                width={32}
                height={32}
                className="h-8 w-8 rounded-[8px] object-cover"
              />
            ) : (
              // Mismo azul que la fila expandida, para que el rail colapsado no
              // cambie de identidad al plegar el sidebar.
              <span className="flex h-8 w-8 items-center justify-center text-primary">
                <LeasefySymbol size={18} />
              </span>
            )}
          </Link>
        </div>
      ) : (
        // Firma del PRODUCTO, no del cliente: el lockup de Leasefy solo, sin
        // nombre ni logo de la inmobiliaria. La identidad de la agencia ya vive
        // en su propio contexto (encabezados, documentos); repetirla acá arriba
        // solo confundía sobre en qué
        // producto estás parado. En el azul `primary` (Nico, 22-09: «el logo de
        // la sidebar en todas las plataformas en el azul primary»): el token ya
        // cambia a su versión clara en oscuro, sin ramificar por tema.
        //
        // Igual en los TRES paneles. Antes inquilino y propietario caían a un
        // fallback con otro logo y otro tamaño: la misma app cambiaba de firma
        // según quién entrara.
        <div className="px-3 pt-4 pb-3">
          <Link
            href={logo?.href ?? '/'}
            onClick={onItemClick}
            aria-label="Leasefy — inicio"
            className="flex w-full items-center rounded-[12px] px-[10px] py-[6px] text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LeasefyLogotype size={26} />
          </Link>
        </div>
      )}

      {/* Search — cadence SidebarSearch opens the command palette (⌘K).
          Falls back to the aboveNav slot for layouts that don't wire it. */}
      {!isCollapsed && (onSearchClick || aboveNav) && (
        <div className="px-3 pb-1" data-tour-target="buscador">
          {onSearchClick ? (
            <SidebarSearch
              readOnly
              placeholder={searchPlaceholder ?? 'Buscar'}
              className="cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                onSearchClick();
              }}
            />
          ) : (
            aboveNav
          )}
        </div>
      )}

      {/* Punto de partida: debajo del buscador y antes de la navegación, que es
          donde se lo busca cuando todavía no se sabe a dónde ir. */}
      {!isCollapsed && belowSearch && <div className="px-3 pb-2 pt-1">{belowSearch}</div>}

      {/* Compass */}
      <nav
        aria-label="Navegación principal"
        // data-lenis-prevent + overscroll-contain: the grouped nav can overflow,
        // and Lenis otherwise hijacks the wheel so the sidebar never scrolls.
        data-lenis-prevent
        className={cn(
          'flex-1 overflow-y-auto py-2 [overscroll-behavior:contain]',
          isCollapsed ? 'px-2' : 'px-3'
        )}
      >
        {loading ? (
          <NavSkeleton isCollapsed={isCollapsed} />
        ) : (
          isCollapsed ? (
            <div>
              {bloques.map((bloque, i) => (
                <GrupoDelRiel
                  key={bloque.tipo === 'seccion' ? bloque.clave : `sueltas-${i}`}
                  bloque={bloque}
                  isActive={isActive}
                  onItemClick={onItemClick}
                  primero={i === 0}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {bloques.map((bloque, i) =>
                bloque.tipo === 'seccion' ? (
                  <SeccionPlegable
                    key={bloque.clave}
                    bloque={bloque}
                    abierta={estaAbierta(estadoSecciones, bloque.clave)}
                    contieneLaActiva={bloque.clave === claveActiva}
                    onAlternar={() => alternarSeccion(bloque.clave)}
                    isActive={isActive}
                    onItemClick={onItemClick}
                  />
                ) : (
                  // Filas sin sección: las de arriba (Inicio, Chat) abren el
                  // menú; las de abajo (el pie: Reportes) lo cierran, con una
                  // raya que las separa de la última sección.
                  <div
                    key={`sueltas-${i}`}
                    className={cn('space-y-0.5', i > 0 && 'mt-2 border-t border-border pt-2', i === 0 && 'mb-2')}
                  >
                    {bloque.filas.map((item) => (
                      <NavItemComponent
                        key={item.href}
                        item={item}
                        isActive={isActive(item)}
                        isCollapsed={false}
                        onClick={onItemClick}
                      />
                    ))}
                  </div>
                ),
              )}
            </div>
          )
        )}
      </nav>

      {/* Profile Completion Widget */}
      {profileCompletion && !isCollapsed && (() => {
        const completedCount = profileCompletion.completedCount ?? 0;
        const totalSteps = profileCompletion.totalSteps ?? 2;
        const steps = profileCompletion.steps ?? [];
        const locale = profileCompletion.locale ?? 'es';
        const completedSteps = steps.filter(s => s.completed);
        const pendingSteps = steps.filter(s => !s.completed);
        const nextStep = pendingSteps[0];
        const isComplete = completedCount >= totalSteps;

        // Don't show widget if profile is complete
        if (isComplete) return null;

        return (
          <div className="px-3 pb-3">
            <Link
              href={profileCompletion.href}
              onClick={onItemClick}
              className="block p-3 rounded-lg bg-surface-muted border border-border-faint hover:bg-surface-hover transition-colors group"
            >
              {/* Header with progress */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-medium text-fg">
                  {profileCompletion.label || (locale === 'es' ? 'Completa tu perfil' : 'Complete your profile')}
                </p>
                <span className="text-[11px] font-medium font-mono tabular-nums text-fg-subtle">
                  {completedCount}/{totalSteps}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-border rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${profileCompletion.percentage}%` }}
                />
              </div>

              {/* Completed steps - compact (only show if there are completed steps) */}
              {completedSteps.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {completedSteps.map((step) => (
                    <span key={step.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-success-soft text-success text-[10px] font-medium rounded-md">
                      <CheckCircle className="w-2.5 h-2.5" weight="fill" />
                      {locale === 'es' ? step.labelEs : step.labelEn}
                    </span>
                  ))}
                </div>
              )}

              {/* Next step - highlighted */}
              {nextStep && (
                <div className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border group-hover:border-border-strong transition-colors">
                  <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary-soft flex items-center justify-center flex-shrink-0">
                    <span className="font-mono text-[9px] font-bold text-primary">{completedCount + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-fg truncate">
                      {locale === 'es' ? nextStep.labelEs : nextStep.labelEn}
                    </p>
                    <p className="text-[10px] text-fg-subtle">
                      {locale === 'es' ? 'Siguiente paso' : 'Next step'}
                    </p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-fg-subtle group-hover:text-fg-muted transition-colors flex-shrink-0" />
                </div>
              )}

              {/* If no completed steps and no next step, show a start message */}
              {completedSteps.length === 0 && !nextStep && (
                <div className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border">
                  <p className="text-[11px] text-fg-subtle">
                    {locale === 'es' ? 'Comienza configurando tu perfil' : 'Start by setting up your profile'}
                  </p>
                </div>
              )}
            </Link>
          </div>
        );
      })()}

      {/* Footer — cadence §Navigation: invite card + upgrade CTA, then Help.
          Collapsed rail shows only the Help icon. */}
      {isCollapsed ? (
        <div className="px-2 pb-3 space-y-1">
          <Link
            href="/ayuda"
            onClick={onItemClick}
            title="Ayuda"
            className="flex items-center justify-center px-2.5 py-2.5 rounded-full text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors"
          >
            <Question className="w-[18px] h-[18px]" />
          </Link>
          <SidebarThemeToggle collapsed />
        </div>
      ) : (
        <div className="px-3 pb-3 space-y-2.5">
          {footerCards}
          {showInvite && !inviteDismissed && (
            <div className="relative group/invite">
              <button
                type="button"
                onClick={dismissInvite}
                aria-label="Ocultar tarjeta de invitación"
                className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
              {/* 🔴 `meta=""` a propósito (QA 22-09): sin él, cadence pinta su
                  valor por defecto «3 invitaciones libres» —un número que nadie
                  contó— y seguía diciendo 3 con 5 y con 6 miembros. Un total
                  sólo se dice cuando se pudo contar. */}
              <SidebarInviteCard onInvite={onInvite} meta="" />
            </div>
          )}
          {showUpgrade && (
            <SidebarUpgradeButton
              label={upgradeLabel ?? 'Upgrade'}
              onClick={() => {
                if (upgradeHref) router.push(upgradeHref);
                onItemClick?.();
              }}
            />
          )}
          {/* Ayuda y tema comparten fila: son los dos ajustes de chrome, y así
              el pie no crece una línea más por cada uno. */}
          <div className="flex items-center gap-2">
            <Link
              href="/ayuda"
              onClick={onItemClick}
              className="flex flex-1 items-center gap-3 px-3 py-2 rounded-full text-[13px] text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors"
            >
              <Question className="w-[18px] h-[18px]" />
              <span>Ayuda</span>
            </Link>
            <SidebarThemeToggle />
          </div>
        </div>
      )}
    </div>
  );
}

export function PlanSidebar({
  navItems,
  logo,
  className,
  defaultCollapsed = false,
  showUpgrade = false,
  upgradeHref,
  upgradeLabel,
  profileCompletion,
  aboveNav,
  belowSearch,
  loading = false,
  onSearchClick,
  searchPlaceholder,
  workspaceName,
  workspaceLogoUrl,
  showInvite = false,
  onInvite,
  footerCards,
}: PlanSidebarProps) {
  const { isCollapsed, toggle } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Register with the module-level opener so PlanHeader's menu button
  // (rendered in a sibling tree) can open this Sheet.
  useEffect(() => {
    const listener = () => setMobileOpen(true);
    mobileSidebarListeners.add(listener);
    return () => {
      mobileSidebarListeners.delete(listener);
    };
  }, []);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0',
          'bg-bg border-r border-border',
          'transition-all duration-200',
          isCollapsed ? 'lg:w-16' : 'lg:w-[240px]',
          className
        )}
      >
        <SidebarContent
          navItems={navItems}
          logo={logo}
          isCollapsed={isCollapsed}
          onCollapse={toggle}
          showUpgrade={showUpgrade}
          upgradeHref={upgradeHref}
          upgradeLabel={upgradeLabel}
          profileCompletion={profileCompletion}
          aboveNav={aboveNav}
          belowSearch={belowSearch}
          loading={loading}
          onSearchClick={onSearchClick}
          searchPlaceholder={searchPlaceholder}
          workspaceName={workspaceName}
          workspaceLogoUrl={workspaceLogoUrl}
          showInvite={showInvite}
          onInvite={onInvite}
          footerCards={footerCards}
        />
      </aside>

      {/* Mobile Sheet — opened from PlanHeader's inline menu button via
          openPlanMobileSidebar() (the old floating hamburger overlapped the
          header search input and was removed). */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-bg border-r-0">
          <SheetHeader className="sr-only">
            <SheetTitle>List de navegacion</SheetTitle>
          </SheetHeader>
          <SidebarContent
            navItems={navItems}
            logo={logo}
            isCollapsed={false}
            onCollapse={() => {}}
            onItemClick={() => setMobileOpen(false)}
            showUpgrade={showUpgrade}
            upgradeHref={upgradeHref}
            upgradeLabel={upgradeLabel}
            showCollapseButton={false}
            profileCompletion={profileCompletion}
            aboveNav={aboveNav}
            belowSearch={belowSearch}
            loading={loading}
            onSearchClick={
              onSearchClick
                ? () => {
                    setMobileOpen(false);
                    onSearchClick();
                  }
                : undefined
            }
            searchPlaceholder={searchPlaceholder}
            workspaceName={workspaceName}
            workspaceLogoUrl={workspaceLogoUrl}
            showInvite={showInvite}
            onInvite={
              onInvite
                ? () => {
                    setMobileOpen(false);
                    onInvite();
                  }
                : undefined
            }
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

