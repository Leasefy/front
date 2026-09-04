'use client';

/**
 * CommandPalette — el ⌘K del panel de inmobiliaria.
 *
 * ── Por qué se rehizo (Nico, 2026-09-03: «mira este buscador como quedó de feo»)
 *
 * Lo que se veía: un modal de 720px con filas de 44px, cada una con un círculo
 * gris de 36px alrededor del icono y un chevron «>» a la derecha que no era un
 * control (no se podía enfocar ni hacía nada distinto de la fila), y un feed de
 * «Novedades» que mostraba la clave cruda del audit log —
 * `precall.held_for_approval` / `debtor · hace 6h`— tal como sale de la base.
 *
 * Lo que hay ahora, con el lenguaje de cadence:
 *  - 640px, una sola columna (Linear/Raycast). El panel de vista previa de
 *    240px no cabía en 640 y duplicaba lo que ya dice la fila.
 *  - Filas de 40px: icono de 16px sin círculo, título en `text-sm`, contexto y
 *    estado a la derecha en `text-caption`. Sin chevrons.
 *  - Encabezados de grupo en `text-label` (font-mono 11px), alineados con el
 *    icono de la fila, con el contador de resultados cuando hay búsqueda.
 *  - Novedades pasa por `@/lib/search/audit-event-labels`: diccionario →
 *    familia por prefijo → humanizador. Nunca una clave cruda.
 *
 * ── Teclado
 *  ↑ / ↓   mueven el foco sobre TODAS las filas navegables — también las
 *          acciones rápidas del estado vacío, que antes se dibujaban con el pie
 *          diciendo «↑↓ navegar» mientras las flechas no hacían nada.
 *  ↵       router.push(href) + cerrar
 *  esc     cerrar (lo maneja el Dialog)
 *
 * ── Accesibilidad
 *  role="listbox" en la lista, role="option" por fila, aria-selected en la
 *  activa, aria-label en el input. Radix devuelve el foco al disparador.
 *
 * ── La cáscara
 *  `DialogContent` de `@/components/ui/dialog` reparte a sus hijos y mete el
 *  cuerpo en un `div` con `p-6 gap-4` y scroll propio (marcado con
 *  `data-lenis-prevent`). Para una paleta eso son 24px de aire alrededor del
 *  input; se neutraliza por selector de descendiente sobre ese `div`, sin
 *  perder lo que la primitiva sí aporta (freno de Lenis, overlay, foco).
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlass,
  ArrowUp,
  ArrowDown,
  ArrowElbowDownLeft,
  Clock,
  ChatCircleText,
  FileText,
  ChartLineUp,
  House,
  Plus,
  X,
} from '@phosphor-icons/react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { IconButton, Kbd } from '@leasefy/cadence';
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
import {
  auditEntityLabel,
  auditEventLabel,
  relativeTimeLabel,
} from '@/lib/search/audit-event-labels';
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
  /** Dirección, correo, sección… — a la derecha, en gris. */
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
      <span className="flex-shrink-0 whitespace-nowrap text-caption text-fg-subtle">{label}</span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex h-5 flex-shrink-0 items-center whitespace-nowrap rounded-sm px-1.5 text-[11px] font-medium',
        FONDO_DE_CHIP[color],
      )}
    >
      {label}
    </span>
  );
}

function EncabezadoDeGrupo({ titulo, cantidad }: { titulo: string; cantidad?: number }) {
  return (
    <div className="flex items-baseline gap-2 px-3 pb-1 pt-3">
      <span className="text-label text-fg-muted">{titulo}</span>
      {cantidad != null && <span className="text-label text-fg-subtle">{cantidad}</span>}
    </div>
  );
}

/**
 * Filas fantasma mientras carga. Miden lo mismo que una fila real (40px) para
 * que el resultado no empuje la lista cuando llega.
 */
function FilasFantasma({ cantidad }: { cantidad: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex h-10 items-center gap-2.5 px-3">
          <div className="h-4 w-4 flex-shrink-0 animate-pulse rounded-sm bg-surface-muted" />
          <div
            className={cn(
              'h-3 animate-pulse rounded-sm bg-surface-muted',
              i === 0 ? 'w-2/5' : i === 1 ? 'w-1/2' : 'w-1/3',
            )}
          />
        </div>
      ))}
    </div>
  );
}

function FilaDeComando({
  fila,
  activa,
  onSelect,
  onHover,
  refDeFila,
}: {
  fila: FilaNavegable;
  activa: boolean;
  onSelect: () => void;
  onHover: () => void;
  refDeFila?: (el: HTMLButtonElement | null) => void;
}) {
  const Icono = fila.icono;
  return (
    // allowlist: fila de un listbox ARIA (role="option", ref de scroll, foco por
    // teclado) dentro de un combobox propio — cadence no tiene primitiva de
    // opción de listbox y un Button rompería el rol y la navegación.
    <button
      ref={refDeFila}
      role="option"
      aria-selected={activa}
      onClick={onSelect}
      // `mousemove` y no `mouseenter`: al bajar con el teclado la lista scrollea
      // bajo un puntero quieto y `mouseenter` le robaba el foco a la flecha.
      onMouseMove={onHover}
      className={cn(
        'flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-left transition-colors',
        activa ? 'bg-surface-muted' : 'bg-transparent',
      )}
    >
      <Icono className="h-4 w-4 flex-shrink-0 text-fg-muted" />
      <span className="min-w-0 flex-1 truncate text-sm text-fg">{fila.titulo}</span>
      {fila.contexto && (
        <span className="hidden min-w-0 max-w-[45%] truncate text-caption text-fg-muted sm:block">
          {fila.contexto}
        </span>
      )}
      {fila.chips?.slice(0, 2).map((chip, i) => (
        <ChipDeFila key={`${chip.label}-${i}`} label={chip.label} color={chip.color} />
      ))}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Acciones rápidas — el estado vacío
// ──────────────────────────────────────────────────────────────────────────────

interface AccionRapida {
  id: string;
  labelKey: string;
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
    icono: Plus,
    href: '/panel/inmobiliaria/inmuebles/nuevo',
    permission: { module: 'portafolio', action: 'create' },
  },
  {
    id: 'qa-cobranza',
    labelKey: 'inmobiliaria.commandPalette.quickActions.cobranza',
    icono: ChatCircleText,
    href: '/panel/inmobiliaria/cobros/cobranza',
    permission: { module: 'cobranza', action: 'view' },
  },
  {
    id: 'qa-cotizador',
    labelKey: 'inmobiliaria.commandPalette.quickActions.cotizador',
    icono: FileText,
    href: '/panel/inmobiliaria/postulaciones/asegurabilidad',
    permission: { module: 'cotizador', action: 'view' },
  },
  {
    id: 'qa-reportes',
    labelKey: 'inmobiliaria.commandPalette.quickActions.reportes',
    icono: ChartLineUp,
    href: '/panel/inmobiliaria/reportes',
    permission: { module: 'reportes', action: 'view' },
  },
  {
    id: 'qa-portafolio',
    labelKey: 'inmobiliaria.commandPalette.quickActions.portafolio',
    icono: House,
    href: '/panel/inmobiliaria/inmuebles',
    permission: { module: 'portafolio', action: 'view' },
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Novedades — el audit log del agente, dicho en español
// ──────────────────────────────────────────────────────────────────────────────

/** Constante de módulo: un `{}` nuevo por render haría latir el hook. */
const SIN_FILTROS: AuditLogFilters = {};

const EVENTOS_VISIBLES = 6;

function Novedades() {
  const { t, locale } = useI18n();
  const { items, isLoading, error } = useAuditLog(SIN_FILTROS);

  // El feed es informativo: si el endpoint falla, el buscador no es el lugar
  // para contarlo (y una fila de error ahí es ruido en el gesto de escribir).
  if (error) return null;

  const eventos = items.slice(0, EVENTOS_VISIBLES);

  return (
    <div>
      <EncabezadoDeGrupo titulo={t('inmobiliaria.commandPalette.novedades')} />
      {isLoading ? (
        <FilasFantasma cantidad={2} />
      ) : eventos.length === 0 ? (
        <p className="px-3 py-2 text-caption text-fg-muted">
          {t('inmobiliaria.commandPalette.novedadesEmpty')}
        </p>
      ) : (
        eventos.map((evento) => {
          const entidad = auditEntityLabel(evento.entity_type, locale);
          const cuando = relativeTimeLabel(evento.occurred_at, locale);
          return (
            // Fila de lectura, no un control: no lleva hover ni cursor de mano
            // porque no hay adónde ir (el audit log completo vive en Cobranza).
            <div key={evento.id} className="flex h-10 items-center gap-2.5 px-3">
              <Clock className="h-4 w-4 flex-shrink-0 text-fg-muted" />
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {auditEventLabel(evento.action, locale)}
              </span>
              <span className="flex-shrink-0 whitespace-nowrap text-caption text-fg-muted">
                {entidad ? `${entidad} · ${cuando}` : cuando}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// La paleta
// ──────────────────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const router = useRouter();
  const { t } = useI18n();
  const { agency } = useAuth();
  const { canAccess } = usePermissionsContext();

  const [query, setQuery] = useState('');
  const [indiceActivo, setIndiceActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filaActivaRef = useRef<HTMLButtonElement | null>(null);

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

  const ctx = useMemo((): SearchSourceContext => ({ agencyId, canAccess }), [agencyId, canAccess]);

  const { bySource, isAnyLoading } = useFederatedSearch(query, sources, ctx);

  const hayBusqueda = query.trim().length > 0;

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
  const indicePorId = useMemo(
    () => new Map(filas.map((fila, i) => [fila.id, i] as const)),
    [filas],
  );

  /** Firma estable de la lista: reinicia el foco sólo cuando cambia de verdad. */
  const firmaDeLista = useMemo(() => filas.map((f) => f.id).join(' '), [filas]);
  useEffect(() => {
    setIndiceActivo(0);
  }, [firmaDeLista]);

  const navegar = useCallback(
    (href: string) => {
      close();
      setQuery('');
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
    if (isOpen) {
      // Diferido un frame para que la animación del Dialog no le robe el foco.
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
      setIndiceActivo(0);
    }
  }, [isOpen]);

  const puedeVerNovedades = canAccess('cobranza', 'view');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className={cn(
          // <md: pantalla completa (dvh — la barra de URL y el teclado no dejan
          // franja muerta) con la ✕ visible; md+: paleta centrada de 640px.
          'fixed inset-x-0 left-0 top-0 translate-x-0 translate-y-0',
          'h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none',
          'md:inset-x-auto md:left-1/2 md:top-[12%] md:-translate-x-1/2 md:translate-y-0',
          'md:h-auto md:max-h-none md:w-[min(640px,94vw)] md:rounded-lg',
          'flex flex-col gap-0 p-0',
          'border border-border bg-surface text-fg',
          'overflow-hidden md:[&>button]:hidden',
          // Sin la animación de entrada por defecto del diálogo.
          'data-[state=open]:animate-none data-[state=closed]:animate-none',
          // El cuerpo de la primitiva trae `p-6 gap-4` y su propio scroll: para
          // una paleta eso es aire alrededor del input y dos barras de scroll.
          // Se aplana acá (el `div` marcado con data-lenis-prevent es suyo).
          '[&>[data-lenis-prevent]]:flex [&>[data-lenis-prevent]]:flex-col',
          '[&>[data-lenis-prevent]]:gap-0 [&>[data-lenis-prevent]]:overflow-hidden',
          '[&>[data-lenis-prevent]]:p-0',
        )}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{t('inmobiliaria.commandPalette.title')}</DialogTitle>

        <div className="flex min-h-0 w-full flex-1 flex-col">
          {/* ── Buscador ─────────────────────────────────────────────────── */}
          {/* `pr-14` en móvil: ahí la ✕ del diálogo flota sobre esta misma
              franja (right-4 top-4) y se comía el final del texto escrito. */}
          <div className="flex h-[52px] flex-shrink-0 items-center gap-2.5 border-b border-border pl-4 pr-14 md:pr-4">
            <span className="grid h-[18px] w-[18px] flex-shrink-0 place-items-center">
              {buscando ? (
                <Spinner size="xs" variant="muted" />
              ) : (
                <MagnifyingGlass className="h-[18px] w-[18px] text-fg-muted" />
              )}
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
              aria-label={t('inmobiliaria.commandPalette.inputLabel')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={alTeclear}
              placeholder={t('inmobiliaria.commandPalette.inputPlaceholder')}
              className="min-w-0 flex-1 border-0 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
            />
            {query && (
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
            )}
          </div>

          {/* ── Lista ────────────────────────────────────────────────────── */}
          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain p-2',
              // En móvil no hay pie: el último resultado no puede quedar
              // debajo de la barra de gestos.
              'pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-2',
              // Alto mínimo fijo: el estado vacío, el cargando y los resultados
              // ocupan lo mismo, así la paleta no salta al escribir.
              'md:min-h-[300px] md:max-h-[min(60vh,420px)]',
            )}
          >
            <div
              id="cp-results-list"
              role="listbox"
              aria-label={t('inmobiliaria.commandPalette.resultsLabel')}
            >
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
                        activa={activa}
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

            {hayBusqueda && filas.length === 0 && buscando && (
              <div className="pt-3">
                <FilasFantasma cantidad={3} />
              </div>
            )}

            {hayBusqueda && filas.length === 0 && !buscando && (
              <div className="px-3 py-12 text-center">
                <p className="text-sm text-fg">
                  {t('inmobiliaria.commandPalette.noResults', { query: query.trim() })}
                </p>
                <p className="mt-1 text-caption text-fg-muted">
                  {t('inmobiliaria.commandPalette.noResultsHint')}
                </p>
              </div>
            )}

            {!hayBusqueda && puedeVerNovedades && <Novedades />}
          </div>

          {/* ── Pie ──────────────────────────────────────────────────────── */}
          <div className="hidden h-9 flex-shrink-0 items-center gap-4 border-t border-border px-3 md:flex">
            <span className="flex items-center gap-1.5 text-caption text-fg-subtle">
              <Kbd size="sm">
                <ArrowUp className="h-2.5 w-2.5" />
              </Kbd>
              <Kbd size="sm">
                <ArrowDown className="h-2.5 w-2.5" />
              </Kbd>
              {t('inmobiliaria.commandPalette.hintNavigate')}
            </span>
            <span className="flex items-center gap-1.5 text-caption text-fg-subtle">
              <Kbd size="sm">
                <ArrowElbowDownLeft className="h-2.5 w-2.5" />
              </Kbd>
              {t('inmobiliaria.commandPalette.hintOpen')}
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-caption text-fg-subtle">
              <Kbd size="sm">esc</Kbd>
              {t('inmobiliaria.commandPalette.hintClose')}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
