'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CaretDown, Sparkle, X } from '@phosphor-icons/react';
import { Chip, Eyebrow } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { AISearchInput } from '@/components/property/AISearchInput';
import { AperturaConIA } from '@/components/marketplace/AperturaConIA';
import dynamic from 'next/dynamic';
import { MapToggle } from '@/components/map';
import { TopeAprobadoBanner } from '@/components/tenant/TopeAprobadoBanner';
import { useAuth } from '@/lib/auth/use-auth';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useProperties } from '@/lib/hooks/useProperties';
import { useAprobacion } from '@/lib/hooks/use-aprobacion';
import { cn } from '@/lib/utils';
import {
  absorber,
  escribirBusqueda,
  filtrosDeLaApi,
  hayBusqueda,
  leerBusqueda,
  pastillas as pastillasDe,
  porQueTeLoMuestro,
  quitarPastilla,
  tituloDeLaBusqueda,
  type Busqueda,
  type TipoDeLaApi,
} from '@/lib/marketplace/busqueda';
import { CIUDADES_DEL_FILTRO } from '@/lib/marketplace/sugerencias';
import type { Property } from '@/lib/types/property';

export { sugerenciasDelCatalogo, type Sugerencia } from '@/lib/marketplace/sugerencias';

// Lazy-load the map (maplibre) so its chunk is only fetched when the map panel
// is actually mounted. ssr:false because PropertyMap touches `window`.
const PropertyMap = dynamic(
  () => import('@/components/map').then((m) => ({ default: m.PropertyMap })),
  { ssr: false, loading: () => <div className="h-full w-full" /> }
);

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recomendado' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'newest', label: 'Más reciente' },
];

const OPERACIONES = [
  { value: 'arriendo', label: 'En arriendo' },
  { value: 'venta', label: 'En venta' },
];
const HABITACIONES = ['1', '2', '3', '4', '5'];
const TIPOS: { value: TipoDeLaApi; label: string }[] = [
  { value: 'APARTMENT', label: 'Apartamento' },
  { value: 'HOUSE', label: 'Casa' },
  { value: 'STUDIO', label: 'Apartaestudio' },
  { value: 'COMMERCIAL', label: 'Local' },
  { value: 'OFFICE', label: 'Oficina' },
];
/** Rangos de canon (arriendo) y de precio (venta): son ejes distintos. */
const RANGOS_DE_CANON = [
  { value: '0-1500000', label: 'Hasta $1,5 M' },
  { value: '1500000-2500000', label: '$1,5 M – $2,5 M' },
  { value: '2500000-4000000', label: '$2,5 M – $4 M' },
  { value: '4000000-', label: 'Más de $4 M' },
];
const RANGOS_DE_VENTA = [
  { value: '0-300000000', label: 'Hasta $300 M' },
  { value: '300000000-600000000', label: '$300 M – $600 M' },
  { value: '600000000-1000000000', label: '$600 M – $1.000 M' },
  { value: '1000000000-', label: 'Más de $1.000 M' },
];

interface PropertySearchViewProps {
  /** When true, renders without Navbar and adapts layout for embedding inside dashboard */
  embedded?: boolean;
  /**
   * No monta ningún header propio: lo pone quien envuelve.
   *
   * `/propiedades` ahora usa el header de la landing (`LandingChrome`), que es
   * el mismo de la home. `embedded` no sirve para esto: además de quitar el
   * navbar cambia todo el alto del layout para caber dentro del panel.
   */
  sinNavbar?: boolean;
  /** Prefix for card detail links. Public '/propiedades', tenant '/inquilino/propiedades'. */
  basePath?: string;
}

/** Quita las claves en `undefined`: una búsqueda limpia da una URL limpia. */
function limpia(b: Busqueda): Busqueda {
  return Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)) as Busqueda;
}

/**
 * La búsqueda del marketplace (Nico, 09-10-2026: «el mejor marketplace
 * posible»). La DIRECCIÓN es la búsqueda (`src/lib/marketplace/busqueda.ts`):
 * lo que se escribe con IA se vuelve pastillas que se quitan con una ×, los
 * filtros de siempre («sin IA») escriben en la misma búsqueda, y una búsqueda
 * compartida muestra exactamente lo mismo. Cada tarjeta dice por qué sale.
 *
 * La usan /propiedades (pública) e /inquilino/explorar (embebida).
 */
export function PropertySearchView({ embedded = false, sinNavbar = false, basePath }: PropertySearchViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { aprobacion, vigente: aprobacionVigente } = useAprobacion();
  /**
   * La aprobación es del inquilino. A este catálogo también entra gente de la
   * inmobiliaria y propietarios, y a ellos "todavía no sabes hasta cuánto
   * puedes arrendar" no les dice nada — no son los que arriendan.
   * Anónimo SÍ la ve: es el caso principal, quien llega por el link del asesor.
   */
  const mostrarAprobacion = !user || user.role === 'tenant';

  // ── La búsqueda vive en la URL ──
  const claveDeLaUrl = searchParams.toString();
  const busqueda = useMemo(() => leerBusqueda(new URLSearchParams(claveDeLaUrl)), [claveDeLaUrl]);
  const abrirConIA = searchParams.get('abrir') === 'ia' && !!busqueda.q;

  const cambiar = useCallback(
    (b: Busqueda, opciones: { abrirConIA?: boolean } = {}) => {
      const qs = escribirBusqueda(limpia(b));
      const extra = opciones.abrirConIA ? `${qs ? '&' : ''}abrir=ia` : '';
      router.replace(qs || extra ? `${pathname}?${qs}${extra}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const apiFilters = useMemo(() => filtrosDeLaApi(busqueda), [busqueda]);
  const { properties: apiProperties, meta, isLoading: isInitialLoading } = useProperties(apiFilters);
  const entendidos = busqueda.q ? meta?.filtrosEntendidos ?? null : null;
  // La búsqueda entera, con lo entendido ya como filtros: lo que dicen los menús.
  const vigente = useMemo(() => absorber(busqueda, entendidos), [busqueda, entendidos]);
  const pastillas = useMemo(() => pastillasDe(busqueda, entendidos), [busqueda, entendidos]);

  const [texto, setTexto] = useState(busqueda.q ?? '');
  const [refinar, setRefinar] = useState('');
  useEffect(() => setTexto(busqueda.q ?? ''), [busqueda.q]);

  const [showMap, setShowMap] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0);
  // On desktop the map panel is part of the split-view (always visible via lg:block),
  // so it should mount there; on mobile it only exists when the user toggles the map.
  const [isDesktop, setIsDesktop] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [showSortList, setShowSortList] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const propertyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { isWishlisted, toggleWishlist } = useWishlist();

  // Force map reload on mount
  useEffect(() => {
    const timer = setTimeout(() => setMapKey(prev => prev + 1), 100);
    return () => clearTimeout(timer);
  }, []);

  // Track the lg breakpoint so we only mount the map (and fetch its chunk) when
  // the split-view panel is actually visible — never in mobile list-only view.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // ── Acciones sobre la búsqueda ──
  /** Una búsqueda nueva con IA: reemplaza la de antes y abre con el momento de Ori. */
  const buscarConIA = useCallback(
    (q: string) => {
      const limpio = q.trim();
      if (!limpio) return;
      cambiar({ q: limpio }, { abrirConIA: true });
    },
    [cambiar],
  );
  /** Refinar: lo que ya está se queda y el texto nuevo se suma. */
  const refinarConTexto = useCallback(
    (q: string) => {
      const limpio = q.trim();
      if (!limpio) return;
      cambiar({ ...absorber(busqueda, entendidos), q: limpio });
      setRefinar('');
    },
    [busqueda, entendidos, cambiar],
  );
  /** Un filtro de los de siempre: escribe en la misma búsqueda. */
  const poner = useCallback(
    (cambios: Partial<Busqueda>) => cambiar({ ...absorber(busqueda, entendidos), ...cambios }),
    [busqueda, entendidos, cambiar],
  );

  // Orden: en el cliente, sobre lo que trajo el back.
  const filteredProperties = useMemo(() => {
    const result = [...apiProperties];
    // T-0038 §3.2.2/§3.2.4 — the catalog mixes RENT and SALE listings (§3.7:
    // no server-side default). "Price" means whichever price applies to
    // that listing; `?? 0` only orders the comparator and is never rendered.
    const effectivePrice = (p: Property) => (p.listingType === 'sale' ? p.salePrice : p.monthlyRent) ?? 0;
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return effectivePrice(a) - effectivePrice(b);
        case 'price_desc':
          return effectivePrice(b) - effectivePrice(a);
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });
    return result;
  }, [apiProperties, sortBy]);

  // Properties with valid coordinates for the map
  const mappableProperties = useMemo(
    // `null` = sin geocodificar; (0,0) = el «sin ubicación» que dejaba el mapper viejo.
    () =>
      filteredProperties.filter(
        (p) => p.latitude != null && p.longitude != null && (p.latitude !== 0 || p.longitude !== 0),
      ),
    [filteredProperties]
  );

  const explicar = useCallback(
    (p: Property) => (hayBusqueda(busqueda) ? porQueTeLoMuestro(p, busqueda, entendidos) : null),
    [busqueda, entendidos],
  );

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Recomendado';
  const total = meta?.total ?? filteredProperties.length;
  const titulo = hayBusqueda(vigente) ? tituloDeLaBusqueda(vigente) : 'Busca como le hablarías a un asesor';

  const handlePropertySelect = useCallback((id: string) => {
    setSelectedPropertyId(id);
    propertyRefs.current[id]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, []);

  const propertyRefCallback = useCallback((id: string, el: HTMLDivElement | null) => {
    propertyRefs.current[id] = el;
  }, []);

  // ── Filter dropdown renderer ──
  const renderFilterDropdown = (
    id: string,
    label: string,
    selectedValue: string | null,
    options: { value: string; label: string }[],
    onSelect: (value: string | null) => void
  ) => (
    // No `z-10` here: a positioned wrapper with a z-index traps the dropdown in
    // its own stacking context, capping the `z-[110]` panel at root-z-10 — where
    // later-DOM card internals (badges z-10, arrows z-20, overlay z-30) paint
    // over it. Plain `relative` keeps positioning without the trap (matches the
    // sort dropdown below).
    <div className="relative">
      <Chip
        selected={!!selectedValue}
        onClick={() => setActiveFilter(activeFilter === id ? null : id)}
        className="whitespace-nowrap"
        aria-expanded={activeFilter === id}
      >
        <span className="inline-flex items-center gap-1.5">
          {options.find(o => o.value === selectedValue)?.label || label}
          <CaretDown className={cn('w-3.5 h-3.5 transition-transform', activeFilter === id && 'rotate-180')} />
        </span>
      </Chip>
      {activeFilter === id && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setActiveFilter(null)} />
          <div className="absolute left-0 top-full mt-1 py-1 bg-surface border border-border rounded-md shadow-md z-[110] min-w-[160px]">
            {options.map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                hideArrow
                onClick={() => { onSelect(selectedValue === option.value ? null : option.value); setActiveFilter(null); }}
                className={cn(
                  'w-full justify-start h-auto rounded-none px-3 py-2 text-sm font-normal',
                  selectedValue === option.value
                    ? 'bg-black/5 dark:bg-white/10 font-medium'
                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const rangos = vigente.operacion === 'venta' ? RANGOS_DE_VENTA : RANGOS_DE_CANON;
  const rangoVigente =
    vigente.desde !== undefined || vigente.hasta !== undefined
      ? `${vigente.desde ?? 0}-${vigente.hasta ?? ''}`
      : null;

  // ── Layout ──
  return (
    <div className={cn(
      embedded
        ? 'flex flex-col h-[calc(100vh-64px)]'
        : 'min-h-screen bg-background'
    )}>
      {!embedded && !sinNavbar && <Navbar />}

      {abrirConIA && busqueda.q && (
        <AperturaConIA
          key={busqueda.q}
          texto={busqueda.q}
          cargando={isInitialLoading}
          entendido={pastillas.map((p) => p.etiqueta)}
          total={isInitialLoading ? null : total}
          onTerminar={() => cambiar(busqueda)}
        />
      )}

      {/* Main Layout - Split View */}
      <div className={cn(
        'flex',
        embedded ? 'flex-1 min-h-0' : 'pt-16 lg:pt-[76px]'
      )}>
        {/* Left Panel - Scrollable Content */}
        <div
          className={cn(
            // La grilla de adentro (`PropertyGrid`) trae su propio contenedor
            // de container query y mide su ancho, no el de la ventana.
            'w-full lg:w-1/2 2xl:w-3/5',
            embedded ? 'overflow-y-auto' : 'min-h-screen',
            showMap && 'hidden lg:block'
          )}
        >
          {/* La búsqueda: qué se busca, el campo con IA y las pastillas. */}
          <div className="bg-surface border-b border-border">
            <div className={cn('px-4 md:px-6', embedded ? 'pt-5 pb-5' : 'pt-8 pb-6 md:pt-10')}>
              <Eyebrow accent className="mb-3">
                Buscar inmueble
                <span className="text-fg-subtle">
                  {' · '}
                  <span className="font-mono tabular-nums">{isInitialLoading ? '…' : total}</span>
                  {total === 1 ? ' disponible' : ' disponibles'}
                </span>
              </Eyebrow>
              <h1
                className={cn(
                  'font-heading font-semibold tracking-[-0.02em] text-fg text-balance',
                  embedded ? 'text-xl' : 'text-2xl md:text-[28px] leading-tight',
                )}
                data-testid="titulo-de-la-busqueda"
              >
                {titulo}
              </h1>

              <AISearchInput
                className="mt-5"
                value={texto}
                onChange={setTexto}
                onMagnifyingGlass={buscarConIA}
                onClear={() => {
                  setTexto('');
                  cambiar({});
                }}
                isMagnifyingGlassing={isInitialLoading}
              />

              {/* Las pastillas: lo que se está buscando. Las que salieron del
                  texto llevan la chispa de lo que es IA. Una × las quita. */}
              {pastillas.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="pastillas-de-la-busqueda">
                  {/* Un contenedor con su botón de quitar aparte: la pastilla de
                      Cadence ya es un <button> y la × adentro sería un botón
                      dentro de otro (HTML inválido, error de hidratación). */}
                  {pastillas.map((p) => (
                    <span
                      key={p.clave}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1 text-sm text-fg"
                      data-testid="pastilla"
                    >
                      {p.entendida && <Sparkle className="h-3.5 w-3.5 text-primary" weight="fill" aria-hidden />}
                      {p.entendida && <span className="sr-only">Entendido de lo que escribiste: </span>}
                      {p.etiqueta}
                      <button
                        type="button"
                        onClick={() => cambiar(quitarPastilla(busqueda, entendidos, p.clave))}
                        aria-label={`Quitar ${p.etiqueta}`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-primary/15 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-3 w-3" weight="bold" aria-hidden />
                      </button>
                    </span>
                  ))}
                  <form
                    className="flex min-w-[220px] flex-1 items-center"
                    onSubmit={(e) => {
                      e.preventDefault();
                      refinarConTexto(refinar);
                    }}
                  >
                    <label htmlFor="refinar-busqueda" className="sr-only">
                      Agregar algo a la búsqueda
                    </label>
                    <input
                      id="refinar-busqueda"
                      value={refinar}
                      onChange={(e) => setRefinar(e.target.value)}
                      placeholder="Agrega: con balcón, hasta 3 millones…"
                      className="w-full rounded-full border border-dashed border-border bg-transparent px-3.5 py-1.5 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none"
                      data-testid="refinar-busqueda"
                    />
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Filtros + conteo + orden. Pegajosos bajo el header: la grilla es
              larga y el filtro tiene que estar a mano sin volver arriba. En
              modo embebido el panel scrollea solo, así que se pegan a su
              propio borde. Son la búsqueda «sin IA»: escriben en la misma URL. */}
          <div
            className={cn(
              'sticky z-20 border-b border-border bg-background/95 backdrop-blur-[2px]',
              embedded ? 'top-0' : 'top-16 lg:top-[76px]',
            )}
          >
            <div className="px-4 md:px-6 py-3 flex flex-wrap items-center gap-2">
              {renderFilterDropdown('operacion', 'Arriendo o venta', vigente.operacion ?? null, OPERACIONES, (v) =>
                poner({ operacion: (v as Busqueda['operacion']) ?? undefined, desde: undefined, hasta: undefined }),
              )}
              {renderFilterDropdown(
                'city',
                'Ciudad',
                vigente.ciudad ?? null,
                [...new Set([...(vigente.ciudad ? [vigente.ciudad] : []), ...CIUDADES_DEL_FILTRO])].map((c) => ({ value: c, label: c })),
                (v) => poner({ ciudad: v ?? undefined, barrio: undefined }),
              )}
              {renderFilterDropdown('type', 'Tipo', vigente.tipo ?? null, TIPOS, (v) =>
                poner({ tipo: (v as TipoDeLaApi) ?? undefined }),
              )}
              {renderFilterDropdown(
                'bedrooms',
                'Habitaciones',
                vigente.habitaciones !== undefined ? String(vigente.habitaciones) : null,
                HABITACIONES.map((b) => ({ value: b, label: `${b} habitaci${b === '1' ? 'ón' : 'ones'}` })),
                (v) => poner({ habitaciones: v ? Number(v) : undefined }),
              )}
              {renderFilterDropdown('price', vigente.operacion === 'venta' ? 'Precio' : 'Canon', rangoVigente, rangos, (v) => {
                if (!v) return poner({ desde: undefined, hasta: undefined });
                const [min, max] = v.split('-');
                poner({ desde: Number(min) || undefined, hasta: max ? Number(max) : undefined });
              })}

              {hayBusqueda(busqueda) && (
                <Button
                  variant="ghost"
                  size="sm"
                  hideArrow
                  onClick={() => {
                    setTexto('');
                    cambiar({});
                  }}
                  className="gap-1 text-fg-muted hover:text-fg"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar
                </Button>
              )}

              {/* Conteo + orden, a la derecha de la misma fila. */}
              <div className="ml-auto flex items-center gap-3">
                <p className="text-sm text-fg-muted whitespace-nowrap">
                  <span className="font-mono tabular-nums font-medium text-fg">{total}</span> {total === 1 ? 'propiedad' : 'propiedades'}
                </p>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    hideArrow
                    onClick={() => setShowSortList(!showSortList)}
                    className="gap-1.5 px-2 text-sm font-normal text-fg hover:text-primary"
                  >
                    <span>{currentSortLabel}</span>
                    <CaretDown className={cn('w-3.5 h-3.5 transition-transform', showSortList && 'rotate-180')} />
                  </Button>

                  {showSortList && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setShowSortList(false)} />
                      <div className="absolute right-0 top-full mt-2 py-1 bg-surface border border-border rounded-md shadow-md z-[110] min-w-[160px]">
                        {SORT_OPTIONS.map((option) => (
                          <Button
                            key={option.value}
                            variant="ghost"
                            hideArrow
                            onClick={() => { setSortBy(option.value); setShowSortList(false); }}
                            className={cn(
                              'w-full justify-start h-auto rounded-none px-4 py-2 text-sm font-normal',
                              sortBy === option.value
                                ? 'bg-black/5 dark:bg-white/10 text-fg font-medium'
                                : 'text-fg-muted hover:bg-black/5 dark:hover:bg-white/10'
                            )}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Property Grid */}
          <div className="p-4 md:p-6">
            {/* La aprobación vuelve personal al catálogo público, que es donde
                aterriza quien llega por el link del asesor y todavía no tiene
                cuenta. Sin aprobación la banda invita; con ella, muestra el
                número y marca lo que se pasa. */}
            {mostrarAprobacion && (
              <TopeAprobadoBanner
                aprobacion={aprobacion}
                vigente={aprobacionVigente}
                className="mb-6"
                detalle={
                  user
                    ? { href: '/inquilino/aprobacion', label: 'Ver detalle' }
                    : // Sin cuenta su aprobación vive solo en este navegador.
                      { href: '/auth', label: 'Crear cuenta' }
                }
              />
            )}
            <PropertyGrid
              properties={filteredProperties}
              isWishlisted={isWishlisted}
              onWishlistToggle={toggleWishlist}
              isLoading={isInitialLoading}
              hoveredPropertyId={hoveredPropertyId}
              onPropertyHover={setHoveredPropertyId}
              propertyRefCallback={propertyRefCallback}
              basePath={basePath}
              aprobacion={mostrarAprobacion && aprobacionVigente ? aprobacion : null}
              explicar={explicar}
            />
          </div>
        </div>

        {/* Right Panel - Map */}
        <div
          className={cn(
            embedded
              ? cn(
                  'w-full lg:w-1/2 2xl:w-2/5 h-full',
                  !showMap && 'hidden lg:block'
                )
              : cn(
                  'w-full lg:w-1/2 2xl:w-2/5 lg:fixed lg:right-0',
                  // El header de la landing mide 64px y 76px desde lg.
                  'lg:top-[76px] h-[calc(100vh-64px)] lg:h-[calc(100vh-76px)]',
                  !showMap && 'hidden lg:block'
                )
          )}
        >
          {(showMap || isDesktop) && (
            <PropertyMap
              key={mapKey}
              properties={mappableProperties}
              selectedPropertyId={selectedPropertyId}
              hoveredPropertyId={hoveredPropertyId}
              onPropertySelect={handlePropertySelect}
              onPropertyHover={setHoveredPropertyId}
              className="h-full w-full"
            />
          )}
        </div>
      </div>

      {/* Mobile Map Toggle */}
      <MapToggle showMap={showMap} onToggle={() => setShowMap(!showMap)} />
    </div>
  );
}
