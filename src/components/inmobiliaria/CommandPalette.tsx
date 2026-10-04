'use client';

/**
 * CommandPalette — el ⌘K del panel de inmobiliaria.
 *
 * ── Historia corta
 *  · 03-09 (Nico: «mira este buscador como quedó de feo»): se pasó a una sola
 *    columna de 640 px, sin chevrons que no eran controles y con «Novedades»
 *    traducidas (`audit-event-labels`).
 *  · 02-10 (Nico: «quiero algo hermoso»): este rediseño. La guía es el menú
 *    flotante y el modal del sistema de diseño de referencia
 *    (`SaleADS-projects/chat`, `chat-v2/live/Menu.tsx` y `Modal.tsx`, la
 *    misma fuente de la llegada del chat), hablado con los tokens de Leasefy:
 *      - cada opción es un ÍCONO EN SU CUADRITO, un título y una línea de
 *        apoyo; la hora va a la derecha, arriba (`cuando`);
 *      - el elegido lleva un tinte NEUTRO (tinta al 6–7 %, `surface-selected`)
 *        que se desliza de fila en fila (`layoutId`), no un azul saturado;
 *      - la caja entra subiendo un poco y creciendo de 0,97 a 1 con un resorte
 *        sin rebote, y sale más rápido de lo que entra; el fondo se desenfoca
 *        (velo tinta de §41 + 6 px de blur);
 *      - pie con las teclas en `kbd`.
 *    Además: lo escrito se resalta en cada resultado (sin tildes ni
 *    mayúsculas, `tramos-de-coincidencia`), los estados cargando y vacío
 *    tienen forma, y las Novedades repetidas se juntan en una sola fila con
 *    «3 veces» (`novedades-del-buscador`).
 *
 * ── Qué NO cambió
 *  Qué se busca (las mismas fuentes federadas, con sus permisos), las cinco
 *  acciones rápidas y a dónde lleva cada una.
 *
 * ── Teclado
 *  ↑ / ↓   mueven la fila activa sobre TODAS las filas navegables — también
 *          las acciones rápidas del estado vacío.
 *  ↵       router.push(href) + cerrar
 *  esc     cerrar (Radix + el atajo del layout)
 *  El foco se queda en el campo; la fila activa se anuncia con
 *  `aria-activedescendant` (patrón combobox + listbox).
 *
 * ── Movimiento (Nico, 02-10: «cada interacción con su animación», framer-motion)
 *  El `DialogContent` de Radix queda como un MARCO invisible a pantalla
 *  completa (foco atrapado, Esc, `role=dialog`); el velo y la caja los dibuja
 *  y anima framer-motion adentro. Para que la caja pueda SALIR animada, el
 *  diálogo sigue abierto (`montada`) hasta que `AnimatePresence` termina la
 *  salida; recién ahí Radix desmonta. Las animaciones CSS del panel y del velo
 *  de Cadence (`animate-dialog-*`) se apagan con `!animate-none`.
 *    · caja: entra subiendo 8 px y creciendo de 0,98 a 1; sale más rápido;
 *    · velo: fundido;
 *    · filas, grupos, novedades, vacío y cargando: entran con fundido y 4 px
 *      de subida, en escalera corta; la fila que ya estaba no se vuelve a
 *      animar al seguir escribiendo (misma `key`);
 *    · lupa ↔ cargando, la ✕ de limpiar y el ↵ de la fila activa: fundidos.
 *  Sólo `transform` y `opacity`. `MotionConfig reducedMotion="user"`: con
 *  «reducir movimiento» queda sólo el fundido. Los valores son PROVISIONALES
 *  (`MOVIMIENTO`), hasta que exista el sistema de movimiento de Cadence.
 *  La caja se centra con `mx-auto`, nunca con `-translate-x-1/2`: el
 *  `transform` es de la animación.
 *
 * ── Lenis
 *  `SmoothScroll` frena Lenis mientras haya un `[role=dialog][data-state=open]`
 *  en el DOM (es lo que pone Radix), y la lista lleva `data-lenis-prevent` +
 *  `overscroll-contain` para que la rueda la mueva a ella y no a la página.
 */

import { useRef, useState, useEffect, useCallback, useMemo, useId } from 'react';
import type { FC, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import {
  MagnifyingGlass,
  ArrowUp,
  ArrowDown,
  ArrowElbowDownLeft,
  ChatCircleText,
  FileText,
  ChartLineUp,
  House,
  Plus,
  X,
  Robot,
  HandPalm,
  Phone,
  CurrencyDollar,
  Scales,
  UserCircle,
  Bell,
} from '@phosphor-icons/react';

import { AspaDeCierre, Dialog, DialogBody, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  IconButton,
  Kbd,
  motionDistance,
  motionDuration,
  motionEase,
  motionSpring,
  motionStagger,
  motionTransition,
} from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import { useCommandPalette } from '@/lib/context/CommandPaletteContext';
import { useFederatedSearch } from '@/lib/hooks/useFederatedSearch';
import type { SearchResult, SearchSource, SearchSourceContext } from '@/lib/hooks/useFederatedSearch';
import { navigationSource } from '@/lib/search/sources/navigation-source';
import { debtorsSource } from '@/lib/search/sources/debtors-source';
import { propietariosSource } from '@/lib/search/sources/propietarios-source';
import { agentesSource } from '@/lib/search/sources/agentes-source';
import { propiedadesSource } from '@/lib/search/sources/propiedades-source';
import { contratosSource } from '@/lib/search/sources/contratos-source';
import { cotizacionesSource } from '@/lib/search/sources/cotizaciones-source';
import { apBillsSource } from '@/lib/search/sources/ap-bills-source';
import { useAuditLog, type AuditLogFilters } from '@/lib/hooks/cobranza/use-audit-log';
import { agruparNovedades, type FamiliaDeNovedad } from '@/lib/search/novedades-del-buscador';
import { tramosDeCoincidencia } from '@/lib/search/tramos-de-coincidencia';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────────────────────
// Piezas de una fila
// ──────────────────────────────────────────────────────────────────────────────

type IconoDeFila = FC<{ className?: string }>;

type ColorDeChip = NonNullable<SearchResult['badges']>[number]['color'];

interface FilaNavegable {
  id: string;
  titulo: string;
  icono: IconoDeFila;
  href: string;
  /** Línea de apoyo: dirección, correo, sección, qué hace la acción… */
  contexto?: string;
  /** Estado y cifras que ya trae la fuente (etapa, canon, rol…). */
  chips?: NonNullable<SearchResult['badges']>;
}

interface GrupoDeFilas {
  id: string;
  titulo: string;
  /** Sólo con búsqueda: el contador al lado del encabezado. */
  cantidad?: number;
  filas: FilaNavegable[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Movimiento — PROVISIONAL
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Los tiempos del buscador: los tokens del sistema de movimiento de Cadence
 * (03-10-2026; antes eran valores propios de 150–250 ms «hasta que el sistema
 * exista»). Entrar ≈ `base`, salir = `exit`, filas = `fast` + el escalón del
 * sistema (40 ms, con techo de 320 ms para la última).
 */
const MOVIMIENTO = {
  /** La caja al abrir: entrar, 200 ms. */
  cajaEntra: motionTransition.enter,
  /** La caja al cerrar: salir, 150 ms y acelerando. */
  cajaSale: motionTransition.exit,
  /** El velo, al abrir y al cerrar: 200 ms, curva estándar. */
  velo: { duration: motionDuration.base, ease: motionEase.standard },
  /** Una fila, un grupo o un estado que aparece: 150 ms, desacelera. */
  aparece: { duration: motionDuration.fast, ease: motionEase.enter },
  /** Cuánto espera cada fila a la anterior; la última nunca más del techo. */
  escalon: motionStagger.step,
  escalonMaximo: motionStagger.max,
  /** Fundidos chicos: lupa ↔ cargando, la ✕ de limpiar, el ↵. */
  cambio: { duration: motionDuration.fast, ease: motionEase.standard },
  /**
   * El resaltado de la fila activa: el resorte ágil del sistema SIN su rebote.
   * Con rebote la mancha se pasaba de la fila y volvía — se leía como un temblor.
   */
  resalte: { ...motionSpring.snappy, bounce: 0 },
} as const;

/** Lo que entra a la lista: 4 px de subida y fundido. */
const ENTRA_A_LA_LISTA = {
  initial: { opacity: 0, y: motionDistance.xs },
  animate: { opacity: 1, y: 0 },
} as const;

function retardoDeFila(posicion: number): number {
  return Math.min(Math.max(posicion, 0) * MOVIMIENTO.escalon, MOVIMIENTO.escalonMaximo);
}

/**
 * Un chip de color sólo para lo que es un ESTADO (aprobado, en mora, vencido).
 * Lo neutro —un canon, un rol, «3 prop»— es texto gris: pintarle una cápsula a
 * cada dato convierte la fila en un semáforo y deja de leerse.
 */
const FONDO_DE_CHIP: Record<Exclude<ColorDeChip, 'neutral'>, string> = {
  green: 'bg-success-soft text-success',
  amber: 'bg-warning-soft text-warning',
  red: 'bg-danger-soft text-danger',
  violet: 'bg-primary-soft text-primary',
};

function ChipDeFila({ label, color }: { label: string; color: ColorDeChip }) {
  if (color === 'neutral') {
    return (
      <span className="hidden flex-shrink-0 whitespace-nowrap text-caption text-fg-subtle sm:inline">{label}</span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex h-5 flex-shrink-0 items-center whitespace-nowrap rounded-full px-2 text-[11px] font-medium',
        FONDO_DE_CHIP[color],
      )}
    >
      {label}
    </span>
  );
}

function EncabezadoDeGrupo({ titulo, cantidad }: { titulo: string; cantidad?: number }) {
  return (
    <motion.div
      className="flex items-center gap-2 px-3 pb-1.5 pt-3"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={MOVIMIENTO.aparece}
    >
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle">{titulo}</span>
      {cantidad != null && (
        <span className="rounded-full bg-surface-muted px-1.5 py-px font-mono text-[10px] font-medium tabular-nums text-fg-muted">
          {cantidad}
        </span>
      )}
    </motion.div>
  );
}

/** El cuadrito del ícono (34 px y radio 11 en la referencia → 32 px y 10 acá). */
function CuadroDeIcono({ activo, children }: { activo?: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid h-8 w-8 flex-shrink-0 place-items-center rounded-[10px] border transition-colors duration-150',
        activo ? 'border-border bg-surface text-fg shadow-xs' : 'border-transparent bg-surface-muted text-fg-muted',
      )}
    >
      {children}
    </span>
  );
}

/** El título con lo escrito resaltado. */
function TituloResaltado({ texto, consulta }: { texto: string; consulta: string }) {
  const tramos = useMemo(() => tramosDeCoincidencia(texto, consulta), [texto, consulta]);
  return (
    <>
      {tramos.map((tramo, i) =>
        tramo.coincide ? (
          <mark key={i} className="rounded-[3px] bg-transparent font-semibold text-primary">
            {tramo.texto}
          </mark>
        ) : (
          <span key={i}>{tramo.texto}</span>
        ),
      )}
    </>
  );
}

/**
 * Filas fantasma mientras carga: la misma anatomía que una fila real (cuadro
 * + dos líneas, 52 px) para que el resultado no empuje la lista cuando llega.
 * Aparecen con 120 ms de espera: una respuesta rápida no alcanza a hacerlas
 * parpadear.
 */
function FilasFantasma({ cantidad }: { cantidad: number }) {
  const anchos = ['w-2/5', 'w-1/2', 'w-1/3', 'w-2/5'];
  return (
    <motion.div
      aria-hidden="true"
      data-testid="cp-cargando"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...MOVIMIENTO.aparece, delay: 0.12 }}
    >
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex h-[52px] items-center gap-3 px-3">
          <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-[10px] bg-surface-muted" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className={cn('h-3 animate-pulse rounded-full bg-surface-muted', anchos[i % anchos.length])} />
            <div className="h-2.5 w-1/4 animate-pulse rounded-full bg-surface-muted" />
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function FilaDeComando({
  fila,
  idOpcion,
  activa,
  posicion,
  consulta,
  onSelect,
  onHover,
  refDeFila,
}: {
  fila: FilaNavegable;
  idOpcion: string;
  activa: boolean;
  /** Lugar en la lista: decide la espera de la escalera de entrada. */
  posicion: number;
  consulta: string;
  onSelect: () => void;
  onHover: () => void;
  refDeFila?: (el: HTMLButtonElement | null) => void;
}) {
  const Icono = fila.icono;
  return (
    // allowlist: fila de un listbox ARIA (role="option", ref de scroll, foco
    // por aria-activedescendant) dentro de un combobox propio — cadence no
    // tiene primitiva de opción de listbox y un Button rompería el rol.
    <motion.button
      ref={refDeFila}
      id={idOpcion}
      type="button"
      role="option"
      aria-selected={activa}
      // El foco vive en el campo (combobox): las opciones no van en el Tab.
      tabIndex={-1}
      onClick={onSelect}
      // `mousemove` y no `mouseenter`: al bajar con el teclado la lista scrollea
      // bajo un puntero quieto y `mouseenter` le robaba el foco a la flecha.
      onMouseMove={onHover}
      initial={ENTRA_A_LA_LISTA.initial}
      animate={ENTRA_A_LA_LISTA.animate}
      transition={{ ...MOVIMIENTO.aparece, delay: retardoDeFila(posicion) }}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-[12px] px-3 text-left outline-none',
        fila.contexto ? 'h-[52px]' : 'h-11',
      )}
    >
      {activa && (
        <motion.span
          layoutId="cp-fila-activa"
          aria-hidden="true"
          className="absolute inset-0 rounded-[12px] bg-surface-selected"
          transition={MOVIMIENTO.resalte}
        />
      )}
      <CuadroDeIcono activo={activa}>
        <Icono className="h-4 w-4" />
      </CuadroDeIcono>
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg">
          <TituloResaltado texto={fila.titulo} consulta={consulta} />
        </span>
        {fila.contexto && (
          <span className="mt-0.5 block truncate text-caption text-fg-muted">{fila.contexto}</span>
        )}
      </span>
      {fila.chips?.slice(0, 2).map((chip, i) => (
        <span key={`${chip.label}-${i}`} className="relative">
          <ChipDeFila label={chip.label} color={chip.color} />
        </span>
      ))}
      {/* ↵ sólo en la activa (y sólo donde hay teclado): dice qué hace Enter
          sin poblar todas las filas de teclas. Texto, no ícono: la fila tiene
          un solo ícono, el de su cuadrito. Llega con un fundido y 2 px desde
          la izquierda, acompañando al resaltado. */}
      <motion.span
        aria-hidden="true"
        className="relative hidden md:inline-flex"
        initial={false}
        animate={activa ? { opacity: 1, x: 0 } : { opacity: 0, x: -2 }}
        transition={MOVIMIENTO.cambio}
      >
        <Kbd size="sm">↵</Kbd>
      </motion.span>
    </motion.button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Acciones rápidas — el estado vacío
// ──────────────────────────────────────────────────────────────────────────────

interface AccionRapida {
  id: string;
  labelKey: string;
  /** La línea de apoyo: qué hace, en cinco palabras. */
  detalleKey: string;
  icono: IconoDeFila;
  href: string;
  permission?: { module: string; action: string };
}

const ACCIONES_RAPIDAS: AccionRapida[] = [
  {
    // Consignación, no "Crear propiedad": una inmobiliaria nunca administra un
    // inmueble sin propietario, así que para ella entrar uno es siempre una
    // consignación. Esto apuntaba a `/publicar` —el formulario del propietario,
    // que no pide dueño, ni comisión, ni inventario— y dejaba una ficha a medias.
    id: 'qa-nueva-consignacion',
    labelKey: 'inmobiliaria.commandPalette.quickActions.nuevaConsignacion',
    detalleKey: 'inmobiliaria.commandPalette.quickActions.detalles.nuevaConsignacion',
    icono: Plus,
    href: '/panel/inmobiliaria/inmuebles/nuevo',
    permission: { module: 'portafolio', action: 'create' },
  },
  {
    id: 'qa-cobranza',
    labelKey: 'inmobiliaria.commandPalette.quickActions.cobranza',
    detalleKey: 'inmobiliaria.commandPalette.quickActions.detalles.cobranza',
    icono: ChatCircleText,
    href: '/panel/inmobiliaria/pagos/cobranza',
    permission: { module: 'cobranza', action: 'view' },
  },
  {
    id: 'qa-cotizador',
    labelKey: 'inmobiliaria.commandPalette.quickActions.cotizador',
    detalleKey: 'inmobiliaria.commandPalette.quickActions.detalles.cotizador',
    icono: FileText,
    href: '/panel/inmobiliaria/postulaciones/asegurabilidad',
    permission: { module: 'cotizador', action: 'view' },
  },
  {
    id: 'qa-reportes',
    labelKey: 'inmobiliaria.commandPalette.quickActions.reportes',
    detalleKey: 'inmobiliaria.commandPalette.quickActions.detalles.reportes',
    icono: ChartLineUp,
    href: '/panel/inmobiliaria/reportes',
    permission: { module: 'reportes', action: 'view' },
  },
  {
    id: 'qa-portafolio',
    labelKey: 'inmobiliaria.commandPalette.quickActions.portafolio',
    detalleKey: 'inmobiliaria.commandPalette.quickActions.detalles.portafolio',
    icono: House,
    href: '/panel/inmobiliaria/inmuebles',
    permission: { module: 'portafolio', action: 'view' },
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Novedades — el audit log del agente, dicho en español y sin copias
// ──────────────────────────────────────────────────────────────────────────────

/** Constante de módulo: un `{}` nuevo por render haría latir el hook. */
const SIN_FILTROS: AuditLogFilters = {};

const NOVEDADES_VISIBLES = 5;

const ICONO_DE_FAMILIA: Record<FamiliaDeNovedad, IconoDeFila> = {
  retenida: HandPalm,
  piloto: Robot,
  llamada: Phone,
  mensaje: ChatCircleText,
  dinero: CurrencyDollar,
  legal: Scales,
  persona: UserCircle,
  general: Bell,
};

function Novedades() {
  const { t, locale } = useI18n();
  const { items, isLoading, error } = useAuditLog(SIN_FILTROS);

  const novedades = useMemo(
    () => agruparNovedades(items, locale === 'en' ? 'en' : 'es', { maximo: NOVEDADES_VISIBLES }),
    [items, locale],
  );

  // El feed es informativo: si el endpoint falla, el buscador no es el lugar
  // para contarlo (y una fila de error ahí es ruido en el gesto de escribir).
  if (error) return null;

  return (
    <section aria-label={t('inmobiliaria.commandPalette.novedades')} className="mt-1">
      <EncabezadoDeGrupo titulo={t('inmobiliaria.commandPalette.novedades')} />
      {isLoading ? (
        <FilasFantasma cantidad={2} />
      ) : novedades.length === 0 ? (
        <motion.p
          className="px-3 pb-2 pt-1 text-caption text-fg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={MOVIMIENTO.aparece}
        >
          {t('inmobiliaria.commandPalette.novedadesEmpty')}
        </motion.p>
      ) : (
        <ul>
          {novedades.map((novedad, i) => {
            const Icono = ICONO_DE_FAMILIA[novedad.familia];
            const apoyo = [
              novedad.contexto,
              novedad.veces > 1 ? t('inmobiliaria.commandPalette.veces', { n: novedad.veces }) : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              // Fila de lectura, no un control: no lleva hover ni cursor de mano
              // porque no hay adónde ir (el audit log completo vive en Cobranza).
              // Entra en escalera DESPUÉS de las acciones rápidas (5 + i).
              <motion.li
                key={novedad.clave}
                className="flex min-h-[52px] items-center gap-3 px-3 py-1.5"
                initial={ENTRA_A_LA_LISTA.initial}
                animate={ENTRA_A_LA_LISTA.animate}
                transition={{ ...MOVIMIENTO.aparece, delay: retardoDeFila(ACCIONES_RAPIDAS.length + i) }}
              >
                <CuadroDeIcono>
                  <Icono className="h-4 w-4" />
                </CuadroDeIcono>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg" title={novedad.titulo}>
                    {novedad.titulo}
                  </span>
                  {apoyo && <span className="mt-0.5 block truncate text-caption text-fg-muted">{apoyo}</span>}
                </span>
                <span className="flex-shrink-0 self-start whitespace-nowrap pt-1.5 text-caption text-fg-subtle">
                  {novedad.cuando}
                </span>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Pie
// ──────────────────────────────────────────────────────────────────────────────

function Atajo({ teclas, texto }: { teclas: ReactNode[]; texto: string }) {
  return (
    <span className="flex items-center gap-1.5 text-caption text-fg-subtle">
      {teclas.map((tecla, i) => (
        <Kbd key={i} size="sm">
          {tecla}
        </Kbd>
      ))}
      <span className="ml-0.5">{texto}</span>
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// La paleta
// ──────────────────────────────────────────────────────────────────────────────

/**
 * El `DialogContent` de Radix como MARCO: a pantalla completa, sin dibujo y
 * sin las animaciones CSS del panel de Cadence (`animate-dialog-in/out`, la
 * hoja del celular). tailwind-merge no conoce esos nombres de animación y no
 * los reemplaza, por eso el `!animate-none`. Con «reducir movimiento» Cadence
 * deja un fundido `!important` de 200 ms en el marco: es sólo opacidad y no
 * se pelea.
 */
const MARCO_SIN_DIBUJO = [
  'm-0 h-full max-h-none w-full max-w-none',
  'max-sm:top-0 max-sm:max-h-none max-sm:rounded-none max-sm:border-0',
  'rounded-none border-0 bg-transparent p-0 shadow-none dark:shadow-none',
  'data-[state=open]:!animate-none data-[state=closed]:!animate-none',
  'max-sm:data-[state=open]:!animate-none max-sm:data-[state=closed]:!animate-none',
].join(' ');

/** El velo de Radix queda transparente: el de verdad lo anima framer (`VELO`). */
const VELO_DE_RADIX_APAGADO = [
  'bg-transparent dark:bg-transparent backdrop-blur-none motion-reduce:backdrop-blur-none',
  'data-[state=open]:!animate-none data-[state=closed]:!animate-none',
].join(' ');

/**
 * Velo de §41 (tinta al 32 % + 6 px de desenfoque); en oscuro la tinta no
 * oscurece un fondo que ya es negro, así que sube a negro al 62 %.
 */
const VELO = 'absolute inset-0 bg-[rgba(20,19,15,0.32)] backdrop-blur-[6px] dark:bg-[rgba(0,0,0,0.62)]';

/**
 * La caja. <md: pantalla completa (dvh — la barra de URL y el teclado no
 * dejan franja muerta). md+: 680 px a 12 vh del borde, centrada con
 * `mx-auto`, con la sombra de los modales de Cadence.
 */
const CAJA = cn(
  'absolute inset-x-0 top-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-surface text-fg',
  'md:top-[12vh] md:mx-auto md:h-auto md:max-h-[min(620px,80vh)] md:w-[min(680px,calc(100vw-2rem))]',
  'md:rounded-[20px] md:border md:border-border',
  'md:shadow-[0_24px_64px_-16px_rgba(20,19,15,0.26),0_2px_8px_-2px_rgba(20,19,15,0.06)]',
  'md:dark:shadow-[0_28px_72px_-12px_rgba(0,0,0,0.75)]',
);

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const router = useRouter();
  const { t } = useI18n();
  const { agency } = useAuth();
  const { canAccess, isAdmin, agencyRole, agentAccessStatus, modulosPagos } = usePermissionsContext();

  const [query, setQuery] = useState('');
  const [indiceActivo, setIndiceActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filaActivaRef = useRef<HTMLButtonElement | null>(null);
  const prefijoDeIds = useId();
  const idDeOpcion = useCallback((id: string) => `${prefijoDeIds}-op-${id}`, [prefijoDeIds]);

  const agencyId = agency?.id ?? null;

  const sources = useMemo((): SearchSource[] => {
    const todas: SearchSource[] = [
      // Navegación primero: es lo que más se busca (una pantalla) y lo único
      // que responde sin red.
      navigationSource,
      debtorsSource,
      propietariosSource,
      agentesSource,
      propiedadesSource,
      contratosSource,
      cotizacionesSource,
      apBillsSource,
    ];
    return todas.filter((s) => !s.permission || canAccess(s.permission.module, s.permission.action));
  }, [canAccess]);

  // COBRANZA-MANUAL (04-10-2026): el buscador respeta lo que el menú muestra
  // (`seVeEnElBuscador`), con el mismo contexto que el layout le da al menú.
  const ctx = useMemo(
    (): SearchSourceContext => ({
      agencyId,
      canAccess,
      nav: {
        canAccess,
        isAdmin,
        agencyRole,
        modulosPagos,
        agentUnverified: agentAccessStatus === 'sin-verificar',
      },
    }),
    [agencyId, canAccess, isAdmin, agencyRole, modulosPagos, agentAccessStatus],
  );

  const { bySource, isAnyLoading } = useFederatedSearch(query, sources, ctx);

  const consulta = query.trim();
  const hayBusqueda = consulta.length > 0;

  // El debounce del hook deja `bySource` vacío ~200ms después de la primera
  // tecla: sin esto, «Sin resultados» parpadea antes de que salga la consulta.
  const buscando = hayBusqueda && (isAnyLoading || Object.keys(bySource).length === 0);

  const accionesVisibles = useMemo(
    () => ACCIONES_RAPIDAS.filter((a) => !a.permission || canAccess(a.permission.module, a.permission.action)),
    [canAccess],
  );

  const grupos = useMemo((): GrupoDeFilas[] => {
    if (!hayBusqueda) {
      if (accionesVisibles.length === 0) return [];
      return [
        {
          id: 'acciones-rapidas',
          titulo: t('inmobiliaria.commandPalette.quickActions.title'),
          filas: accionesVisibles.map((accion) => ({
            id: accion.id,
            titulo: t(accion.labelKey),
            contexto: t(accion.detalleKey),
            icono: accion.icono,
            href: accion.href,
          })),
        },
      ];
    }

    const salida: GrupoDeFilas[] = [];
    for (const source of sources) {
      const estado = bySource[source.id];
      if (!estado || estado.results.length === 0) continue;
      salida.push({
        id: source.id,
        titulo: t(source.labelKey),
        cantidad: estado.results.length,
        filas: estado.results.map((r) => ({
          id: r.id,
          titulo: r.title,
          icono: source.icon,
          href: r.href,
          contexto: r.subtitle,
          chips: r.badges,
        })),
      });
    }
    return salida;
  }, [hayBusqueda, accionesVisibles, sources, bySource, t]);

  const filas = useMemo(() => grupos.flatMap((g) => g.filas), [grupos]);
  const indicePorId = useMemo(() => new Map(filas.map((fila, i) => [fila.id, i] as const)), [filas]);

  /** Firma estable de la lista: reinicia el foco sólo cuando cambia de verdad. */
  const firmaDeLista = useMemo(() => filas.map((f) => f.id).join(' '), [filas]);
  useEffect(() => {
    setIndiceActivo(0);
  }, [firmaDeLista]);

  const filaActiva = filas[indiceActivo];

  // El diálogo de Radix sigue abierto mientras la caja SALE: `montada` baja
  // recién cuando `AnimatePresence` termina la salida. Lo escrito se borra
  // ahí y no al cerrar, para que la lista no cambie a mitad del fundido.
  const [montada, setMontada] = useState(isOpen);
  const abiertaRef = useRef(isOpen);
  useEffect(() => {
    abiertaRef.current = isOpen;
    if (isOpen) setMontada(true);
  }, [isOpen]);
  const alTerminarLaSalida = useCallback(() => {
    // Si se volvió a abrir durante la salida, la caja ya está entrando otra vez.
    if (abiertaRef.current) return;
    setMontada(false);
    setQuery('');
    setIndiceActivo(0);
  }, []);

  const navegar = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const alTeclear = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (filas.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndiceActivo((prev) => Math.min(prev + 1, filas.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndiceActivo((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const fila = filas[indiceActivo];
        if (fila) navegar(fila.href);
      }
    },
    [filas, indiceActivo, navegar],
  );

  useEffect(() => {
    filaActivaRef.current?.scrollIntoView({ block: 'nearest' });
  }, [indiceActivo]);

  useEffect(() => {
    // Diferido un frame: cubre también la reapertura durante la salida, cuando
    // Radix no vuelve a disparar `onOpenAutoFocus` (el diálogo nunca cerró).
    if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  const puedeVerNovedades = canAccess('cobranza', 'view');
  const sinResultados = hayBusqueda && filas.length === 0 && !buscando;

  // Lo que oye un lector de pantalla al escribir (la lista cambia sin mover el foco).
  const anuncio = !hayBusqueda
    ? ''
    : buscando
      ? t('inmobiliaria.commandPalette.buscando')
      : t('inmobiliaria.commandPalette.resultados', { n: filas.length });

  return (
    <Dialog open={isOpen || montada} onOpenChange={(open) => !open && close()}>
      <DialogContent
        // Sin la ✕ de Cadence (flotaría sobre el marco a pantalla completa):
        // la caja pone la suya en el celular, donde no hay Esc ni velo a la vista.
        hideClose
        overlayClassName={VELO_DE_RADIX_APAGADO}
        className={MARCO_SIN_DIBUJO}
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        {/* `DialogBody` propio (`contents`): el reparto del adaptador no mete
            el buscador en un cuerpo con padding y scroll. */}
        <DialogBody className="contents">
          <DialogTitle className="sr-only">{t('inmobiliaria.commandPalette.title')}</DialogTitle>

          <MotionConfig reducedMotion="user">
            <AnimatePresence onExitComplete={alTerminarLaSalida}>
              {isOpen && (
                <motion.div
                  key="velo"
                  aria-hidden="true"
                  data-testid="cp-velo"
                  className={VELO}
                  // El velo está DENTRO del marco de Radix: el clic afuera de la
                  // caja lo cierra acá (Radix no lo ve como «afuera»).
                  onClick={close}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: MOVIMIENTO.velo }}
                  // Sale al mismo paso que la caja: el cierre dura 150 ms en las dos capas.
                  exit={{ opacity: 0, transition: MOVIMIENTO.cajaSale }}
                />
              )}
              {isOpen && (
                <motion.div
                  key="caja"
                  data-testid="cp-caja"
                  className={CAJA}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: MOVIMIENTO.cajaEntra }}
                  exit={{ opacity: 0, y: 4, scale: 0.98, transition: MOVIMIENTO.cajaSale }}
                >
                  {/* ── Buscador ─────────────────────────────────────────────── */}
                  {/* `pr-14` en móvil: ahí la ✕ flota sobre esta franja y se
                      comía el final del texto escrito. 64 px de alto en móvil
                      para que la ✕ (36 px) quede centrada con el campo. */}
                  <div className="relative flex h-16 flex-shrink-0 items-center gap-3 border-b border-border pl-4 pr-14 md:h-[60px] md:pl-5 md:pr-4">
                    <span className="relative grid h-5 w-5 flex-shrink-0 place-items-center text-fg-subtle">
                      <AnimatePresence initial={false}>
                        <motion.span
                          key={buscando ? 'cargando' : 'lupa'}
                          className="absolute inset-0 grid place-items-center"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={MOVIMIENTO.cambio}
                        >
                          {buscando ? <Spinner size="xs" variant="muted" /> : <MagnifyingGlass className="h-5 w-5" />}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    {/* allowlist: input pelado de un combobox ⌘K (sin borde, transparente,
                        role=combobox + navegación por flechas). El Input de cadence trae
                        su marco y parte la barra; el CommandMenu de cadence obligaría a
                        reescribir la búsqueda federada. Queda nativo. */}
                    <input
                      ref={inputRef}
                      type="text"
                      role="combobox"
                      aria-expanded={filas.length > 0}
                      aria-autocomplete="list"
                      aria-controls="cp-results-list"
                      aria-activedescendant={filaActiva ? idDeOpcion(filaActiva.id) : undefined}
                      aria-label={t('inmobiliaria.commandPalette.inputLabel')}
                      autoComplete="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={alTeclear}
                      placeholder={t('inmobiliaria.commandPalette.inputPlaceholder')}
                      // 16 px en móvil: con menos, iOS hace zoom al enfocar.
                      className="min-w-0 flex-1 text-ellipsis border-0 bg-transparent text-base text-fg outline-none placeholder:text-fg-placeholder md:text-[17px]"
                    />
                    <AnimatePresence initial={false}>
                      {query && (
                        <motion.span
                          key="limpiar"
                          className="flex flex-shrink-0"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={MOVIMIENTO.cambio}
                        >
                          <IconButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setQuery('');
                              inputRef.current?.focus();
                            }}
                            aria-label={t('inmobiliaria.commandPalette.clearLabel')}
                            className="text-fg-muted"
                            icon={<X className="h-4 w-4" />}
                          />
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {/* La ✕ del producto, sólo en el celular (pantalla completa). */}
                    <AspaDeCierre className="absolute right-4 top-3.5 md:hidden" />
                    {/* Mientras busca, un hilo que corre por el filete de abajo. */}
                    <AnimatePresence>
                      {buscando && (
                        <motion.span
                          key="hilo"
                          aria-hidden="true"
                          data-testid="cp-buscando"
                          className="pointer-events-none absolute inset-x-0 -bottom-px h-px overflow-hidden"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={MOVIMIENTO.cambio}
                        >
                          <span className="block h-full w-1/4 animate-indeterminate bg-primary" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  <span className="sr-only" role="status" aria-live="polite">
                    {anuncio}
                  </span>

                  {/* ── Lista ────────────────────────────────────────────────── */}
                  <motion.div
                    layoutScroll
                    data-lenis-prevent
                    className={cn(
                      'min-h-0 flex-1 overflow-y-auto overscroll-contain p-2',
                      // En móvil no hay pie: el último resultado no puede quedar
                      // debajo de la barra de gestos.
                      'pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-2',
                      // Alto mínimo fijo: el estado vacío, el cargando y los resultados
                      // ocupan lo mismo, así la paleta no salta al escribir.
                      'md:min-h-[320px]',
                    )}
                  >
                    <LayoutGroup id="cp-lista">
                      <div id="cp-results-list" role="listbox" aria-label={t('inmobiliaria.commandPalette.resultsLabel')}>
                        {grupos.map((grupo) => (
                          // `role="group"`: dentro de un listbox las opciones tienen que
                          // colgar del listbox o de un grupo, no de un div sin rol.
                          <div key={grupo.id} role="group" aria-label={grupo.titulo}>
                            <EncabezadoDeGrupo titulo={grupo.titulo} cantidad={grupo.cantidad} />
                            {grupo.filas.map((fila) => {
                              const indice = indicePorId.get(fila.id) ?? -1;
                              const activa = indice === indiceActivo;
                              return (
                                <FilaDeComando
                                  key={fila.id}
                                  fila={fila}
                                  idOpcion={idDeOpcion(fila.id)}
                                  activa={activa}
                                  posicion={indice}
                                  consulta={hayBusqueda ? consulta : ''}
                                  onSelect={() => navegar(fila.href)}
                                  onHover={() => setIndiceActivo(indice)}
                                  refDeFila={
                                    activa
                                      ? (el) => {
                                          filaActivaRef.current = el;
                                        }
                                      : undefined
                                  }
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </LayoutGroup>

                    {hayBusqueda && filas.length === 0 && buscando && (
                      <div className="pt-2">
                        <FilasFantasma cantidad={4} />
                      </div>
                    )}

                    {sinResultados && (
                      <motion.div
                        className="flex flex-col items-center px-6 py-12 text-center"
                        data-testid="cp-sin-resultados"
                        initial={ENTRA_A_LA_LISTA.initial}
                        animate={ENTRA_A_LA_LISTA.animate}
                        transition={MOVIMIENTO.aparece}
                      >
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-muted text-fg-muted">
                          <MagnifyingGlass className="h-5 w-5" />
                        </span>
                        <p className="mt-4 max-w-full break-words text-sm font-medium text-fg">
                          {t('inmobiliaria.commandPalette.noResults', { query: consulta })}
                        </p>
                        <p className="mt-1 text-caption text-fg-muted">{t('inmobiliaria.commandPalette.noResultsHint')}</p>
                      </motion.div>
                    )}

                    {!hayBusqueda && puedeVerNovedades && <Novedades />}
                  </motion.div>

                  {/* ── Pie ──────────────────────────────────────────────────── */}
                  <div className="hidden h-11 flex-shrink-0 items-center gap-5 border-t border-border bg-bg px-4 md:flex">
                    <Atajo
                      teclas={[
                        <ArrowUp key="arriba" className="h-2.5 w-2.5" aria-label="↑" />,
                        <ArrowDown key="abajo" className="h-2.5 w-2.5" aria-label="↓" />,
                      ]}
                      texto={t('inmobiliaria.commandPalette.hintNavigate')}
                    />
                    <Atajo
                      teclas={[<ArrowElbowDownLeft key="enter" className="h-2.5 w-2.5" aria-label="↵" />]}
                      texto={t('inmobiliaria.commandPalette.hintOpen')}
                    />
                    <span className="ml-auto">
                      <Atajo teclas={['esc']} texto={t('inmobiliaria.commandPalette.hintClose')} />
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </MotionConfig>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
