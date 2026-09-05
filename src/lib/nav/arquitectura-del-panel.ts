import type { Icon } from '@phosphor-icons/react';
import {
  Kanban,
  Buildings,
  ClipboardText,
  FilePlus,
  Wrench,
  Lifebuoy,
  Chat,
  CalendarBlank,
  HandCoins,
  CurrencyDollar,
  Receipt,
  Bank,
  Calculator,
  UserCircle,
  UsersThree,
  FileText,
  ChartLine,
  Scales,
  GitMerge,
  ShieldCheck,
  ListChecks,
  Umbrella,
  ArrowsClockwise,
  Coins,
  CurrencyCircleDollar,
  ChatCircleText,
  Wallet,
  PaperPlaneTilt,
  SquaresFour,
  ChartLineUp,
  TrendUp,
} from '@phosphor-icons/react';
import { AGENCY_ROLES, type AgencyRole } from '@/lib/auth/agency-roles';
import type { BusinessModule } from './agency-module-scope';

/**
 * Arquitectura de información del panel de inmobiliaria — LA fuente de verdad.
 *
 * De acá salen el sidebar (`app/panel/inmobiliaria/layout.tsx` vía
 * `sidebar-del-panel.ts`), el selector de secciones de cada módulo (`SeccionesDelModulo`),
 * el primer escalón del breadcrumb de los agentes y los tests que cuidan que
 * nada se duplique ni quede huérfano (`arquitectura-del-panel.test.ts`).
 *
 * ── Los niveles ─────────────────────────────────────────────────────────────
 *
 *   N1 Grupo     una etiqueta del sidebar; no navega, no tiene ruta.
 *   N2 Módulo    la entrada del sidebar; un listado o un tablero. Es la raíz.
 *   N3 Sección   hermana del listado, con su propia lógica; se abre desde el
 *                selector de secciones del módulo (cards debajo del header,
 *                que NO se esconden al entrar en una). Acá caen Cobranza,
 *                Cartera, Dispersiones, Renovaciones… Si es un agente, adentro
 *                trae SU profundidad: pestañas (WorkspaceNav,
 *                `agentWorkspaceNav.ts`) debajo de las cards.
 *   N4 Ficha     un registro concreto. No se declara acá: es la hoja.
 *
 * Los grupos siguen el ciclo de vida del contrato —captar y arrendar → operar →
 * cobrar y pagar—, más el directorio de fichas y el pie transversal
 * (propuesta «Arquitectura de Leasefy», septiembre 2026).
 *
 * ── Qué es un agente y qué no ───────────────────────────────────────────────
 *
 * «IA» dejó de ser parte del nombre de las secciones: es una marca (`ia: true`).
 * Una pantalla con `agente` es un WORKSPACE de agente —tiene su Sala, sus
 * pestañas internas y su historial, tal cual estaban bajo `/ai/*`—; el slug
 * apunta a `AGENT_WORKSPACES` y un test cuida que las rutas coincidan. Una
 * pantalla con `ia: true` pero sin `agente` está asistida por IA (una cola que
 * la IA llena y una persona decide; o una pantalla del agente que ya es
 * hermana directa del módulo, como las tres de Retención) pero no abre un
 * workspace con pestañas propias.
 *
 * ── Reglas que NO cambian con esto ─────────────────────────────────────────
 *
 * · Cada fila conserva el `module`/`roles` que tenía como entrada del sidebar,
 *   y el `scope` (encuadre por rol, `agency-module-scope.ts`) que tenía ANTES
 *   de cambiar de grupo. Reordenar no le abre a nadie una pantalla nueva ni
 *   le cierra una que tenía: ver `sidebar-del-panel.ts`.
 * · Inicio (`/piloto`) y Chat (`/`) viven en el layout, no acá: no se tocan.
 */

export const PANEL = '/panel/inmobiliaria';

const CONTADOR_ROLES: readonly AgencyRole[] = [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR];

/**
 * Los que gestionan: ADMIN y AGENTE. Es lo mismo que `AgencyRoleGuard
 * allowed="managers"`, y va acá porque una fila del sidebar que un rol ve pero
 * no puede abrir es una promesa rota — el rol entra y lo devuelven a la
 * portada sin decirle nada (MSJ-6).
 */
const GESTION_ROLES: readonly AgencyRole[] = [AGENCY_ROLES.ADMIN, AGENCY_ROLES.AGENTE];

export interface PantallaDelPanel {
  /** Clave i18n de la etiqueta. */
  labelKey: string;
  /** Ruta absoluta (con `/panel/inmobiliaria`). */
  href: string;
  icon: Icon;
  /**
   * Sólo coincide en la ruta exacta. Sin esto coincide por prefijo (una ficha
   * bajo la pantalla la deja activa). La raíz de un módulo es exacta salvo que
   * sea la Sala de un agente (ver `pestanasDelModulo`).
   */
  exact?: boolean;
  /** AGENCY_MODULES key que la gobierna ('view'); null = sin gate de módulo. */
  module: string | null;
  /** Roles permitidos además de isAdmin. */
  roles?: readonly AgencyRole[];
  /**
   * Encuadre por rol propio de la pantalla, cuando difiere del del módulo
   * (Soportes era una fila de Administración y ahora cuelga de Postulaciones,
   * que es Comercial: el CONTADOR la sigue viendo). Sin esto hereda el del
   * módulo.
   */
  scope?: BusinessModule;
  /** Asistida por un agente → píldora «IA». */
  ia?: boolean;
  /** Slug del workspace en `agentWorkspaceNav.ts` — es un agente completo. */
  agente?: string;
  /** Pista pegada a la etiqueta («Solicitudes · PQRS»). */
  hintKey?: string;
  /** data-tour-target (PanelTour). */
  dataTourTarget?: string;
}

export interface ModuloDelPanel extends PantallaDelPanel {
  /** Identificador estable = segmento de ruta. */
  key: string;
  /**
   * Encuadre por rol que tenía la fila ANTES de esta arquitectura. No es
   * seguridad; ver `agency-module-scope.ts`. Sin scope = transversal.
   */
  scope?: BusinessModule;
  /** Pantallas N3. La raíz del módulo se agrega sola como primera pestaña. */
  pantallas?: PantallaDelPanel[];
}

export interface GrupoDelPanel {
  key: 'captacion' | 'operacion' | 'dinero' | 'directorio' | 'pie';
  /** Clave i18n de la cabecera; null = sin cabecera (el pie). */
  labelKey: string | null;
  modulos: ModuloDelPanel[];
}

const r = (p: string) => `${PANEL}${p}`;

export const ARQUITECTURA_DEL_PANEL: readonly GrupoDelPanel[] = [
  // ── CAPTACIÓN Y ARRIENDO ── conseguir inmuebles, estudiar candidatos, firmar.
  {
    key: 'captacion',
    labelKey: 'inmobiliaria.nav.secCaptacion',
    modulos: [
      { key: 'pipeline', labelKey: 'inmobiliaria.nav.pipelineCorto', href: r('/pipeline'), icon: Kanban, module: 'pipeline', scope: 'comercial' },
      {
        key: 'inmuebles', labelKey: 'inmobiliaria.nav.inmuebles', href: r('/inmuebles'), icon: Buildings, module: 'portafolio', scope: 'comercial',
        pantallas: [
          // Avalúos (7º agente): workspace de sólo lectura, proxied por el agente.
          // Gate `avaluos` con el fallback ABSENT = ALLOWED (agent-module-access.ts).
          { labelKey: 'inmobiliaria.ai.nav.avaluos', href: r('/inmuebles/avaluos'), icon: Scales, module: 'avaluos', ia: true, agente: 'avaluos' },
        ],
      },
      {
        key: 'postulaciones', labelKey: 'inmobiliaria.nav.postulaciones', href: r('/postulaciones'), icon: ClipboardText, module: null, scope: 'comercial', ia: true,
        // El flujo del candidato, en el orden en que se recorre. Las cuatro son
        // pantallas completas: se entran desde acá porque nadie hace matching o
        // asegurabilidad en abstracto —siempre es para una postulación—.
        pantallas: [
          { labelKey: 'inmobiliaria.ai.nav.matching', href: r('/postulaciones/matching'), icon: GitMerge, module: 'matching', ia: true, agente: 'matching' },
          { labelKey: 'inmobiliaria.ai.nav.estudio', href: r('/postulaciones/estudio'), icon: ShieldCheck, module: 'estudio', ia: true, agente: 'estudio' },
          // Era una fila de Administración (la ve el CONTADOR); conserva ese encuadre.
          { labelKey: 'inmobiliaria.nav.soportesCorto', href: r('/postulaciones/soportes'), icon: ListChecks, module: 'documentos', scope: 'administracion', ia: true },
          { labelKey: 'inmobiliaria.ai.nav.cotizador', href: r('/postulaciones/asegurabilidad'), icon: Umbrella, module: 'cotizador', ia: true, agente: 'asegurabilidad', dataTourTarget: 'sidebar-cotizador' },
        ],
      },
      {
        // 'contratos' es su propia AGENCY_MODULES key (todos los roles la tienen).
        key: 'contratos', labelKey: 'inmobiliaria.nav.contratos', href: r('/contratos'), icon: FilePlus, module: 'contratos', scope: 'administracion',
        pantallas: [
          { labelKey: 'inmobiliaria.nav.renovaciones', href: r('/contratos/renovaciones'), icon: ArrowsClockwise, module: 'operaciones' },
          // Retención (el agente Laura: tablero, riesgo de salida y decisiones
          // por aprobar) NO está en el catálogo a propósito: no va a producción
          // todavía (Nico, 2026-09-03). Las tres rutas siguen existiendo bajo
          // `contratos/(retencion)/` y sólo se alcanzan escribiendo la URL.
        ],
      },
    ],
  },

  // ── OPERACIÓN ── sostener el contrato vivo y atender al cliente.
  {
    key: 'operacion',
    labelKey: 'inmobiliaria.nav.secOperacionDelContrato',
    modulos: [
      // Sin `ia: true` ni la pantalla «Tickets»: el agente de mantenimiento
      // (bandeja de tickets, resumen, ficha) es mock-first y el micro no tiene
      // su endpoint (`/api/agency/:id/mantenimiento/inbox` no existe). Con
      // `NEXT_PUBLIC_USE_MOCK_API=false` la bandeja quedaba vacía o en error.
      // NO está en el catálogo a propósito: no va a producción todavía
      // (Nico, 2026-09-03: «¿qué es eso de tickets? no veo que funcione»).
      // Las rutas `mantenimientos/tickets/*` siguen existiendo para cuando el
      // micro lo sirva; el workspace está apagado en `agentWorkspaceNav.ts`.
      { key: 'mantenimientos', labelKey: 'inmobiliaria.nav.mantenimientos', href: r('/mantenimientos'), icon: Wrench, module: 'operaciones', scope: 'administracion' },
      { key: 'solicitudes', labelKey: 'inmobiliaria.nav.solicitudes', href: r('/solicitudes'), icon: Lifebuoy, module: 'operaciones', scope: 'administracion', ia: true, hintKey: 'inmobiliaria.nav.pqrs' },
      // `roles` y no `module`: no hay llave de AGENCY_MODULES para mensajes, y
      // la pantalla se cierra por rol (`AgencyRoleGuard allowed="managers"`).
      { key: 'mensajes', labelKey: 'inmobiliaria.nav.mensajes', href: r('/mensajes'), icon: Chat, module: null, roles: GESTION_ROLES, scope: 'administracion' },
      { key: 'agenda', labelKey: 'inmobiliaria.nav.agenda', href: r('/agenda'), icon: CalendarBlank, module: 'operaciones', scope: 'administracion' },
    ],
  },

  // ── DINERO ── cobrar, pagar, facturar, conciliar, contabilizar.
  {
    key: 'dinero',
    labelKey: 'inmobiliaria.nav.secDinero',
    modulos: [
      {
        key: 'cobros', labelKey: 'inmobiliaria.nav.cobros', href: r('/cobros'), icon: HandCoins, module: 'cobros', scope: 'finanzas',
        // Las tres son pantallas completas, hermanas del listado de cobros:
        // Recaudo (lo que entró) · Cartera (lo que queda) · Cobranza (el agente).
        pantallas: [
          { labelKey: 'inmobiliaria.nav.recaudo', href: r('/cobros/recaudo'), icon: Coins, module: 'cobros' },
          { labelKey: 'inmobiliaria.nav.cartera', href: r('/cobros/cartera'), icon: CurrencyCircleDollar, module: 'cobros' },
          { labelKey: 'inmobiliaria.ai.nav.cobranza', href: r('/cobros/cobranza'), icon: ChatCircleText, module: 'cobranza', ia: true, agente: 'cobranza', dataTourTarget: 'sidebar-cobranza' },
        ],
      },
      {
        // Pagos = lo que SALE. La raíz es la Sala del agente (F9); Liquidaciones
        // es la Tesorería de hoy (el neto por propietario) y Dispersiones la
        // ejecución bancaria. Las facturas de proveedor (CxP) cuelgan de
        // Liquidaciones: hoy no tienen listado propio, y no se inventa uno.
        key: 'pagos', labelKey: 'inmobiliaria.ai.nav.pagos', href: r('/pagos'), icon: CurrencyDollar, module: null, roles: CONTADOR_ROLES, scope: 'finanzas', ia: true, agente: 'pagos',
        pantallas: [
          { labelKey: 'inmobiliaria.nav.liquidaciones', href: r('/pagos/liquidaciones'), icon: Wallet, module: null, roles: CONTADOR_ROLES },
          { labelKey: 'inmobiliaria.nav.dispersiones', href: r('/pagos/dispersiones'), icon: PaperPlaneTilt, module: 'dispersiones' },
        ],
      },
      { key: 'facturacion', labelKey: 'inmobiliaria.nav.facturacion', href: r('/facturacion'), icon: Receipt, module: null, roles: CONTADOR_ROLES, scope: 'finanzas' },
      // La Sala del agente de conciliación (F6). Sus pestañas son las suyas.
      { key: 'conciliacion', labelKey: 'inmobiliaria.nav.conciliacion', href: r('/conciliacion'), icon: Bank, module: null, roles: CONTADOR_ROLES, scope: 'finanzas', ia: true, agente: 'conciliacion' },
      { key: 'contabilidad', labelKey: 'inmobiliaria.nav.contabilidadCorta', href: r('/contabilidad'), icon: Calculator, module: null, roles: CONTADOR_ROLES, scope: 'finanzas' },
    ],
  },

  // ── DIRECTORIO ── las fichas que se consultan (no los flujos que se trabajan).
  {
    key: 'directorio',
    labelKey: 'inmobiliaria.nav.secDirectorio',
    modulos: [
      { key: 'propietarios', labelKey: 'inmobiliaria.nav.propietarios', href: r('/propietarios'), icon: UserCircle, module: 'propietarios', scope: 'administracion' },
      // El permiso es `contratos` porque de ahí sale el dato.
      { key: 'inquilinos', labelKey: 'inquilinos.titulo', href: r('/inquilinos'), icon: UsersThree, module: 'contratos', scope: 'administracion' },
      { key: 'documentos', labelKey: 'inmobiliaria.nav.documentos', href: r('/documentos'), icon: FileText, module: 'documentos', scope: 'general', exact: true },
    ],
  },

  // ── PIE ── lectura y ajustes, sin cabecera.
  {
    key: 'pie',
    labelKey: null,
    modulos: [
      {
        key: 'reportes', labelKey: 'inmobiliaria.nav.reportes', href: r('/reportes'), icon: ChartLine, module: 'reportes', scope: 'general',
        pantallas: [
          // El «Dashboard» de siempre: KPIs del negocio. Es lectura, no portada
          // —la portada es Inicio—, así que vive con los reportes.
          { labelKey: 'inmobiliaria.nav.resumenDelNegocio', href: r('/reportes/resumen'), icon: SquaresFour, module: 'dashboard' },
          { labelKey: 'inmobiliaria.nav.rentabilidad', href: r('/reportes/rentabilidad'), icon: TrendUp, module: 'reportes' },
          // Sin `ia: true`: el nombre ya dice «IA», y la píldora al lado repetía «IA IA».
          { labelKey: 'inmobiliaria.nav.desempenoIa', href: r('/reportes/ia'), icon: ChartLineUp, module: 'analytics' },
        ],
      },
      // Configuración NO es una fila del sidebar (Nico, 2026-09-03: «tenemos
      // dos configuraciones, la de la sidebar y la del perfil; de la sidebar
      // deberíamos quitar eso de Configuración y setear todo en el perfil»).
      // Se entra por el menú del perfil —que ya tenía el ítem «Configuración»—
      // y por el buscador. Las rutas siguen vivas, con su propia navegación
      // interna: ver `app/panel/inmobiliaria/configuracion/secciones.ts`.
      // Por eso tampoco aparece el riel de secciones ahí: `moduloDeLaRuta` no
      // encuentra dueño para `/configuracion` y `SeccionesDelModulo` se calla.
    ],
  },
];

/**
 * Rutas del panel que existen pero NO cuelgan de ninguna fila del sidebar.
 *
 * Hoy es una sola: Configuración, que se abre desde el menú del perfil. Está
 * acá —y no suelta en un test— porque las tablas de redirecciones necesitan
 * saber que su destino es legítimo aunque no esté en el árbol de arriba.
 */
export const RUTAS_FUERA_DEL_SIDEBAR: readonly string[] = [`${PANEL}/configuracion`];

/** Todos los módulos, en orden de sidebar. */
export function modulosDelPanel(): ModuloDelPanel[] {
  return ARQUITECTURA_DEL_PANEL.flatMap((g) => g.modulos);
}

/**
 * Las pestañas de un módulo: su raíz primero, luego sus pantallas.
 *
 * La raíz es EXACTA (en `/cobros/7/cuenta-de-cobro` ninguna pestaña está
 * activa y la barra no se dibuja: la ficha ya trae su cabecera) salvo cuando
 * la raíz es la Sala de un agente (Pagos, Conciliación): ahí todo lo que cuelga
 * del agente —`/pagos/cola`, `/pagos/<caso>`— la deja activa, y las hermanas
 * (`/pagos/dispersiones`) ganan por ser más largas.
 */
export function pestanasDelModulo(m: ModuloDelPanel): PantallaDelPanel[] {
  const raiz: PantallaDelPanel = {
    labelKey: m.labelKey,
    href: m.href,
    icon: m.icon,
    module: m.module,
    roles: m.roles,
    scope: m.scope,
    ia: m.ia,
    agente: m.agente,
    hintKey: m.hintKey,
    dataTourTarget: m.dataTourTarget,
    exact: m.agente ? false : true,
  };
  return [raiz, ...(m.pantallas ?? []).map((p) => ({ ...p, scope: p.scope ?? m.scope }))];
}

function coincide(p: PantallaDelPanel, pathname: string): boolean {
  return pathname === p.href || (!p.exact && pathname.startsWith(`${p.href}/`));
}

function sinQuery(pathname: string): string {
  return pathname.split('?')[0] ?? pathname;
}

/** El módulo dueño de una ruta (el de href más largo que sea prefijo). */
export function moduloDeLaRuta(pathname: string): ModuloDelPanel | null {
  const ruta = sinQuery(pathname);
  const candidatos = modulosDelPanel().filter((m) => ruta === m.href || ruta.startsWith(`${m.href}/`));
  if (candidatos.length === 0) return null;
  return candidatos.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

/** La pestaña activa dentro de un módulo: la de href más largo que coincida. */
export function pestanaActiva(pestanas: PantallaDelPanel[], pathname: string): PantallaDelPanel | null {
  const ruta = sinQuery(pathname);
  return pestanas.filter((p) => coincide(p, ruta)).sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

/** La pantalla (N2 o N3) dueña de una ruta, con su módulo. */
export function pantallaDeLaRuta(pathname: string): { modulo: ModuloDelPanel; pantalla: PantallaDelPanel } | null {
  const modulo = moduloDeLaRuta(pathname);
  if (!modulo) return null;
  const pantalla = pestanaActiva(pestanasDelModulo(modulo), pathname);
  return pantalla ? { modulo, pantalla } : null;
}
