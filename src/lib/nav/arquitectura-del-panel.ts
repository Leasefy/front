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
  // ShieldCheck,  ← reactivar junto con «Evaluación de candidatos» (postulaciones/estudio)
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
  ArrowLineDown,
  ArrowLineUp,
  HandCoins,
  IdentificationBadge,
  Files,
  CalendarCheck,
  Signature,
  ShieldWarning,
  Toolbox,
  Scroll,
  Vault,
  ArrowsLeftRight,
  HourglassMedium,
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
 *                que NO se esconden al entrar en una). Acá caen Cartera,
 *                Dispersiones, Renovaciones, Soportes… Los agentes ya no: son
 *                módulos de «Agentes IA», y SU profundidad son pestañas
 *                (WorkspaceNav, `agentWorkspaceNav.ts`) debajo del header.
 *   N4 Ficha     un registro concreto. No se declara acá: es la hoja.
 *
 * Arriba de todo va la sección de los AGENTES; debajo, los grupos siguen el
 * ciclo de vida del contrato —captar y arrendar → operar → cobrar y pagar—, más
 * el directorio de fichas y el pie transversal (propuesta «Arquitectura de
 * Leasefy», septiembre 2026).
 *
 * ── Qué es un agente y qué no ───────────────────────────────────────────────
 *
 * Una fila con `agente` es un WORKSPACE de agente —tiene su Sala, sus
 * pestañas internas y su historial, tal cual estaban bajo `/ai/*`—; el slug
 * apunta a `AGENT_WORKSPACES` y un test cuida que las rutas coincidan. Una
 * pantalla con `ia: true` pero sin `agente` está ASISTIDA por IA (una cola que
 * la IA llena y una persona decide: Postulaciones, Soportes, Solicitudes) y se
 * queda en su módulo: no es un agente.
 *
 * ── 🔴 Los agentes tienen SU sección (Nico, 2026-09-16) ─────────────────────
 *
 * «Todo lo que tenemos de AI en este momento —no lo que está sin sacar, lo que
 * hay en este momento— creemos una sección sólo de agentes, y los metamos
 * todos ahí. Arriba de la sección de captación.»
 *
 * Revierte la decisión anterior, que era la contraria: «la IA es un modo, no
 * un lugar», y cada agente vivía DENTRO del módulo cuyo proceso automatiza
 * (Cobranza en Pagos, Matching y Asegurabilidad en Postulaciones, Avalúos en
 * Inmuebles, Conciliación en Dinero, Desempeño IA en Reportes). Se MUDARON, no
 * se duplicaron: una sala la reclama un solo lugar del catálogo.
 *
 * Lo que decide la mudanza, y lo que NO cambia:
 *
 *   · Las URLs se quedan (`/pagos/cobranza` sigue siendo `/pagos/cobranza`).
 *     Cada agente es ahora un MÓDULO propio (N2), así que `moduloDeLaRuta`
 *     —que elige el href más largo que sea prefijo— resuelve `/pagos/cobranza/…`
 *     a Cobranza y no a Pagos: el riel de Pagos se calla, el encabezado arranca
 *     en «Agentes IA» y el sidebar marca la fila del agente (la fila más
 *     específica gana, `fila-activa-del-menu.ts`). Mover las URLs no resolvía
 *     nada de eso y costaba otra mudanza de 151 archivos, los enlaces de los
 *     correos y los del chat.
 *   · Dentro de la sección la píldora «IA» sobra: la sección ya lo dice.
 *   · Cada fila conserva el `module`/`roles` y el `scope` que tenía como
 *     pantalla de su módulo anterior (el `scope` que heredaba, ahora escrito).
 *   · Lo que existe pero está sin sacar NO entra: Retención, Mantenimiento
 *     (tickets), Evaluación de candidatos. El equipo de Pagos SÍ entra, con una
 *     pantalla que dice qué está encendido y qué falta (ver su fila).
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

/**
 * Las TRES caras de la plata dentro del módulo Pagos.
 *
 * No son grupos ni submódulos: son la MISMA plata mirada desde los tres
 * lugares donde está.
 *
 *   · `inquilinos`   — lo que ENTRA: la deuda del mes (la raíz), recaudo,
 *                      el recaudo por convenio con el banco y cartera.
 *   · `propietarios` — lo que SALE: liquidaciones y dispersiones.
 *   · `tesoreria`    — lo que está EN LA CUENTA y todavía no es de nadie: el
 *                      cuadre del día, el traslado de la comisión y la plata
 *                      pendiente de aplicar.
 *
 * 🔴 La tercera cara nació el 18-09 de noche, y no de un antojo de
 * arquitectura: esas tres pantallas existían desde el 17 y el 18 y NUNCA
 * habían entrado a la navegación. Vivían como cinco enlaces azules apretados
 * a la derecha del título de `/pagos`, y Nico los señaló: «esos links que
 * están al lado derecho menos [se entienden], ¿eso es como tabs? porque está
 * a nivel de UX muy mal logrado». Las dos observaciones eran ciertas:
 * parecían pestañas sin serlo, y eran pantallas de pleno derecho escondidas
 * en una esquina. La regla que deja: **una pantalla que no cabe en la
 * navegación no se cuelga del título — o es una sección, o no existe.**
 *
 * 🔴 Casi TODA pantalla del módulo tiene cara, incluida la raíz. El campo es
 * opcional para la pantalla que de verdad mira todas: hoy es una sola, el
 * tablero financiero, y se dibuja en los tres rieles, primero y separada por
 * una línea. Una pantalla sin cara que en realidad sea de una sola es el
 * defecto que Nico venía señalando (abajo, el caso de `/pagos`).
 *
 * ── 🔴 Cómo se dibujan, y las DOS veces que cambió (Nico, 15 y 16-09) ───────
 *
 * Primero fueron dos rótulos en versalitas metidos ENTRE las cards, en el
 * mismo riel: `[Pagos] │ INQUILINOS [Recaudo] [Cartera] [Cobranza] │
 * PROPIETARIOS [Liquidaciones] [Dispersiones]`. Nico: «eso de arriba de
 * inquilinos y propietarios no se entiende, esa separación de las tabs de
 * arriba». Y tenía razón: eran dos niveles distintos —de qué lado del contrato
 * estoy, y qué pantalla abro— peleando por el mismo renglón, con la misma
 * cara. Se separaron en dos renglones: un SELECTOR de cara arriba y, debajo,
 * sólo las pantallas de la cara elegida (`SeccionesDelModulo`).
 *
 * Siguió sin entenderse, y el 16-09 apareció el porqué de fondo: había un
 * TERCER renglón —las pestañas de la Sala del agente de Pagos— que decía
 * «Pagos a propietarios» mientras arriba estaba elegido «Inquilinos». Ese
 * renglón se fue entero (ver la NOTA al pie de `agentWorkspaceNav.ts`), y con
 * él la última contradicción. Quedan DOS renglones, y el de abajo siempre
 * pertenece al de arriba.
 *
 * Con el tercer renglón fuera quedaba un último resto: la raíz `/pagos` no
 * tenía cara, así que aparecía como primera card en LAS DOS. Pero esa pantalla
 * es la deuda del mes de los INQUILINOS: elegir «Propietarios» y encontrarse
 * con la deuda de los inquilinos es el mismo defecto un piso más abajo. Por
 * eso la raíz declara `cara: 'inquilinos'` y `pestanasDelModulo` se la pasa.
 *
 * La cara se deduce de la ruta —estás en Dispersiones ⇒ estás en
 * Propietarios— y por defecto entra Inquilinos, que es donde se opera todos
 * los días.
 *
 * El `detalleKey` NO es decoración: es lo que hace que la separación se lea de
 * un vistazo sin tener que abrir nada. Y desde el 16-09 los rótulos llevan
 * VERBO («Cobrar a inquilinos» / «Pagar a propietarios»): «Inquilinos» a secas
 * ya nombra una fila del sidebar —el directorio— y la misma palabra en dos
 * lugares significando dos cosas distintas es media explicación de por qué
 * «no se entendía».
 */
export type CaraDeLaPlata = 'inquilinos' | 'propietarios' | 'tesoreria';

/** Rótulo, matiz e icono de cada cara, en el orden en que se leen. */
export const CARAS_DE_LA_PLATA: readonly {
  cara: CaraDeLaPlata;
  labelKey: string;
  /** El matiz que explica la cara sin abrir nada: «lo que entra» / «lo que sale». */
  detalleKey: string;
  icon: Icon;
}[] = [
  {
    cara: 'inquilinos',
    labelKey: 'inmobiliaria.nav.caraInquilinos',
    detalleKey: 'inmobiliaria.nav.caraInquilinosDetalle',
    icon: ArrowLineDown,
  },
  {
    cara: 'propietarios',
    labelKey: 'inmobiliaria.nav.caraPropietarios',
    detalleKey: 'inmobiliaria.nav.caraPropietariosDetalle',
    icon: ArrowLineUp,
  },
  {
    cara: 'tesoreria',
    labelKey: 'inmobiliaria.nav.caraTesoreria',
    detalleKey: 'inmobiliaria.nav.caraTesoreriaDetalle',
    icon: Vault,
  },
];

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
  /** Alternativas: alcanza con ver UNO (ver `NavItemWithModule.modulos`). */
  modulos?: readonly string[];
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
  /**
   * De qué lado del contrato está esta pantalla, cuando el módulo tiene dos
   * caras (hoy sólo Pagos). Sin `cara` la pantalla no es de ninguna: mira las
   * dos. Ver `CaraDeLaPlata`.
   */
  cara?: CaraDeLaPlata;
  /** Pista pegada a la etiqueta («Solicitudes · PQRS»). */
  hintKey?: string;
  /** data-tour-target (PanelTour). */
  dataTourTarget?: string;
  /**
   * 🔴 Módulo de PAGO que gobierna esta fila (17-09-2026). Hoy sólo `nomina`.
   * No es un permiso: es si la inmobiliaria lo compró. Ver `agency-nav-filter.ts`.
   */
  moduloPago?: string;
}

export interface ModuloDelPanel extends PantallaDelPanel {
  /**
   * Identificador estable. Por lo general es el último segmento de la ruta;
   * cuando el segmento solo no dice qué es (`/pagos/agente`, `/reportes/ia`),
   * la clave lo dice entero (`agente-de-pagos`, `desempeno-ia`).
   */
  key: string;
  /**
   * Encuadre por rol que tenía la fila ANTES de esta arquitectura. No es
   * seguridad; ver `agency-module-scope.ts`. Sin scope = transversal.
   */
  scope?: BusinessModule;
  /** Pantallas N3. La raíz del módulo se agrega sola como primera pestaña. */
  pantallas?: PantallaDelPanel[];
  /**
   * 🔴 Cómo se llama la RAÍZ cuando es una card del riel, si no puede llamarse
   * como el módulo.
   *
   * En el sidebar la fila tiene que llamarse «Pagos» —es el módulo—, pero
   * dentro del riel esa misma card quedaba como «Pagos» al lado de Recaudo y
   * Cartera: una sección con el nombre del módulo que la contiene no dice qué
   * se va a encontrar ahí. La raíz de Pagos es la DEUDA DEL MES, y así se
   * llama en el riel.
   *
   * Sin esto, la fila del sidebar y la card dirían lo mismo, que es el
   * problema; con dos `labelKey` distintos cada una dice lo suyo. No lo usa
   * ningún otro módulo: el resto de las raíces sí se llaman como su módulo
   * porque la raíz ES el módulo (Reportes, Contratos).
   */
  labelEnElRielKey?: string;
}

export interface GrupoDelPanel {
  key: 'agentes' | 'captacion' | 'operacion' | 'dinero' | 'directorio' | 'pie';
  /** Clave i18n de la cabecera; null = sin cabecera (el pie). */
  labelKey: string | null;
  modulos: ModuloDelPanel[];
}

const r = (p: string) => `${PANEL}${p}`;

export const ARQUITECTURA_DEL_PANEL: readonly GrupoDelPanel[] = [
  // ── AGENTES IA ── todo lo de IA que funciona hoy, en un solo lugar y arriba
  // de todo (Nico, 2026-09-16). El porqué y las reglas, en la cabecera.
  //
  // El ORDEN es el de los módulos de donde vinieron —Inmuebles, Postulaciones,
  // Pagos, Dinero—, así la sección se lee en el mismo sentido que el resto del
  // menú: primero lo que capta, después lo que cobra. Con una excepción a
  // propósito: el equipo de pagos, que hoy no trabaja (su pantalla lo dice),
  // va después de los que sí, y «Desempeño IA», que es cómo rinden todos,
  // cierra. Efecto asumido, el mismo que se asumió con la Agenda: la barra
  // inferior del móvil muestra las cinco primeras filas navegables
  // (`MobileNavBar`), y ahora las tres después de Inicio y Chat son agentes.
  // Ninguna puerta se pierde: el «más» las lista todas.
  //
  // Ninguna fila lleva `ia: true`: la cabecera ya lo dice.
  {
    key: 'agentes',
    labelKey: 'inmobiliaria.nav.secAgentes',
    modulos: [
      // Venía de Inmuebles (`scope: 'comercial'` heredado). Gate `avaluos` con
      // el fallback ABSENT = ALLOWED (agent-module-access.ts).
      { key: 'avaluos', labelKey: 'inmobiliaria.ai.nav.avaluos', href: r('/inmuebles/avaluos'), icon: Scales, module: 'avaluos', scope: 'comercial', agente: 'avaluos' },
      // Venían de Postulaciones (`scope: 'comercial'` heredado), en el orden en
      // que se recorre un candidato.
      { key: 'matching', labelKey: 'inmobiliaria.ai.nav.matching', href: r('/postulaciones/matching'), icon: GitMerge, module: 'matching', scope: 'comercial', agente: 'matching' },
      { key: 'asegurabilidad', labelKey: 'inmobiliaria.ai.nav.cotizador', href: r('/postulaciones/asegurabilidad'), icon: Umbrella, module: 'cotizador', scope: 'comercial', agente: 'asegurabilidad', dataTourTarget: 'sidebar-cotizador' },
      // Venía de Pagos, cara inquilinos (`scope: 'finanzas'` heredado). Sin
      // `cara`: las caras son de Pagos, y Cobranza ya no es una de sus pantallas.
      { key: 'cobranza', labelKey: 'inmobiliaria.ai.nav.cobranza', href: r('/pagos/cobranza'), icon: ChatCircleText, module: 'cobranza', scope: 'finanzas', agente: 'cobranza', dataTourTarget: 'sidebar-cobranza' },
      // Venía de Dinero, donde ya era la raíz de su propio módulo: sólo cambió
      // de grupo. Sus pestañas son las suyas.
      { key: 'conciliacion', labelKey: 'inmobiliaria.nav.conciliacion', href: r('/conciliacion'), icon: Bank, module: null, roles: CONTADOR_ROLES, scope: 'finanzas', agente: 'conciliacion' },
      // 🔴 El EQUIPO de pagos (Gabriela y sus cinco especialistas), no el
      // módulo de la plata: «Pagos», en Dinero, sigue siendo la pantalla del
      // ERP con sus dos caras. Se llama «Agente de pagos» porque dos filas
      // «Pagos» en el mismo menú no se distinguen, y porque el resto de la
      // sección nombra la TAREA y no a la persona (Cobranza, no Salomé): la
      // única tarea que describe a este equipo, «pagos», ya la usa el ERP.
      //
      // Sin `agente`: no es una Sala. Su Sala —el tercer renglón de Pagos— se
      // retiró el 2026-09-16 y lo que tenía vivo se mudó (fallidos y
      // recordatorios a Cobranza, por aprobar a Liquidaciones); esta pantalla
      // NO lo repite. Dice qué hace cada especialista, qué está encendido y
      // qué falta, y se prende sola cuando el micro publique su tablero
      // (`app/panel/inmobiliaria/pagos/agente/page.tsx`).
      //
      // El gate es el de aquella Sala: ADMIN y CONTADOR, encuadre de finanzas.
      { key: 'agente-de-pagos', labelKey: 'inmobiliaria.nav.agenteDePagos', href: r('/pagos/agente'), icon: HandCoins, module: null, roles: CONTADOR_ROLES, scope: 'finanzas' },
      // Venía de Reportes (`scope: 'general'` heredado): es cómo rinden los
      // agentes de arriba, por eso cierra la sección.
      { key: 'desempeno-ia', labelKey: 'inmobiliaria.nav.desempenoIa', href: r('/reportes/ia'), icon: ChartLineUp, module: 'analytics', scope: 'general' },
    ],
  },

  // ── CAPTACIÓN Y ARRIENDO ── conseguir inmuebles y estudiar candidatos. El
  // contrato que sale de acá ya se vive en Operación (Nico, 2026-09-12).
  {
    key: 'captacion',
    labelKey: 'inmobiliaria.nav.secCaptacion',
    modulos: [
      {
        key: 'pipeline', labelKey: 'inmobiliaria.nav.pipelineCorto', href: r('/pipeline'), icon: Kanban, module: 'pipeline', scope: 'comercial',
        pantallas: [
          // 🔴 B-07 (18-09-2026): «informe por origen (leads y arriendos por
          // portal) para saber qué portal vale la pena pagar». Cuelga del
          // pipeline y NO de Reportes a propósito: la decide el comercial con
          // sus leads en la mano, y el asesor no tiene `reportes`.
          { labelKey: 'inmobiliaria.nav.origenesDeLeads', href: r('/pipeline/origenes'), icon: TrendUp, module: 'pipeline', scope: 'comercial' },
          // G-02 (18-09-2026): qué se le manda a cada lead y a quién le calza
          // un inmueble que se libera. Cuelga del pipeline porque la entrada es
          // un LEAD, no un inquilino con preferencias guardadas.
          { labelKey: 'inmobiliaria.nav.calceDeLeads', href: r('/pipeline/que-ofrecer'), icon: GitMerge, module: 'pipeline', scope: 'comercial' },
          // E-03 y D-02: las visitas con lo que les falta (asesor y aviso al
          // inquilino). Va acá y no en Agenda porque lo que se hace en esta
          // pantalla es trabajo COMERCIAL sobre prospectos; la agenda sigue
          // siendo el calendario.
          { labelKey: 'inmobiliaria.nav.visitasDelPipeline', href: r('/pipeline/preparar-visitas'), icon: CalendarCheck, module: 'pipeline', scope: 'comercial' },
        ],
      },
      // Agenda estaba en Operación y se mudó acá (Nico, 2026-09-12: «Agenda
      // interna: la sección de agenda la debemos llevar para la sección de
      // captación y arriendo»). Va detrás de Pipeline porque lo que llena la
      // agenda son las VISITAS del prospecto —«Pedir cita» pide el nombre del
      // prospecto y la propiedad—: primero el prospecto, después la cita, y
      // recién ahí el inmueble que se le muestra y la postulación que firma.
      // Conserva su `module: 'operaciones'` y su `scope: 'administracion'`:
      // cambiar de grupo no le abre la pantalla a nadie que no la tuviera ni
      // se la cierra a quien la tenía (ver la regla al principio del archivo).
      // Efecto colateral asumido: la barra inferior del móvil muestra las 5
      // primeras filas navegables (`MobileNavBar`), así que Agenda entra ahí y
      // Postulaciones pasa al «más». Ninguna puerta se pierde —el sheet las
      // lista todas— y mover la fila sin mover el móvil sería tener dos menús
      // que no coinciden.
      // 🔴 Desde el 17-09-2026 la agenda también es del ASESOR COMERCIAL
      // (`pipeline`): lo que la llena son las visitas de sus prospectos. El back
      // le muestra sólo visitas y tareas si no ve contratos. `scope: 'comercial'`
      // sumado a lo que ya tenía: el encuadre por rol la sigue dejando al
      // contador (administración) y al asesor (comercial).
      { key: 'agenda', labelKey: 'inmobiliaria.nav.agenda', href: r('/agenda'), icon: CalendarBlank, module: 'operaciones', modulos: ['operaciones', 'pipeline'], scope: 'administracion' },
      // Avalúos se mudó a «Agentes IA» (2026-09-16): Inmuebles se queda sin
      // secciones y `SeccionesDelModulo` no dibuja el riel de una sola card.
      { key: 'inmuebles', labelKey: 'inmobiliaria.nav.inmuebles', href: r('/inmuebles'), icon: Buildings, module: 'portafolio', scope: 'comercial', dataTourTarget: 'sidebar-inmuebles' },
      // «Se publica y despublica desde Leasefy con las cuentas que cada
      // inmobiliaria ya paga, mostrando el estado de cada publicación» (Nico,
      // 17-09-2026). Hoy ningún portal de afuera publica solo y la pantalla lo
      // dice sin rodeos.
      //
      // 🔴 Va como FILA hermana de Inmuebles y NO como su sub-pantalla:
      // `SeccionesDelModulo` no dibuja el riel con una sola card (decisión del
      // 2026-09-16), así que una única sub-pantalla quedaría inalcanzable desde
      // el menú. Mismo `module` y mismo `scope`: no abre ni cierra puertas.
      // 🔴 22-09 · PORTALES SALE DEL MENÚ (Nico): «para qué es eso si no
      // tenemos integración directa». Tiene razón: la pantalla registra en qué
      // portal quedó cada inmueble, pero el aviso lo sube una persona a mano —
      // la propia pantalla lo dice («todavía no publicamos solos en ninguno»).
      // Un módulo en el menú promete que el producto hace ese trabajo.
      //
      // 🔴 La RUTA se queda viva a propósito: `/inmuebles/portales` responde
      // igual que antes, para no dejar un 404 a quien la tenga guardada. Lo
      // que se retira es la promesa del menú.
      //
      // Qué hay construido y qué haría falta para prenderla:
      // `docs/portales-de-publicacion.md`.
      {
        key: 'postulaciones', labelKey: 'inmobiliaria.nav.postulaciones', href: r('/postulaciones'), icon: ClipboardText, module: 'portafolio', scope: 'comercial', ia: true, dataTourTarget: 'sidebar-postulaciones',
        // Matching y Asegurabilidad se mudaron a «Agentes IA» (2026-09-16).
        // Queda Soportes, que está ASISTIDA por IA pero no es un agente.
        pantallas: [
          // Evaluación de candidatos (el agente `estudio`) está OCULTA por ahora
          // (Nico, 2026-09-08: «esta sección de evaluación de candidatos ocúltala
          // por ahora»). Las páginas siguen vivas bajo `postulaciones/estudio/` y
          // su `layout.tsx` devuelve a Postulaciones a quien entre por la URL.
          // Para reactivarla: es un agente, así que va como fila de «Agentes
          // IA» (con `scope: 'comercial'`), más el import de `ShieldCheck`, el
          // workspace en `agentWorkspaceNav.ts`, la fila del buscador
          // (`navigation-source.ts`) y borrar ese layout (el test exige las dos
          // puertas).
          // { key: 'estudio', labelKey: 'inmobiliaria.ai.nav.estudio', href: r('/postulaciones/estudio'), icon: ShieldCheck, module: 'estudio', scope: 'comercial', agente: 'estudio' },
          // Era una fila de Administración (la ve el CONTADOR); conserva ese encuadre.
          // 🔴 F-05 (18-09-2026): «los requisitos por tipo de inquilino los
          // define cada inmobiliaria». Se LEE con `pipeline` (el asesor tiene
          // que saber qué papeles pedir) y se EDITA con `configuracion:edit`,
          // que la pantalla verifica y el back exige de nuevo.
          { labelKey: 'inmobiliaria.nav.requisitosDePostulacion', href: r('/postulaciones/requisitos'), icon: Files, module: 'pipeline', scope: 'comercial' },
          // F-07: el canal del candidato rechazado para pedir detalle o
          // corregir un dato. Nunca se le dice el puntaje.
          { labelKey: 'inmobiliaria.nav.reclamosDeCandidatos', href: r('/postulaciones/reclamos'), icon: ChatCircleText, module: 'pipeline', scope: 'comercial' },
          { labelKey: 'inmobiliaria.nav.soportesCorto', href: r('/postulaciones/soportes'), icon: ListChecks, module: 'documentos', scope: 'administracion', ia: true },
        ],
      },
    ],
  },

  // ── OPERACIÓN ── el contrato firmado y todo lo que lo sostiene vivo.
  {
    key: 'operacion',
    labelKey: 'inmobiliaria.nav.secOperacionDelContrato',
    modulos: [
      {
        // 🔴 Nico, 2026-09-12: «Contratos va dentro de OPERACIÓN». Vivía en
        // Captación y arriendo porque ahí se firma; pero un contrato se OPERA
        // —cobros, mantenimientos, renovación— mucho más tiempo del que se
        // firma, y la fila va con lo que se opera. Conserva `module`, `roles`
        // y `scope`: cambiar de grupo no abre ni cierra pantallas a nadie.
        // 'contratos' es su propia AGENCY_MODULES key (todos los roles la tienen).
        key: 'contratos', labelKey: 'inmobiliaria.nav.contratos', href: r('/contratos'), icon: FilePlus, module: 'contratos', scope: 'administracion', dataTourTarget: 'sidebar-contratos',
        pantallas: [
          { labelKey: 'inmobiliaria.nav.renovaciones', href: r('/contratos/renovaciones'), icon: ArrowsClockwise, module: 'operaciones' },
          // A-13: la invitación a firmar vence a los 7 días. Acá se ve qué
          // recordatorio toca y qué se venció — y que el inmueble SIGUE
          // reservado hasta que alguien cancele.
          { labelKey: 'inmobiliaria.nav.invitacionesAFirmar', href: r('/contratos/firmas'), icon: Signature, module: 'contratos' },
          // 🔴 18-09-2026: las cláusulas propias de la inmobiliaria. Va como
          // SECCIÓN de Contratos y no como fila: Contratos ya tiene riel, y
          // una cláusula sólo tiene sentido dentro de un contrato.
          { labelKey: 'inmobiliaria.nav.clausulasPropias', href: r('/contratos/clausulas'), icon: Scroll, module: 'contratos' },
          // Retención (el agente Laura: tablero, riesgo de salida y decisiones
          // por aprobar) NO está en el catálogo a propósito: no va a producción
          // todavía (Nico, 2026-09-03). Las tres rutas siguen existiendo bajo
          // `contratos/(retencion)/` y sólo se alcanzan escribiendo la URL.
        ],
      },
      // Sin `ia: true` ni la pantalla «Tickets»: el agente de mantenimiento
      // (bandeja de tickets, resumen, ficha) es mock-first y el micro no tiene
      // su endpoint (`/api/agency/:id/mantenimiento/inbox` no existe). Con
      // `NEXT_PUBLIC_USE_MOCK_API=false` la bandeja quedaba vacía o en error.
      // NO está en el catálogo a propósito: no va a producción todavía
      // (Nico, 2026-09-03: «¿qué es eso de tickets? no veo que funcione»).
      // Las rutas `mantenimientos/tickets/*` siguen existiendo para cuando el
      // micro lo sirva; el workspace está apagado en `agentWorkspaceNav.ts`.
      { key: 'mantenimientos', labelKey: 'inmobiliaria.nav.mantenimientos', href: r('/mantenimientos'), icon: Wrench, module: 'operaciones', scope: 'administracion' },
      // 🔴 H-04 (18-09-2026): el registro de proveedores. Va como FILA y no
      // como sub-pantalla de Mantenimientos porque el riel no se dibuja con
      // una card sola: quedaría inalcanzable desde el menú. Mismo criterio
      // que «Portales» con Inmuebles.
      { key: 'proveedores', labelKey: 'inmobiliaria.nav.proveedores', href: r('/mantenimientos/proveedores'), icon: Toolbox, module: 'operaciones', scope: 'administracion' },
      { key: 'solicitudes', labelKey: 'inmobiliaria.nav.solicitudes', href: r('/solicitudes'), icon: Lifebuoy, module: 'operaciones', scope: 'administracion', ia: true, hintKey: 'inmobiliaria.nav.pqrs' },
      // `roles` y no `module`: no hay llave de AGENCY_MODULES para mensajes, y
      // la pantalla se cierra por rol (`AgencyRoleGuard allowed="managers"`).
      { key: 'mensajes', labelKey: 'inmobiliaria.nav.mensajes', href: r('/mensajes'), icon: Chat, module: null, roles: GESTION_ROLES, scope: 'administracion' },
    ],
  },

  // ── DINERO ── cobrar, pagar, facturar, conciliar, contabilizar.
  {
    key: 'dinero',
    labelKey: 'inmobiliaria.nav.secDinero',
    modulos: [
      {
        // ── UN SOLO MÓDULO DE PLATA (Nico + CEO, 2026-09-15) ──────────────
        //
        // Había DOS filas para lo mismo: «Cobros» (Recaudo · Cartera ·
        // Cobranza) y «Pagos» (Liquidaciones · Dispersiones), más una pestaña
        // «Cobros a inquilinos» DENTRO de Pagos que no era más que una maqueta
        // con un enlace a la tabla de Cobros. Nico, mirando el sidebar: «hay
        // dos cosas de lo mismo, que son Cobros y uno en Pagos y el otro en
        // Cobros […] creo que dijo que se fuera lo de Cobros, porque todo
        // funciona alrededor del estado de cuenta del contrato».
        //
        // Y el CEO: «yo le pondría de una vez lo que es inquilinos —recibos de
        // caja, facturación general— y dispersión a propietarios, todo en un
        // solo módulo».
        //
        // El porqué de fondo: la deuda NACE CON EL CONTRATO y vive en su
        // estado de cuenta (`back-erp/docs/pagos-conciliacion-dispersion-plan.md`).
        // El cobro del mes no crea la deuda: es el DOCUMENTO con el que
        // finanzas reclama una parte de ella, y lo decide una persona mirando
        // la cartera. Un documento no es un módulo del sidebar: la lista de
        // cobros emitidos es hoy una pestaña de Cartera
        // (`/pagos/cartera/cobros`, `components/cartera/PestanasDeCartera.tsx`).
        //
        // Queda UN módulo con DOS CARAS de la misma plata:
        //   · inquilinos   — lo que ENTRA: la deuda del mes (la raíz),
        //                    recaudo y cartera (la cobranza, que persigue la
        //                    cartera, es un agente y vive en «Agentes IA»).
        //   · propietarios — lo que SALE: liquidaciones y dispersiones.
        //
        // 🔴 La raíz ES de la cara inquilinos (Nico, 2026-09-16). Era la Sala
        // del agente de Pagos y por eso no tenía cara: aparecía como primera
        // card en las DOS. Pero lo que pinta hoy es `DeudaDelMesPanel` —las
        // cuotas que deben los inquilinos este mes—, así que elegir
        // «Propietarios» y encontrarse esa pantalla era el mismo defecto que
        // Nico venía señalando, un piso más abajo. El agente se fue con su
        // renglón de pestañas (NOTA al pie de `agentWorkspaceNav.ts`).
        //
        // 🔴 PERMISOS — lo que NO cambió, y por qué nadie gana ni pierde:
        // cada pantalla conserva EXACTAMENTE el `module`/`roles` que tenía
        // como fila propia. Recaudo y Cartera siguen pidiendo `cobros`,
        // Dispersiones `dispersiones`, y la raíz y
        // Liquidaciones siguen siendo sólo ADMIN y CONTADOR. Quien tenía
        // `cobros` pero no es contador NO pierde su trabajo: la raíz no le
        // pasa el gate, pero `resolverEntradaDeModulo` (sidebar-del-panel.ts)
        // baja por las pestañas y le abre la fila en la primera que sí le
        // pasa —Recaudo—, heredando su gate y su encuadre. Y no gana
        // dispersión: la card de Liquidaciones y la de Dispersiones las filtra
        // `SeccionesDelModulo` con el mismo `pasaGateDeFila`, y cada página
        // tiene además su `PageGuard`.
        //
        // 🔴 SIN `ia: true` y SIN `agente` (Nico, 2026-09-16: «no debe
        // llamarse Pagos IA»). Primero se le quitó la píldora —anuncia «acá
        // hay un agente trabajando», y este módulo es LA PLATA de la
        // inmobiliaria: la deuda de cada contrato, lo que entra de los
        // inquilinos y lo que sale a los propietarios—. Al día siguiente se
        // fue también el `agente`, porque mientras estuviera la raíz seguía
        // siendo una Sala y seguía dibujando el tercer renglón de pestañas que
        // contradecía a las caras. Las nueve pantallas de esa Sala están
        // repartidas o retiradas, una por una, en la NOTA al pie de
        // `agentWorkspaceNav.ts`. El equipo de agentes de pagos tiene hoy su
        // propia fila en «Agentes IA» («Agente de pagos»), con otro nombre.
        //
        // 🔴 Cobranza ya NO es una sección de acá: se mudó a «Agentes IA» el
        // 2026-09-16, con su URL intacta. Desde Cartera —que es lo que la
        // cobranza persigue— se llega con un enlace (`IrALaCobranza`), no con
        // una card: una sala la reclama un solo lugar.
        key: 'pagos', labelKey: 'inmobiliaria.ai.nav.pagos', labelEnElRielKey: 'inmobiliaria.nav.deudaDelMes', href: r('/pagos'), icon: CurrencyDollar, module: null, roles: CONTADOR_ROLES, scope: 'finanzas', cara: 'inquilinos', dataTourTarget: 'sidebar-pagos',
        pantallas: [
          // Lo que ENTRA (cara inquilinos).
          { labelKey: 'inmobiliaria.nav.recaudo', href: r('/pagos/recaudo'), icon: Coins, module: 'cobros', cara: 'inquilinos' },
          // El recaudo por convenio con el banco SÍ es de la cara inquilinos:
          // importar el archivo del banco termina en recibos de caja, y por eso
          // pide `cobros` como Recaudo y Cartera, no `dispersiones`.
          { labelKey: 'inmobiliaria.nav.recaudoBancario', href: r('/pagos/recaudo-bancario'), icon: Bank, module: 'cobros', cara: 'inquilinos' },
          { labelKey: 'inmobiliaria.nav.cartera', href: r('/pagos/cartera'), icon: CurrencyCircleDollar, module: 'cobros', cara: 'inquilinos' },
          // Lo que SALE (cara propietarios). Las facturas de proveedor (CxP)
          // cuelgan de Liquidaciones: hoy no tienen listado propio, y no se
          // inventa uno.
          { labelKey: 'inmobiliaria.nav.liquidaciones', href: r('/pagos/liquidaciones'), icon: Wallet, module: null, roles: CONTADOR_ROLES, cara: 'propietarios' },
          { labelKey: 'inmobiliaria.nav.dispersiones', href: r('/pagos/dispersiones'), icon: PaperPlaneTilt, module: 'dispersiones', cara: 'propietarios' },
          // 🔴 Lo que está EN LA CUENTA (cara tesorería) — Nico, 18-09 de
          // noche. Estas cuatro pantallas existían desde el 17 y el 18 pero
          // nunca entraron a la navegación: vivían como cinco enlaces azules
          // apretados a la derecha del título de `/pagos` («esos links que
          // están al lado derecho menos se entienden, ¿eso es como tabs?
          // porque está a nivel de UX muy mal logrado»). Tenían razón en las
          // dos cosas: parecían pestañas y no lo eran, y eran pantallas de
          // pleno derecho escondidas en una esquina.
          //
          // Son una TERCERA cara y no un revoltijo: las tres hablan de plata
          // que está en la cuenta y todavía no es de nadie —el cuadre («es
          // plata de propietarios e inquilinos»), el traslado («es plata de
          // propietarios e inquilinos hasta que se separa la comisión») y lo
          // pendiente de aplicar («es plata de un tercero hasta que se aplica
          // o se devuelve»)—, y por eso las tres piden `dispersiones`.
          { labelKey: 'inmobiliaria.nav.cuadre', href: r('/pagos/cuadre'), icon: Scales, module: 'dispersiones', cara: 'tesoreria' },
          { labelKey: 'inmobiliaria.nav.trasladoComision', href: r('/pagos/traslados'), icon: ArrowsLeftRight, module: 'dispersiones', cara: 'tesoreria' },
          { labelKey: 'inmobiliaria.nav.pendientesDeAplicar', href: r('/pagos/pendientes'), icon: HourglassMedium, module: 'dispersiones', cara: 'tesoreria' },
          // 🔴 SIN `cara`: el tablero financiero mira las TRES —lo que entra,
          // lo que deben, lo que sale y lo que queda—, así que se dibuja en
          // los tres rieles, primero y separado por una línea. Es la única
          // excepción legítima a «toda pantalla tiene cara» (ver el comentario
          // de `CaraDeLaPlata`): una pantalla sin cara que en realidad sea de
          // una sola es el defecto que Nico venía señalando.
          { labelKey: 'inmobiliaria.nav.tableroFinanciero', href: r('/pagos/tablero'), icon: ChartLineUp, module: 'dashboard' },
        ],
      },
      { key: 'facturacion', labelKey: 'inmobiliaria.nav.facturacion', href: r('/facturacion'), icon: Receipt, module: null, roles: CONTADOR_ROLES, scope: 'finanzas' },
      // Conciliación (la Sala de su agente) se mudó a «Agentes IA» el 2026-09-16.
      { key: 'contabilidad', labelKey: 'inmobiliaria.nav.contabilidadCorta', href: r('/contabilidad'), icon: Calculator, module: null, roles: CONTADOR_ROLES, scope: 'finanzas' },
      // 🔴 NÓMINA es un módulo de PAGO (Nico, 17-09): `moduloPago` hace que la
      // fila no exista para quien no lo compró — ni siquiera un instante mientras
      // cargan los permisos, porque el gate falla cerrado. Y `CONTADOR_ROLES`
      // porque «la ven sólo administrador y contador».
      { key: 'nomina', labelKey: 'inmobiliaria.nav.nomina', href: r('/nomina'), icon: IdentificationBadge, module: null, roles: CONTADOR_ROLES, scope: 'finanzas', moduloPago: 'nomina' },
    ],
  },

  // ── DIRECTORIO ── las fichas que se consultan (no los flujos que se trabajan).
  {
    key: 'directorio',
    labelKey: 'inmobiliaria.nav.secDirectorio',
    modulos: [
      { key: 'propietarios', labelKey: 'inmobiliaria.nav.propietarios', href: r('/propietarios'), icon: UserCircle, module: 'propietarios', scope: 'administracion' },
      // C-06 (18-09-2026): las listas restrictivas y la BANDEJA de terceros que
      // operan sin haberse verificado. Va como FILA y no como sub-pantalla de
      // Propietarios porque aplica a TODOS los terceros —propietarios,
      // inquilinos, codeudores y proveedores—, y colgarla de uno solo la
      // escondería para los demás. `module: 'clientes'`, que es el permiso con
      // el que se crean los terceros.
      { key: 'listas-restrictivas', labelKey: 'inmobiliaria.nav.listasRestrictivas', href: r('/clientes/listas'), icon: ShieldWarning, module: 'clientes', scope: 'administracion' },
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
        key: 'reportes', labelKey: 'inmobiliaria.nav.reportes', href: r('/reportes'), icon: ChartLine, module: 'reportes', scope: 'general', dataTourTarget: 'sidebar-reportes',
        pantallas: [
          // El «Dashboard» de siempre: KPIs del negocio. Es lectura, no portada
          // —la portada es Inicio—, así que vive con los reportes.
          { labelKey: 'inmobiliaria.nav.resumenDelNegocio', href: r('/reportes/resumen'), icon: SquaresFour, module: 'dashboard' },
          { labelKey: 'inmobiliaria.nav.rentabilidad', href: r('/reportes/rentabilidad'), icon: TrendUp, module: 'reportes' },
          // «Desempeño IA» se mudó a «Agentes IA» el 2026-09-16, con su URL.
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
 * Están acá —y no sueltas en un test— porque las tablas de redirecciones
 * necesitan saber que su destino es legítimo aunque no esté en el árbol.
 *
 *   · **Configuración** — se abre desde el menú del perfil (Nico, 2026-09-03:
 *     «de la sidebar deberíamos quitar eso de Configuración»).
 *   · **Estado de cuenta** — 🔴 no puede ser una fila porque NO es una
 *     pantalla, es un DOCUMENTO de un cliente: su ruta pide un id
 *     (`/estado-de-cuenta/inquilino/<ref>`, `/estado-de-cuenta/propietario/<id>`)
 *     y no existe «el estado de cuenta» sin decir de quién. Se entra desde
 *     donde está el cliente: la fila de la deuda del mes en `/pagos`, las dos
 *     lecturas de Cartera que listan clientes, la ficha del inquilino, la del
 *     propietario y la del contrato.
 *
 *     Está declarada acá porque hasta el 2026-09-16 era CASI huérfana: su
 *     única puerta era la tarjeta resumida de las fichas (`ResumenEnLaFicha`,
 *     que además se calla si el resumen no carga) y ninguna pantalla del
 *     módulo de la plata llevaba a ella. Ésa es exactamente la clase de hueco
 *     que este archivo tiene que delatar. Nico, repetido: «todo funciona
 *     alrededor del estado de cuenta del contrato».
 */
export const RUTAS_FUERA_DEL_SIDEBAR: readonly string[] = [
  `${PANEL}/configuracion`,
  `${PANEL}/estado-de-cuenta`,
];

/** Todos los módulos, en orden de sidebar. */
export function modulosDelPanel(): ModuloDelPanel[] {
  return ARQUITECTURA_DEL_PANEL.flatMap((g) => g.modulos);
}

/**
 * Las pestañas de un módulo: su raíz primero, luego sus pantallas.
 *
 * La raíz es EXACTA (en `/contratos/7` ninguna pestaña está activa y la barra
 * no se dibuja: la ficha ya trae su cabecera) salvo cuando la raíz es la Sala
 * de un agente —las filas de «Agentes IA» con `agente`—: ahí todo lo que
 * cuelga del agente la deja activa. Pagos dejó de serlo el 2026-09-16, así que
 * su raíz volvió a ser exacta y su ficha de caso (`/pagos/<id>`) no marca
 * ninguna pestaña, como cualquier otra ficha del panel.
 *
 * 🔴 La `cara` viaja con la raíz. Sin esto, la raíz de un módulo con dos caras
 * no sería de ninguna y se dibujaría en las dos — que es exactamente lo que
 * hacía `/pagos`, siendo la deuda de los inquilinos.
 *
 * Nota: una ficha que cuelga de una HERMANA sí deja esa hermana marcada —la
 * cuenta de cobro (`/pagos/cartera/cobros/7/cuenta-de-cobro`) deja «Cartera»
 * activa—. Es correcto: la ficha vive dentro de esa sección, y la franja
 * igual no se imprime (`print:hidden` en `BarraDePestanas`).
 */
export function pestanasDelModulo(m: ModuloDelPanel): PantallaDelPanel[] {
  const raiz: PantallaDelPanel = {
    labelKey: m.labelEnElRielKey ?? m.labelKey,
    href: m.href,
    icon: m.icon,
    module: m.module,
    modulos: m.modulos,
    roles: m.roles,
    scope: m.scope,
    ia: m.ia,
    agente: m.agente,
    cara: m.cara,
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

/**
 * El módulo dueño de una ruta (el de href más largo que sea prefijo).
 *
 * 🔴 Es lo que sostiene que las salas de «Agentes IA» conserven su URL: en
 * `/pagos/cobranza/deudores/1` calzan Pagos (`/pagos`) y Cobranza
 * (`/pagos/cobranza`), y gana Cobranza por ser la más larga. Sin esta regla,
 * entrar a la sala se vería dentro de Pagos.
 */
export function moduloDeLaRuta(pathname: string): ModuloDelPanel | null {
  const ruta = sinQuery(pathname);
  const candidatos = modulosDelPanel().filter((m) => ruta === m.href || ruta.startsWith(`${m.href}/`));
  if (candidatos.length === 0) return null;
  return candidatos.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

/** El grupo del sidebar al que pertenece un módulo (null si no está en el árbol). */
export function grupoDelModulo(modulo: ModuloDelPanel): GrupoDelPanel | null {
  return ARQUITECTURA_DEL_PANEL.find((g) => g.modulos.some((m) => m.key === modulo.key)) ?? null;
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
