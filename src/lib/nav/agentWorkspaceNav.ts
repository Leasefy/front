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
  // ChartLine,  ← reactivar junto con la pestaña «Reporte diario»
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
  Ticket,
} from '@phosphor-icons/react';
import { AGENCY_ROLES, type AgencyRole } from '@/lib/auth/agency-roles';

/**
 * Single source of truth for each AI agent's INTERNAL navigation.
 *
 * Historically these lived as `children:[]` arrays on the agent items in the
 * global sidebar (`app/panel/inmobiliaria/layout.tsx`), which made the sidebar
 * overwhelming. They now live here: the sidebar renders each MODULE as a single
 * item, the module's screens are section cards (`SeccionesDelModulo`), and
 * when one of those sections is an agent, `WorkspaceNav` reads this config to
 * render the agent's functions as a row of tabs UNDER the cards (both mounted
 * once in the panel layout; the cards stay put while you are inside the agent).
 *
 * ── Dónde vive cada agente (septiembre 2026) ───────────────────────────────
 * La IA es un modo, no un lugar: el namespace `/ai/*` desapareció y cada
 * workspace vive dentro del módulo dueño del proceso que automatiza —
 * `arquitectura-del-panel.ts` es quien lo declara (`agente: '<slug>'`) y un
 * test cuida que el `basePath` de acá y la ruta de allá coincidan.
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
  /** Stable key — coincide con `agente` en `arquitectura-del-panel.ts`. */
  slug: string;
  /** Workspace root — also the "Resumen" destination. */
  basePath: string;
  /**
   * Prefijos que cuelgan de `basePath` pero NO son del agente. Pagos es la
   * Sala del agente Y la raíz del módulo: `/pagos/dispersiones`,
   * `/pagos/liquidaciones` y `/pagos/cxp` son pantallas hermanas, no
   * funciones del agente. Lo respeta `findAgentWorkspace`.
   */
  excluir?: string[];
  /** i18n key for the agent's display name. */
  labelKey: string;
  icon: Icon;
  module?: string | null;
  roles?: AgencyRole[];
  items: WorkspaceNavItem[];
}

const PANEL = '/panel/inmobiliaria';
const COBRANZA = `${PANEL}/cobros/cobranza`;
const ASEGURABILIDAD = `${PANEL}/postulaciones/asegurabilidad`;
const AVALUOS = `${PANEL}/inmuebles/avaluos`;
const CONCILIACION = `${PANEL}/conciliacion`;
const ESTUDIO = `${PANEL}/postulaciones/estudio`;
const MATCHING = `${PANEL}/postulaciones/matching`;
const PAGOS = `${PANEL}/pagos`;
const MANTENIMIENTO = `${PANEL}/mantenimientos/tickets`;
const CONTADOR_ROLES: AgencyRole[] = [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR];

export const AGENT_WORKSPACES: AgentWorkspace[] = [
  // ── Cobranza ──────────────────────────────────────────────────────────────
  {
    slug: 'cobranza',
    basePath: COBRANZA,
    labelKey: 'inmobiliaria.ai.nav.cobranza',
    icon: ChatCircleText,
    module: 'cobranza',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.cobranzaResumen', href: COBRANZA, icon: SquaresFour, exact: true, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaCasos', href: `${COBRANZA}/deudores`, icon: Users, module: 'cobranza' },
      // FUSIONADO en el Resumen — «Pendientes» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.cobranzaPendientes', href: `${COBRANZA}/pendientes`, icon: ListChecks, module: 'cobranza' },
      // OCULTO — «Inbox de conversaciones» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.cobranzaInbox', href: `${COBRANZA}/inbox`, icon: ChatCircleText, module: 'cobranza' },
      // FUSIONADO en «Acuerdos de pago» — «Promesas de pago» (ver nota al pie).
      // { labelKey: 'inmobiliaria.ai.nav.cobranzaPromesas', href: `${COBRANZA}/promesas`, icon: BellRinging, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaAcuerdos', href: `${COBRANZA}/acuerdos`, icon: Handshake, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaDisputas', href: `${COBRANZA}/disputas`, icon: Scales, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.pagos', href: `${COBRANZA}/pagos`, icon: CreditCard, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.llamadas', href: `${COBRANZA}/llamadas`, icon: PhoneCall, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cartas', href: `${COBRANZA}/cartas`, icon: Envelope, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.siniestros', href: `${COBRANZA}/siniestros`, icon: Siren, module: 'cobranza' },
      // FUSIONADO en el Resumen — «Reporte diario» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.cobranzaReporte', href: `${COBRANZA}/reporte`, icon: ChartLine, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cobranzaReportesPropietarios', href: `${COBRANZA}/reportes-propietarios`, icon: Files, module: 'cobranza' },
      // FUSIONADO en el Resumen — «Analítica» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.analitica', href: `${COBRANZA}/analitica`, icon: ChartLineUp, module: 'cobranza' },
      // FUSIONADO en el Resumen — «Resultados» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.cobranzaResultados', href: `${COBRANZA}/resultados`, icon: Trophy, module: 'cobranza' },
      // OCULTO — «Playbooks» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.cobranzaPlaybooks', href: `${COBRANZA}/plantillas`, icon: FileText, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.compliance', href: `${COBRANZA}/compliance`, icon: ClipboardText, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.arco', href: `${COBRANZA}/arco`, icon: ShieldCheck, module: 'cobranza' },
      // OCULTO — «Equipo IA» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.cobranzaEquipo', href: `${COBRANZA}/equipo`, icon: UsersThree, module: 'cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.configuracion', href: `${COBRANZA}/configuracion`, icon: SlidersHorizontal, module: 'cobranza' },
    ],
  },
  // ── Cotizador / Asegurabilidad ────────────────────────────────────────────
  {
    slug: 'asegurabilidad',
    basePath: ASEGURABILIDAD,
    labelKey: 'inmobiliaria.ai.nav.cotizador',
    icon: FileText,
    module: 'cotizador',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.cotizadorResumen', href: ASEGURABILIDAD, icon: SquaresFour, exact: true, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.nav.cotizadorCola', href: `${ASEGURABILIDAD}/cola`, icon: ClipboardText, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.nav.cotizadorNueva', href: `${ASEGURABILIDAD}/nueva`, icon: Plus, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.nav.cotizadorComparar', href: `${ASEGURABILIDAD}/comparar`, icon: Table, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.nav.cotizadorEjecucion', href: `${ASEGURABILIDAD}/ejecucion`, icon: Lightning, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.cotizador.nav.aseguradoras', href: `${ASEGURABILIDAD}/aseguradoras`, icon: ShieldCheck, module: 'cotizador' },
      // OCULTO — «Equipo IA» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.cotizadorEquipo', href: `${ASEGURABILIDAD}/equipo`, icon: UsersThree, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.cotizador.nav.insights', href: `${ASEGURABILIDAD}/insights`, icon: ChartLineUp, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.cotizador.nav.costos', href: `${ASEGURABILIDAD}/costos`, icon: CurrencyDollar, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.nav.cotizadorIntegraciones', href: `${ASEGURABILIDAD}/integraciones`, icon: GitMerge, module: 'cotizador' },
      { labelKey: 'inmobiliaria.ai.cotizador.nav.configuracion', href: `${ASEGURABILIDAD}/configuracion`, icon: SlidersHorizontal, module: 'cotizador' },
    ],
  },
  // ── Avalúos ───────────────────────────────────────────────────────────────
  {
    slug: 'avaluos',
    basePath: AVALUOS,
    labelKey: 'inmobiliaria.ai.nav.avaluos',
    icon: Scales,
    module: 'avaluos',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.resumen', href: AVALUOS, icon: SquaresFour, exact: true, module: 'avaluos' },
      { labelKey: 'inmobiliaria.ai.nav.avaluosCola', href: `${AVALUOS}/cola`, icon: ClipboardText, module: 'avaluos' },
      { labelKey: 'inmobiliaria.ai.nav.avaluosConfiguracion', href: `${AVALUOS}/configuracion`, icon: SlidersHorizontal, module: 'avaluos' },
    ],
  },
  // ── Conciliación ──────────────────────────────────────────────────────────
  {
    slug: 'conciliacion',
    basePath: CONCILIACION,
    labelKey: 'inmobiliaria.nav.conciliacion',
    icon: Bank,
    module: null,
    roles: CONTADOR_ROLES,
    items: [
      { labelKey: 'inmobiliaria.ai.nav.resumen', href: CONCILIACION, icon: SquaresFour, exact: true, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionCola', href: `${CONCILIACION}/cola`, icon: ClipboardText, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionMovimientos', href: `${CONCILIACION}/movimientos`, icon: ArrowsClockwise, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionConexiones', href: `${CONCILIACION}/conexiones`, icon: GitMerge, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionLiquidaciones', href: `${CONCILIACION}/liquidaciones`, icon: Wallet, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionAnalitica', href: `${CONCILIACION}/analitica`, icon: ChartLineUp, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.conciliacionConfiguracion', href: `${CONCILIACION}/configuracion`, icon: SlidersHorizontal, module: null, roles: CONTADOR_ROLES },
    ],
  },
  // ── Estudio del inquilino ─────────────────────────────────────────────────
  {
    slug: 'estudio',
    basePath: ESTUDIO,
    labelKey: 'inmobiliaria.ai.nav.estudio',
    icon: ShieldCheck,
    module: 'estudio',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.estudioResumen', href: ESTUDIO, icon: SquaresFour, exact: true, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioCasos', href: `${ESTUDIO}/estudios`, icon: Users, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioCrear', href: `${ESTUDIO}/nuevo`, icon: Plus, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioSolicitud', href: `${ESTUDIO}/solicitud`, icon: PaperPlaneTilt, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioCola', href: `${ESTUDIO}/cola`, icon: ClipboardText, module: 'estudio' },
      // OCULTO — «Equipo IA» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.estudioEquipo', href: `${ESTUDIO}/equipo`, icon: UsersThree, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioAnalitica', href: `${ESTUDIO}/analitica`, icon: ChartLineUp, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioReglas', href: `${ESTUDIO}/reglas`, icon: Scales, module: 'estudio' },
      { labelKey: 'inmobiliaria.ai.nav.estudioConfiguracion', href: `${ESTUDIO}/configuracion`, icon: SlidersHorizontal, module: 'estudio' },
    ],
  },
  // ── Matching ──────────────────────────────────────────────────────────────
  {
    slug: 'matching',
    basePath: MATCHING,
    labelKey: 'inmobiliaria.ai.nav.matching',
    icon: GitMerge,
    module: 'matching',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.resumen', href: MATCHING, icon: SquaresFour, exact: true, module: 'matching' },
      { labelKey: 'inmobiliaria.ai.nav.matchingCola', href: `${MATCHING}/cola`, icon: ClipboardText, module: 'matching' },
      { labelKey: 'inmobiliaria.ai.nav.matchingAnalitica', href: `${MATCHING}/analitica`, icon: ChartLineUp, module: 'matching' },
      { labelKey: 'inmobiliaria.ai.nav.matchingConfiguracion', href: `${MATCHING}/configuracion`, icon: SlidersHorizontal, module: 'matching' },
    ],
  },
  // ── Pagos (AP) ────────────────────────────────────────────────────────────
  {
    slug: 'pagos',
    basePath: PAGOS,
    excluir: [`${PAGOS}/dispersiones`, `${PAGOS}/liquidaciones`, `${PAGOS}/cxp`],
    labelKey: 'inmobiliaria.ai.nav.pagos',
    icon: CurrencyDollar,
    module: null,
    roles: CONTADOR_ROLES,
    items: [
      { labelKey: 'inmobiliaria.ai.nav.resumen', href: PAGOS, icon: SquaresFour, exact: true, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosCobros', href: `${PAGOS}/cobros`, icon: Receipt, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosGenerar', href: `${PAGOS}/generar`, icon: PaperPlaneTilt, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosFallidos', href: `${PAGOS}/fallidos`, icon: WarningCircle, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosRecordatorios', href: `${PAGOS}/recordatorios`, icon: BellRinging, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosPropietarios', href: `${PAGOS}/propietarios`, icon: Wallet, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosCola', href: `${PAGOS}/cola`, icon: ClipboardText, module: null, roles: CONTADOR_ROLES },
      // OCULTO — «Equipo IA» (ver nota al pie del archivo).
      // { labelKey: 'inmobiliaria.ai.nav.pagosEquipo', href: `${PAGOS}/equipo`, icon: UsersThree, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosAnalitica', href: `${PAGOS}/analitica`, icon: ChartLineUp, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosReglas', href: `${PAGOS}/reglas`, icon: Lightning, module: null, roles: CONTADOR_ROLES },
      { labelKey: 'inmobiliaria.ai.nav.pagosConfiguracion', href: `${PAGOS}/configuracion`, icon: SlidersHorizontal, module: null, roles: CONTADOR_ROLES },
    ],
  },
  // ── Mantenimiento (tickets) ───────────────────────────────────────────────
  // Estaba en dos grupos del sidebar (/operaciones y /ai/mantenimiento/tickets).
  // La raíz es la bandeja de tickets —lo que la gente abre—; el Resumen (KPIs,
  // mock-first) queda una pestaña al lado. Gate 'mantenimiento' en el layout
  // del segmento (mantenimientos/tickets/layout.tsx).
  {
    slug: 'mantenimiento',
    basePath: MANTENIMIENTO,
    labelKey: 'inmobiliaria.ai.nav.mantenimientoTickets',
    icon: Ticket,
    module: 'mantenimiento',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.mantenimientoTickets', href: MANTENIMIENTO, icon: Ticket, exact: true, module: 'mantenimiento', dataTourTarget: 'sidebar-mantenimiento' },
      { labelKey: 'inmobiliaria.ai.nav.mantenimientoResumen', href: `${MANTENIMIENTO}/resumen`, icon: SquaresFour, module: 'mantenimiento' },
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
 * Las páginas siguen existiendo en la carpeta `equipo/` de cada workspace y sus
 * claves i18n intactas: para reactivarlas basta descomentar las 4 líneas y el
 * import de `UsersThree`. No quedan otros enlaces a esas rutas en la app, así
 * que sólo se alcanzan escribiendo la URL a mano.
 */

/**
 * NOTA — «Promesas de pago» fusionado en «Acuerdos de pago» (2026-08-09,
 * decisión de Nico).
 *
 * Eran dos pestañas para la misma pregunta: *¿qué se comprometió a pagar este
 * deudor?* La diferencia era técnica, no de negocio:
 *
 * - `/promesas` → `agent.payment_promises` (49 filas). Lo que el agente
 *   registra en la llamada: un monto y una fecha.
 * - `/acuerdos` → `agent.payment_plans` (**0 filas en los tres tenants**).
 *   Planes con cuota inicial, N cuotas y link de pago, que arma una persona.
 *
 * Para el negocio las dos son «acuerdos de pago», así que ahora hay UNA sola
 * pestaña con una tabla que muestra los dos orígenes; la columna «Tipo»
 * conserva la diferencia sin obligar a nadie a adivinar en cuál de dos
 * pantallas buscar a un deudor.
 *
 * Lo que sigue abierto (verificado en código, no supuesto): **ningún agente
 * puede crear un plan**. El Closer sólo tiene `recordPromise`,
 * `generatePaymentLink`, `scheduleFollowUp` y `sendWhatsAppTemplate`. Sí
 * negocia cuotas (`calculatePaymentPlan`), pero lo que persiste es una promesa
 * —`recordPromise` sólo acepta `amountCop` + `dueDate`— así que el cronograma
 * recién calculado se pierde. `persistOfferedPlan`
 * (`agent/src/cartera/payment-plans/wompi-link.ts`) crearía el plan con su link
 * de pago y hoy nadie la invoca: aparece como `void persistOfferedPlan` para
 * callar al linter.
 *
 * La ruta `/promesas`, su pantalla y su i18n quedan intactas (sólo alcanzable
 * escribiendo la URL) por si hay que volver atrás.
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

/**
 * NOTA — «Analítica» fusionada en el Resumen (2026-08-08, decisión de Nico).
 *
 * De sus cinco widgets se subieron TRES a `CobranzaAnaliticaResumen`, bajo
 * «Cómo lo está logrando»: tasa de recuperación, costo por peso recuperado y
 * objeciones más frecuentes.
 *
 * Los otros dos NO subieron:
 *   · Top scripts — está muerto. El SQL hace `JOIN agent.script_templates`,
 *     tabla vacía que nada llena, y ninguna llamada trae `script_template_id`.
 *     Un INNER JOIN contra una tabla vacía no devuelve nada nunca. Es la cara
 *     analítica del mismo hueco que sacó a Playbooks del panel.
 *   · Cadencia (mix de canal + mapa 24×7) — sirve para afinar cuándo y por qué
 *     canal contacta el agente, y eso lo afinamos nosotros. Lo que a la
 *     inmobiliaria sí le toca de horarios (Ley 2300) vive en Cumplimiento.
 *
 * El bloque respeta la compuerta del backend (≥5 llamadas en 30 días): sin eso
 * no se monta. Antes, no cumplirla significaba una pantalla entera dedicada a
 * un cartel de «Sin datos aún» — con el número de fase interna a la vista.
 *
 * La ruta y su i18n se quedan (sólo alcanzable escribiendo la URL).
 */

/**
 * NOTA — «Reporte diario» fusionado en el Resumen (2026-08-08, decisión de Nico).
 *
 * Lo que había que mirar cada día —las alertas de umbral y los deudores que más
 * pesan— subió al Resumen, a «Qué mirar hoy».
 *
 * Lo que quedaba en esa pantalla NO se perdió, se repartió:
 *   · Umbrales y Suscripción → Configuración §Reporte diario. Son perillas de la
 *     inmobiliaria, de la misma familia que los acuerdos.
 *   · Histórico de 30 días y Exportar CSV → siguen en `/cobranza/reporte`, ahora
 *     detrás de dos puertas: «Ver reporte completo» en el Resumen y «Ver
 *     histórico y exportar CSV» en Configuración.
 *
 * Los tres KPI del reporte no subieron a propósito: «llamadas fuera de horario»
 * ya vive en Cumplimiento, y morosidad/recuperación en «Cómo va el agente».
 */

/**
 * NOTA — «Pendientes» fusionado en el Resumen (2026-08-09, decisión de Nico).
 *
 * El Resumen ya monta `CobranzaAtencionPreview`, que lee de `usePendientes()`
 * —LA MISMA fuente que la página— muestra el top 5 por prioridad y cruza a la
 * lista completa con «Ver todo» y «Ver N pendientes más». No es un resumen
 * paralelo: es la misma lista, recortada.
 *
 * A diferencia del Inbox, ocultar esto NO deja trabajo huérfano. La ruta sigue
 * viva y el Resumen tiene TRES caminos hacia ella:
 *   · `CobranzaWowBanner` — el CTA del banner
 *   · `CobranzaWowBanner` — la tarjeta «Esperan tu aprobación»
 *   · `CobranzaAtencionPreview` — «Ver todo» / «Ver N pendientes más»
 *
 * ⚠️ Lo que queda por resolver es al revés: el Resumen dice lo mismo VARIAS
 * veces. Los siniestros que esperan aprobación salen en «Qué mirar hoy» (como
 * banner, vía `useInsuranceClaims`) Y otra vez como filas en «Qué necesita tu
 * atención hoy» (vía `usePendientes`, que lee el mismo hook). Con la pestaña
 * afuera esa repetición queda más a la vista, no menos.
 */

/**
 * NOTA — «Inbox de conversaciones» oculto (2026-08-09, decisión de Nico).
 *
 * ⚠️ NO es la pantalla de Llamadas con otro nombre. Son canales distintos:
 * Llamadas es voz (Vapi, con grabación y transcripción); el Inbox es texto de
 * WhatsApp. En la base: 8 hilos, 7 de `channel = 'whatsapp'` y CERO de voz.
 * No se solapan.
 *
 * ⚠️ QUÉ SE PIERDE MIENTRAS ESTÉ OCULTO
 *
 * El Inbox es hoy la ÚNICA superficie que muestra los hilos que el agente se
 * negó a contestar solo. Verificado en la base del tenant de demostración:
 *
 *   5 hilos con `requires_action = true`  (requiere_humano, sin_entender,
 *   disputa, solicitud_acuerdo, pago_reportado)
 *   0 de ellos tiene una fila en `agent.escalations`
 *
 * Y `use-pendientes.ts` NO lee `conversation_threads`: agrupa escalaciones,
 * cartas, siniestros, planes y reporte diario. Así que un «requiere humano» de
 * WhatsApp no aparece en Pendientes ni en ningún otro lado — se queda esperando
 * a alguien que ya no tiene dónde verlo.
 *
 * Para que ocultarlo salga gratis hay que enganchar los hilos con
 * `requires_action` a Pendientes. Mientras tanto, la ruta y su i18n se quedan
 * (sólo alcanzable escribiendo la URL) y el hook sigue cableado a los tres
 * endpoints reales del agente.
 */

/** Find the agent workspace whose basePath contains `pathname` (or null). */
export function findAgentWorkspace(pathname: string): AgentWorkspace | null {
  const ruta = pathname.split('?')[0] ?? pathname;
  const candidatos = AGENT_WORKSPACES.filter((w) => {
    const dentro = ruta === w.basePath || ruta.startsWith(`${w.basePath}/`);
    if (!dentro) return false;
    return !(w.excluir ?? []).some((e) => ruta === e || ruta.startsWith(`${e}/`));
  });
  // El más específico gana (por si un workspace colgara de otro).
  return candidatos.sort((a, b) => b.basePath.length - a.basePath.length)[0] ?? null;
}
