'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CaretDown, X } from '@phosphor-icons/react';
import { Chip } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { AISearchInput } from '@/components/property/AISearchInput';
import dynamic from 'next/dynamic';
import { MapToggle } from '@/components/map';
import { TopeAprobadoBanner } from '@/components/tenant/TopeAprobadoBanner';
import { useAuth } from '@/lib/auth/use-auth';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useProperties } from '@/lib/hooks/useProperties';
import { useAprobacion } from '@/lib/hooks/use-aprobacion';
import { cn } from '@/lib/utils';
import type { PropertyFiltersParams } from '@/lib/api/properties.types';

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

const CITIES = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena'];
const BEDROOMS = ['1', '2', '3', '4+'];
const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'studio', label: 'Estudio' },
];
const PRICE_RANGES = [
  { value: '0-1500000', label: 'Hasta $1.5M' },
  { value: '1500000-2500000', label: '$1.5M - $2.5M' },
  { value: '2500000-4000000', label: '$2.5M - $4M' },
  { value: '4000000-99999999', label: 'Más de $4M' },
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

/**
 * Reusable property search view.
 * Used by /propiedades (public, with Navbar) and /inquilino/explorar (embedded in tenant layout).
 */
export function PropertySearchView({ embedded = false, sinNavbar = false, basePath }: PropertySearchViewProps) {
  const searchParams = useSearchParams();
  const heroQuery = searchParams.get('q');
  const { user } = useAuth();
  const { aprobacion, vigente: aprobacionVigente } = useAprobacion();
  /**
   * La aprobación es del inquilino. A este catálogo también entra gente de la
   * inmobiliaria y propietarios, y a ellos "todavía no sabes hasta cuánto
   * puedes arrendar" no les dice nada — no son los que arriendan.
   * Anónimo SÍ la ve: es el caso principal, quien llega por el link del asesor.
   */
  const mostrarAprobacion = !user || user.role === 'tenant';
  const [showMap, setShowMap] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [aiSearchQuery, setAiSearchQuery] = useState(heroQuery || '');
  // The natural-language query actually applied to the fetch. Feeding it into
  // apiFilters (below) lets the backend NL parser filter the MAIN grid — one
  // source of truth — instead of an isolated preview panel.
  const [appliedQuery, setAppliedQuery] = useState(heroQuery || '');
  const [mapKey, setMapKey] = useState(0);
  // On desktop the map panel is part of the split-view (always visible via lg:block),
  // so it should mount there; on mobile it only exists when the user toggles the map.
  const [isDesktop, setIsDesktop] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [showSortList, setShowSortList] = useState(false);
  const propertyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter state
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedBedrooms, setSelectedBedrooms] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);

  // Build API filters from UI state
  const apiFilters = useMemo<PropertyFiltersParams>(() => {
    const filters: PropertyFiltersParams = { limit: 100 };
    // Natural-language query goes to the backend parser (city/type/price/…).
    // Explicit pills below still win via the backend's `filters.x ?? parsed.x`.
    if (appliedQuery.trim()) filters.naturalQuery = appliedQuery.trim();
    if (selectedCity) filters.city = selectedCity;
    if (selectedBedrooms) {
      if (selectedBedrooms !== '4+') {
        filters.bedrooms = parseInt(selectedBedrooms);
      }
    }
    if (selectedType) {
      filters.propertyType = selectedType.toUpperCase() as PropertyFiltersParams['propertyType'];
    }
    if (selectedPrice) {
      const [min, max] = selectedPrice.split('-').map(Number);
      filters.minPrice = min;
      filters.maxPrice = max;
    }
    return filters;
  }, [appliedQuery, selectedCity, selectedBedrooms, selectedType, selectedPrice]);

  // Fetch properties from API
  const { properties: apiProperties, isLoading: isInitialLoading } = useProperties(apiFilters);

  // Use wishlist hook
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

  // Apply the natural-language query to the MAIN fetch. Bumping appliedQuery
  // rebuilds apiFilters → useProperties refetches → the backend parses the text
  // and returns the filtered list straight into the grid below.
  const handleAiSearch = useCallback((query: string) => {
    setAppliedQuery(query.trim());
  }, []);

  // Client-side: handle 4+ bedrooms filter and sorting
  const filteredProperties = useMemo(() => {
    let result = [...apiProperties];

    if (selectedBedrooms === '4+') {
      result = result.filter(p => p.bedrooms >= 4);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.monthlyRent - b.monthlyRent;
        case 'price_desc':
          return b.monthlyRent - a.monthlyRent;
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [apiProperties, selectedBedrooms, sortBy]);

  // Properties with valid coordinates for the map
  const mappableProperties = useMemo(
    () => filteredProperties.filter(p => p.latitude !== 0 || p.longitude !== 0),
    [filteredProperties]
  );

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Recomendado';
  const hasActiveFilters = selectedCity || selectedBedrooms || selectedType || selectedPrice;

  const clearAllFilters = () => {
    setSelectedCity(null);
    setSelectedBedrooms(null);
    setSelectedType(null);
    setSelectedPrice(null);
  };

  const handleWishlistToggle = useCallback(
    (id: string) => {
      toggleWishlist(id);
    },
    [toggleWishlist]
  );

  // Handle property selection from map
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
      >
        <span className="inline-flex items-center gap-1.5">
          {options.find(o => o.value === selectedValue)?.label || label}
          <CaretDown className={cn('w-3.5 h-3.5 transition-transform', activeFilter === id && 'rotate-180')} />
        </span>
      </Chip>
      {activeFilter === id && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setActiveFilter(null)} />
          <div className="absolute left-0 top-full mt-1 py-1 bg-surface border border-border rounded-md z-[110] min-w-[140px]">
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

  // ── Layout ──
  return (
    <div className={cn(
      embedded
        ? 'flex flex-col h-[calc(100vh-64px)]'
        : 'min-h-screen bg-background'
    )}>
      {!embedded && !sinNavbar && <Navbar />}

      {/* Main Layout - Split View */}
      <div className={cn(
        'flex',
        embedded ? 'flex-1 min-h-0' : 'pt-16 lg:pt-[76px]'
      )}>
        {/* Left Panel - Scrollable Content */}
        <div
          className={cn(
            // `contenedor-consulta` = container-type: inline-size. La grilla de
            // adentro mide ESTE ancho, no el de la ventana: en media pantalla
            // los breakpoints de viewport medían lo que no era.
            'contenedor-consulta w-full lg:w-1/2 2xl:w-3/5',
            embedded ? 'overflow-y-auto' : 'min-h-screen',
            showMap && 'hidden lg:block'
          )}
        >
          {/* Hero query banner */}
          {heroQuery && (
            <div className="bg-black/5 dark:bg-white/5 border-b border-border px-4 md:px-6 py-3">
              <p className="text-sm text-muted-foreground">
                Resultados basados en: <span className="font-medium text-foreground">&laquo;{heroQuery}&raquo;</span>
              </p>
            </div>
          )}

          {/* AI Search Section */}
          <div className="bg-background py-4 md:py-5">
            <div className="px-4 md:px-6">
              <h1 className={cn(
                'font-medium text-foreground tracking-tight mb-4',
                embedded ? 'text-base' : 'text-lg'
              )}>
                Búsqueda inteligente
              </h1>
              <AISearchInput
                value={aiSearchQuery}
                onChange={setAiSearchQuery}
                onMagnifyingGlass={handleAiSearch}
                onClear={() => {
                  setAiSearchQuery('');
                  setAppliedQuery('');
                }}
                isMagnifyingGlassing={isInitialLoading}
              />
            </div>
          </div>

          {/* Filters & Results Bar */}
          <div className="bg-background border-y border-border">
            <div className="px-4 md:px-6 py-3">
              {/* Filter Pills Row */}
              <div className="flex items-center gap-2 mb-3 pb-1 flex-wrap">
                {renderFilterDropdown(
                  'city',
                  'Ciudad',
                  selectedCity,
                  CITIES.map(c => ({ value: c, label: c })),
                  setSelectedCity
                )}
                {renderFilterDropdown(
                  'bedrooms',
                  'Habitaciones',
                  selectedBedrooms,
                  BEDROOMS.map(b => ({ value: b, label: `${b} habitacion${b !== '1' ? 'es' : ''}` })),
                  setSelectedBedrooms
                )}
                {renderFilterDropdown(
                  'type',
                  'Tipo',
                  selectedType,
                  PROPERTY_TYPES,
                  setSelectedType
                )}
                {renderFilterDropdown(
                  'price',
                  'Precio',
                  selectedPrice,
                  PRICE_RANGES,
                  setSelectedPrice
                )}

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    hideArrow
                    onClick={clearAllFilters}
                    className="gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpiar
                  </Button>
                )}
              </div>

              {/* Results Count + Sort */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground/70">
                  <span className="font-medium text-foreground font-mono tabular-nums">{filteredProperties.length}</span> propiedades
                </p>

                {/* Sort Dropdown */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    hideArrow
                    onClick={() => setShowSortList(!showSortList)}
                    className="gap-2 px-2 text-sm font-normal text-foreground/70 hover:text-foreground"
                  >
                    <span>{currentSortLabel}</span>
                    <CaretDown className={cn('w-4 h-4 transition-transform', showSortList && 'rotate-180')} />
                  </Button>

                  {showSortList && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setShowSortList(false)} />
                      <div className="absolute right-0 top-full mt-2 py-1 bg-surface border border-border rounded-md z-[110] min-w-[160px]">
                        {SORT_OPTIONS.map((option) => (
                          <Button
                            key={option.value}
                            variant="ghost"
                            hideArrow
                            onClick={() => { setSortBy(option.value); setShowSortList(false); }}
                            className={cn(
                              'w-full justify-start h-auto rounded-none px-4 py-2 text-sm font-normal',
                              sortBy === option.value
                                ? 'bg-black/5 dark:bg-white/10 text-foreground font-medium'
                                : 'text-foreground/70 hover:bg-black/5 dark:hover:bg-white/10'
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
              onWishlistToggle={handleWishlistToggle}
              isLoading={isInitialLoading}
              hoveredPropertyId={hoveredPropertyId}
              onPropertyHover={setHoveredPropertyId}
              propertyRefCallback={propertyRefCallback}
              basePath={basePath}
              aprobacion={mostrarAprobacion && aprobacionVigente ? aprobacion : null}
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
