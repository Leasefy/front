import type { Icon } from '@phosphor-icons/react';
import {
  SquaresFour,
  Users,
  ListChecks,
  ChatCircleText,
  BellRinging,
  Handshake,
  Scales,
  CreditCard,
  PhoneCall,
  Envelope,
  Siren,
  ChartLine,
  Files,
  ChartLineUp,
  // Trophy,  ← reactivar junto con la pestaña «Resultados»
  FileText,
  ClipboardText,
  ShieldCheck,
  // UsersThree,  ← reactivar junto con las pestañas «Equipo IA»
  SlidersHorizontal,
  Plus,
  Table,
  Lightning,
  CurrencyDollar,
  GitMerge,
  ArrowsClockwise,
  Wallet,
  PaperPlaneTilt,
  Receipt,
  WarningCircle,
  Bank,
} from '@phosphor-icons/react';
import { AGENCY_ROLES, type AgencyRole } from '@/lib/auth/agency-roles';

/**
 * Single source of truth for each AI agent's INTERNAL navigation.
 *
 * Historically these lived as `children:[]` arrays on the agent items in the
 * global sidebar (`app/panel/inmobiliaria/layout.tsx`), which made the sidebar
 * overwhelming. They now live here: the sidebar renders each agent as a SINGLE
 * item, and `WorkspaceNav` reads this config to render the agent's functions as
 * horizontal tabs INSIDE the workspace (mounted once in `ai/layout.tsx`).
 *
 * `labelKey` is an i18n key resolved by the consumer via `t()`. `module`/`roles`
 * gating mirrors the sidebar's filter so a user never sees a tab they can't open.
 */

export interface WorkspaceNavItem {
  /** i18n key resolved with `t()` at render time. */
  labelKey: string;
  href: string;
  icon: Icon;
  /** When true the tab is active only on an exact pathname match. */
  exact?: boolean;
  /** Agent permission module gate (null = no module gate). */
  module?: string | null;
  /** Agency role gate (in addition to the module gate). */
  roles?: AgencyRole[];
  /** data-tour-target passthrough (Phase 38 PanelTour). */
  dataTourTarget?: string;
}

export interface AgentWorkspace {
  /** Stable key (the first path segment after /ai/). */
  slug: string;
  /** Workspace root — also the "Resumen" destination. */
  basePath: string;
  /** i18n key for the agent's display name. */
  labelKey: string;
  icon: Icon;
  module?: string | null;
  roles?: AgencyRole[];
  items: WorkspaceNavItem[];
}

const AI = '/panel/inmobiliaria/ai';
const CONTADOR_ROLES: AgencyRole[] = [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR];

export const AGENT_WORKSPACES: AgentWorkspace[] = [
  // ── Cobranza ──────────────────────────────────────────────────────────────
  {
    slug: 'cobranza',
    basePath: `${AI}/cobranza`,
    labelKey: 'inmobiliaria.ai.nav.cobranza',
    icon: ChatCircleText,
    module: 'cobranza',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.cobranzaResumen', href: `${AI}/cobranza`, icon: SquaresFour, exact: true, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaCasos', href: `${AI}/cobranza/deudores`, icon: Users, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaPendientes', href: `${AI}/cobranza/pendientes`, icon: ListChecks, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaInbox', href: `${AI}/cobranza/inbox`, icon: ChatCircleText, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaPromesas', href: `${AI}/cobranza/promesas`, icon: BellRinging, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaAcuerdos', href: `${AI}/cobranza/acuerdos`, icon: Handshake, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaDisputas', href: `${AI}/cobranza/disputas`, icon: Scales, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.pagos', href: `${AI}/cobranza/pagos`, icon: CreditCard, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.llamadas', href: `${AI}/cobranza/llamadas`, icon: PhoneCall, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cartas', href: `${AI}/cobranza/cartas`, icon: Envelope, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.siniestros', href: `${AI}/cobranza/siniestros`, icon: Siren, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaReporte', href: `${AI}/cobranza/reporte`, icon: ChartLine, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaReportesPropietarios', href: `${AI}/cobranza/reportes-propietarios`, icon: Files, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.analitica', href: `${AI}/cobranza/analitica`, icon: ChartLineUp, module: 'cobranza' },
      // FUSIONADO en el Resumen — «Resultados» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.cobranzaResultados', href: `${AI}/cobranza/resultados`, icon: Trophy, module: 'cobranza' },
      // OCULTO — «Playbooks» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.cobranzaPlaybooks', href: `${AI}/cobranza/plantillas`, icon: FileText, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.compliance', href: `${AI}/cobranza/compliance`, icon: ClipboardText, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.arco', href: `${AI}/cobranza/arco`, icon: ShieldCheck, module: 'cobranza' },
      // OCULTO — «Equipo IA» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.cobranzaEquipo', href: `${AI}/cobranza/equipo`, icon: UsersThree, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.configuracion', href: `${AI}/cobranza/configuracion`, icon: SlidersHorizontal, module: 'cobranza' },
    ],
  },
  // ── Cotizador / Asegurabilidad ────────────────────────────────────────────
  {
    slug: 'asegurabilidad',
    basePath: `${AI}/asegurabilidad`,
    labelKey: 'inmobiliaria.ai.nav.cotizador',
    icon: FileText,
    module: 'cotizador',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.cotizadorResumen', href: `${AI}/asegurabilidad`, icon: SquaresFour, exact: true, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.nav.cotizadorCola', href: `${AI}/asegurabilidad/cola`, icon: ClipboardText, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.nav.cotizadorNueva', href: `${AI}/asegurabilidad/nueva`, icon: Plus, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.nav.cotizadorComparar', href: `${AI}/asegurabilidad/comparar`, icon: Table, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.nav.cotizadorEjecucion', href: `${AI}/asegurabilidad/ejecucion`, icon: Lightning, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.cotizador.nav.aseguradoras', href: `${AI}/asegurabilidad/aseguradoras`, icon: ShieldCheck, module: 'cotizador' },
      // OCULTO — «Equipo IA» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.cotizadorEquipo', href: `${AI}/asegurabilidad/equipo`, icon: UsersThree, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.cotizador.nav.insights', href: `${AI}/asegurabilidad/insights`, icon: ChartLineUp, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.cotizador.nav.costos', href: `${AI}/asegurabilidad/costos`, icon: CurrencyDollar, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.nav.cotizadorIntegraciones', href: `${AI}/asegurabilidad/integraciones`, icon: GitMerge, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.cotizador.nav.configuracion', href: `${AI}/asegurabilidad/configuracion`, icon: SlidersHorizontal, module: 'cotizador' },
    ],
  },
  // ── Avalúos ───────────────────────────────────────────────────────────────
  {
    slug: 'avaluos',
    basePath: `${AI}/avaluos`,
    labelKey: 'inmobiliaria.ai.nav.avaluos',
    icon: Scales,
    module: 'avaluos',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.resumen', href: `${AI}/avaluos`, icon: SquaresFour, exact: true, module: 'avaluos' },
      { labelKey: 'inmobiliaria.ai.nav.avaluosCola', href: `${AI}/avaluos/cola`, icon: ClipboardText, module: 'avaluos' },
      { labelKey: 'inmobiliaria.ai.nav.avaluosConfiguracion', href: `${AI}/avaluos/configuracion`, icon: SlidersHorizontal, module: 'avaluos' },
    ],
  },
  // ── Conciliación ──────────────────────────────────────────────────────────
  {
    slug: 'conciliacion',
    basePath: `${AI}/conciliacion`,
    labelKey: 'inmobiliaria.nav.conciliacion',
    icon: Bank,
    module: null,
    roles: CONTADOR_ROLES,
    items: [
      { labelKey: 'inmobiliaria.ai.nav.resumen', href: `${AI}/conciliacion`, icon: SquaresFour, exact: true, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionCola', href: `${AI}/conciliacion/cola`, icon: ClipboardText, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionMovimientos', href: `${AI}/conciliacion/movimientos`, icon: ArrowsClockwise, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionConexiones', href: `${AI}/conciliacion/conexiones`, icon: GitMerge, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionLiquidaciones', href: `${AI}/conciliacion/liquidaciones`, icon: Wallet, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionAnalitica', href: `${AI}/conciliacion/analitica`, icon: ChartLineUp, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionConfiguracion', href: `${AI}/conciliacion/configuracion`, icon: SlidersHorizontal, module: null, roles: CONTADOR_ROLES },
    ],
  },
  // ── Estudio del inquilino ─────────────────────────────────────────────────
  {
    slug: 'estudio',
    basePath: `${AI}/estudio`,
    labelKey: 'inmobiliaria.ai.nav.estudio',
    icon: ShieldCheck,
    module: 'estudio',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.estudioResumen', href: `${AI}/estudio`, icon: SquaresFour, exact: true, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioCasos', href: `${AI}/estudio/estudios`, icon: Users, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioCrear', href: `${AI}/estudio/nuevo`, icon: Plus, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioSolicitud', href: `${AI}/estudio/solicitud`, icon: PaperPlaneTilt, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioCola', href: `${AI}/estudio/cola`, icon: ClipboardText, module: 'estudio' },
      // OCULTO — «Equipo IA» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.estudioEquipo', href: `${AI}/estudio/equipo`, icon: UsersThree, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioAnalitica', href: `${AI}/estudio/analitica`, icon: ChartLineUp, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioReglas', href: `${AI}/estudio/reglas`, icon: Scales, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioConfiguracion', href: `${AI}/estudio/configuracion`, icon: SlidersHorizontal, module: 'estudio' },
    ],
  },
  // ── Matching ──────────────────────────────────────────────────────────────
  {
    slug: 'matching',
    basePath: `${AI}/matching`,
    labelKey: 'inmobiliaria.ai.nav.matching',
    icon: GitMerge,
    module: 'matching',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.resumen', href: `${AI}/matching`, icon: SquaresFour, exact: true, module: 'matching' },
      { labelKey: 'inmobiliaria.ai.nav.matchingCola', href: `${AI}/matching/cola`, icon: ClipboardText, module: 'matching' },
      { labelKey: 'inmobiliaria.ai.nav.matchingAnalitica', href: `${AI}/matching/analitica`, icon: ChartLineUp, module: 'matching' },
      { labelKey: 'inmobiliaria.ai.nav.matchingConfiguracion', href: `${AI}/matching/configuracion`, icon: SlidersHorizontal, module: 'matching' },
    ],
  },
  // ── Pagos (AP) ────────────────────────────────────────────────────────────
  {
    slug: 'pagos',
    basePath: `${AI}/pagos`,
    labelKey: 'inmobiliaria.ai.nav.pagos',
    icon: CurrencyDollar,
    module: null,
    roles: CONTADOR_ROLES,
    items: [
      { labelKey: 'inmobiliaria.ai.nav.resumen', href: `${AI}/pagos`, icon: SquaresFour, exact: true, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosCobros', href: `${AI}/pagos/cobros`, icon: Receipt, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosGenerar', href: `${AI}/pagos/generar`, icon: PaperPlaneTilt, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosFallidos', href: `${AI}/pagos/fallidos`, icon: WarningCircle, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosRecordatorios', href: `${AI}/pagos/recordatorios`, icon: BellRinging, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosPropietarios', href: `${AI}/pagos/propietarios`, icon: Wallet, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosCola', href: `${AI}/pagos/cola`, icon: ClipboardText, module: null, roles: CONTADOR_ROLES },
      // OCULTO — «Equipo IA» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.pagosEquipo', href: `${AI}/pagos/equipo`, icon: UsersThree, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosAnalitica', href: `${AI}/pagos/analitica`, icon: ChartLineUp, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosReglas', href: `${AI}/pagos/reglas`, icon: Lightning, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosConfiguracion', href: `${AI}/pagos/configuracion`, icon: SlidersHorizontal, module: null, roles: CONTADOR_ROLES },
    ],
  },
];

/**
 * NOTA — «Equipo IA» oculto (2026-08-07, decisión de Nico).
 *
 * Las cuatro pestañas `.../equipo` (cobranza, asegurabilidad, estudio, pagos)
 * están comentadas arriba. Son contenido estático de presentación —personas
 * ficticias del equipo— sin backend que las alimente, así que no aportan nada
 * operativo dentro del workspace.
 *
 * Las páginas siguen existiendo en `app/panel/inmobiliaria/ai/*​/equipo/` y sus
 * claves i18n intactas: para reactivarlas basta descomentar las 4 líneas y el
 * import de `UsersThree`. No quedan otros enlaces a esas rutas en la app, así
 * que sólo se alcanzan escribiendo la URL a mano.
 */

/**
 * NOTA — «Playbooks» oculto (2026-08-08, decisión de Nico).
 *
 * `.../cobranza/plantillas` era un editor de los guiones del agente: lo que
 * dice en la llamada, las plantillas de WhatsApp y las respuestas a objeciones.
 *
 * No va, y no es por un bug: **qué dice el agente lo definimos nosotros.** No es
 * una perilla de la inmobiliaria. Lo único que la inmobiliaria configura son los
 * acuerdos que el agente puede ofrecer —descuento máximo, meses de plan, pago
 * mínimo, planes permitidos, camino de dificultad, intentos de negociación—, y
 * eso ya vive en `.../cobranza/configuracion` §Negociación, cableado al endpoint
 * que el agente lee de verdad (`GET/PATCH /api/agency/:id/policy`).
 *
 * Además la pantalla nunca pudo cumplir lo que ofrecía: `agent.script_templates`
 * está vacía, nada la llena y nada la lee en runtime — los guiones vivos son
 * datos en código (`agent/src/cartera/scripts/templates/`).
 *
 * Se deja la ruta y su i18n en su sitio (sólo alcanzable escribiendo la URL).
 * Si algún día el runtime pasa a leer la tabla, descomentar la línea y listo.
 */

/**
 * NOTA — «Resultados» fusionado en el Resumen (2026-08-08, decisión de Nico).
 *
 * `.../cobranza/resultados` y el Resumen hacían el mismo trabajo: KPI ejecutivos
 * del agente. Tanto, que Resultados llevaba una tarjeta al pie explicando que
 * ella no era la analítica ni el reporte diario.
 *
 * El reparto quedó así:
 *   Resumen           → cómo va el agente (las métricas con fuente real)
 *   Analítica         → el detalle por etapa, objeciones, cadencia y costo
 *   Reporte diario    → el corte operativo del día
 *
 * Las métricas de Resultados se movieron a `CobranzaResultadosKpis`, que ahora
 * monta el Resumen. De paso murió `CobranzaExecKpiGrid`: de sus ocho tarjetas,
 * cinco tenían el guión escrito a mano (`value: DASH`) — no eran métricas sin
 * datos, eran métricas sin fuente posible.
 *
 * La ruta y su i18n se quedan (sólo alcanzable escribiendo la URL).
 */

/** Find the agent workspace whose basePath contains `pathname` (or null). */
export function findAgentWorkspace(pathname: string): AgentWorkspace | null {
  return (
    AGENT_WORKSPACES.find(
      (w) => pathname === w.basePath || pathname.startsWith(`${w.basePath}/`)
    ) ?? null
  );
}
