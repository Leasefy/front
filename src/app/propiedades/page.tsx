'use client';

import { Suspense, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CaretDown, X, SlidersHorizontal } from '@phosphor-icons/react';

import { Navbar } from '@/components/layout/Navbar';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { AISearchInput } from '@/components/property/AISearchInput';
import { PropertyMap, MapToggle } from '@/components/map';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useProperties } from '@/lib/hooks/useProperties';
import { cn } from '@/lib/utils';
import type { PropertyFiltersParams } from '@/lib/api/properties.types';
import type { Property } from '@/lib/types/property';

/**
 * Property listing page with full-height split layout
 * - Left: AI search + filters + property grid (scrollable)
 * - Right: Map (fixed, full height)
 */
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

export default function PropiedadesPage() {
  return (
    <Suspense>
      <PropiedadesContent />
    </Suspense>
  );
}

function PropiedadesContent() {
  const searchParams = useSearchParams();
  const heroQuery = searchParams.get('q');
  const [showMap, setShowMap] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [aiMagnifyingGlassQuery, setAiMagnifyingGlassQuery] = useState(heroQuery || '');
  const [isAiMagnifyingGlassing, setIsAiMagnifyingGlassing] = useState(false);
  const [showAiResults, setShowAiResults] = useState(false);
  const [aiResults, setAiResults] = useState<Property[]>([]);
  const [mapKey, setMapKey] = useState(0);
  const [sortBy, setSortBy] = useState('recommended');
  const [showSortList, setShowSortList] = useState(false);
  const propertyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const heroMagnifyingGlassTriggered = useRef(false);

  // Funnel state
  const [activeFunnel, setActiveFunnel] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedBedrooms, setSelectedBedrooms] = useState<string | null>(null);
  const [selectedTextT, setSelectedTextT] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);

  // Build API filters from UI state
  const apiFilters = useMemo<PropertyFiltersParams>(() => {
    const filters: PropertyFiltersParams = { limit: 100 };
    if (selectedCity) filters.city = selectedCity;
    if (selectedBedrooms) {
      if (selectedBedrooms !== '4+') {
        filters.bedrooms = parseInt(selectedBedrooms);
      }
      // 4+ handled client-side after fetch
    }
    if (selectedTextT) {
      filters.propertyType = selectedTextT.toUpperCase() as PropertyFiltersParams['propertyType'];
    }
    if (selectedPrice) {
      const [min, max] = selectedPrice.split('-').map(Number);
      filters.minPrice = min;
      filters.maxPrice = max;
    }
    return filters;
  }, [selectedCity, selectedBedrooms, selectedTextT, selectedPrice]);

  // Fetch properties from API
  const { properties: apiProperties, isLoading: isInitialLoading } = useProperties(apiFilters);

  // Use wishlist hook
  const { isWishlisted, toggleWishlist } = useWishlist();

  // Force map reload on mount to fix intermittent loading
  useEffect(() => {
    const timer = setTimeout(() => setMapKey(prev => prev + 1), 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle AI search via backend naturalQuery
  const handleAiMagnifyingGlass = useCallback(async (query: string) => {
    if (!query.trim()) {
      setShowAiResults(false);
      setAiResults([]);
      return;
    }

    setIsAiMagnifyingGlassing(true);
    setShowAiResults(false);

    try {
      const { propertiesApi } = await import('@/lib/api/properties.service');
      const result = await propertiesApi.list({ naturalQuery: query, limit: 20 });
      setAiResults(result.data);
      setShowAiResults(true);
    } catch {
      setAiResults([]);
      setShowAiResults(true);
    } finally {
      setIsAiMagnifyingGlassing(false);
    }
  }, []);

  // Auto-trigger AI search from hero query param
  useEffect(() => {
    if (heroQuery && !heroMagnifyingGlassTriggered.current) {
      heroMagnifyingGlassTriggered.current = true;
      handleAiMagnifyingGlass(heroQuery);
    }
  }, [heroQuery, handleAiMagnifyingGlass]);

  // Client-side: handle 4+ bedrooms filter and sorting (API handles other filters)
  const filteredProperties = useMemo(() => {
    let result = [...apiProperties];

    // 4+ bedrooms is handled client-side since API does exact match
    if (selectedBedrooms === '4+') {
      result = result.filter(p => p.bedrooms >= 4);
    }

    // Apply client-side sorting
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

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Recomendado';
  const hasActiveFunnels = selectedCity || selectedBedrooms || selectedTextT || selectedPrice;

  const clearAllFunnels = () => {
    setSelectedCity(null);
    setSelectedBedrooms(null);
    setSelectedTextT(null);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Layout - Split View */}
      <div className="flex pt-[76px]">
        {/* Left Panel - Scrollable Content */}
        <div
          className={cn(
            'w-full lg:w-1/2 min-h-screen',
            showMap && 'hidden lg:block'
          )}
        >
          {/* Hero query banner */}
          {heroQuery && (
            <div className="bg-black/5 border-b border-border px-4 md:px-6 py-3">
              <p className="text-sm text-muted-foreground">
                Resultados basados en: <span className="font-medium text-foreground">&laquo;{heroQuery}&raquo;</span>
              </p>
            </div>
          )}

          {/* AI MagnifyingGlass Section */}
          <div className="bg-background py-4 md:py-5">
            <div className="px-4 md:px-6">
              <h1 className="text-lg font-medium text-foreground tracking-tight mb-4">
                Busqueda inteligente
              </h1>
              <AISearchInput
                value={aiMagnifyingGlassQuery}
                onChange={setAiMagnifyingGlassQuery}
                onMagnifyingGlass={handleAiMagnifyingGlass}
                onClear={() => {
                  setShowAiResults(false);
                  setAiResults([]);
                }}
                isMagnifyingGlassing={isAiMagnifyingGlassing}
                results={aiResults}
                showResults={showAiResults}
              />
            </div>
          </div>

          {/* Funnel & Results Bar */}
          <div className="bg-background border-y border-border">
            <div className="px-4 md:px-6 py-3">
              {/* Funnel Pills Row */}
              <div className="flex items-center gap-2 mb-3 pb-1 flex-wrap">
                {/* City Funnel */}
                <div className="relative z-10">
                  <button
                    type="button"
                    onClick={() => {
                      console.log('City filter clicked, current:', activeFunnel);
                      setActiveFunnel(activeFunnel === 'city' ? null : 'city');
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm border transition-colors whitespace-nowrap cursor-pointer',
                      selectedCity
                        ? 'bg-black text-white border-black'
                        : 'border-border text-foreground/70 hover:border-foreground/30'
                    )}
                  >
                    {selectedCity || 'Ciudad'}
                    <CaretDown className={cn('w-3.5 h-3.5 transition-transform', activeFunnel === 'city' && 'rotate-180')} />
                  </button>
                  {activeFunnel === 'city' && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setActiveFunnel(null)} />
                      <div className="absolute left-0 top-full mt-1 py-1 bg-white border border-border rounded-sm shadow-xl z-[110] min-w-[140px]">
                        {CITIES.map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => { setSelectedCity(selectedCity === city ? null : city); setActiveFunnel(null); }}
                            className={cn('w-full px-3 py-2 text-left text-sm', selectedCity === city ? 'bg-black/5 font-medium' : 'hover:bg-black/5')}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Bedrooms Funnel */}
                <div className="relative z-10">
                  <button
                    type="button"
                    onClick={() => setActiveFunnel(activeFunnel === 'bedrooms' ? null : 'bedrooms')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm border transition-colors whitespace-nowrap cursor-pointer',
                      selectedBedrooms
                        ? 'bg-black text-white border-black'
                        : 'border-border text-foreground/70 hover:border-foreground/30'
                    )}
                  >
                    {selectedBedrooms ? `${selectedBedrooms} hab` : 'Habitaciones'}
                    <CaretDown className={cn('w-3.5 h-3.5 transition-transform', activeFunnel === 'bedrooms' && 'rotate-180')} />
                  </button>
                  {activeFunnel === 'bedrooms' && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setActiveFunnel(null)} />
                      <div className="absolute left-0 top-full mt-1 py-1 bg-white border border-border rounded-sm shadow-xl z-[110] min-w-[120px]">
                        {BEDROOMS.map((bed) => (
                          <button
                            key={bed}
                            type="button"
                            onClick={() => { setSelectedBedrooms(selectedBedrooms === bed ? null : bed); setActiveFunnel(null); }}
                            className={cn('w-full px-3 py-2 text-left text-sm', selectedBedrooms === bed ? 'bg-black/5 font-medium' : 'hover:bg-black/5')}
                          >
                            {bed} habitacion{bed !== '1' ? 'es' : ''}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* TextT Funnel */}
                <div className="relative z-10">
                  <button
                    type="button"
                    onClick={() => setActiveFunnel(activeFunnel === 'type' ? null : 'type')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm border transition-colors whitespace-nowrap cursor-pointer',
                      selectedTextT
                        ? 'bg-black text-white border-black'
                        : 'border-border text-foreground/70 hover:border-foreground/30'
                    )}
                  >
                    {PROPERTY_TYPES.find(t => t.value === selectedTextT)?.label || 'Tipo'}
                    <CaretDown className={cn('w-3.5 h-3.5 transition-transform', activeFunnel === 'type' && 'rotate-180')} />
                  </button>
                  {activeFunnel === 'type' && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setActiveFunnel(null)} />
                      <div className="absolute left-0 top-full mt-1 py-1 bg-white border border-border rounded-sm shadow-xl z-[110] min-w-[140px]">
                        {PROPERTY_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => { setSelectedTextT(selectedTextT === type.value ? null : type.value); setActiveFunnel(null); }}
                            className={cn('w-full px-3 py-2 text-left text-sm', selectedTextT === type.value ? 'bg-black/5 font-medium' : 'hover:bg-black/5')}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Price Funnel */}
                <div className="relative z-10">
                  <button
                    type="button"
                    onClick={() => setActiveFunnel(activeFunnel === 'price' ? null : 'price')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm border transition-colors whitespace-nowrap cursor-pointer',
                      selectedPrice
                        ? 'bg-black text-white border-black'
                        : 'border-border text-foreground/70 hover:border-foreground/30'
                    )}
                  >
                    {PRICE_RANGES.find(p => p.value === selectedPrice)?.label || 'Precio'}
                    <CaretDown className={cn('w-3.5 h-3.5 transition-transform', activeFunnel === 'price' && 'rotate-180')} />
                  </button>
                  {activeFunnel === 'price' && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setActiveFunnel(null)} />
                      <div className="absolute left-0 top-full mt-1 py-1 bg-white border border-border rounded-sm shadow-xl z-[110] min-w-[160px]">
                        {PRICE_RANGES.map((range) => (
                          <button
                            key={range.value}
                            type="button"
                            onClick={() => { setSelectedPrice(selectedPrice === range.value ? null : range.value); setActiveFunnel(null); }}
                            className={cn('w-full px-3 py-2 text-left text-sm', selectedPrice === range.value ? 'bg-black/5 font-medium' : 'hover:bg-black/5')}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Clear Funnels */}
                {hasActiveFunnels && (
                  <button
                    type="button"
                    onClick={clearAllFunnels}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpiar
                  </button>
                )}
              </div>

              {/* Results Count + Sort */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground/70">
                  <span className="font-medium text-foreground">{filteredProperties.length}</span> propiedades
                </p>

                {/* Sort Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSortList(!showSortList)}
                    className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
                  >
                    <span>{currentSortLabel}</span>
                    <CaretDown className={cn('w-4 h-4 transition-transform', showSortList && 'rotate-180')} />
                  </button>

                  {showSortList && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setShowSortList(false)} />
                      <div className="absolute right-0 top-full mt-2 py-1 bg-white border border-border rounded-sm shadow-xl z-[110] min-w-[160px]">
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => { setSortBy(option.value); setShowSortList(false); }}
                            className={cn('w-full px-4 py-2 text-left text-sm transition-colors', sortBy === option.value ? 'bg-black/5 text-foreground font-medium' : 'text-foreground/70 hover:bg-black/5')}
                          >
                            {option.label}
                          </button>
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
            <PropertyGrid
              properties={filteredProperties}
              isWishlisted={isWishlisted}
              onWishlistToggle={handleWishlistToggle}
              isLoading={isInitialLoading}
              hoveredPropertyId={hoveredPropertyId}
              onPropertyHover={setHoveredPropertyId}
              propertyRefCallback={propertyRefCallback}
            />
          </div>
        </div>

        {/* Right Panel - Fixed Map (Full Height) */}
        <div
          className={cn(
            'w-full lg:w-1/2 lg:fixed lg:right-0 lg:top-[76px]',
            'h-[calc(100vh-76px)]',
            !showMap && 'hidden lg:block'
          )}
        >
          <PropertyMap
            key={mapKey}
            properties={filteredProperties}
            selectedPropertyId={selectedPropertyId}
            hoveredPropertyId={hoveredPropertyId}
            onPropertySelect={handlePropertySelect}
            onPropertyHover={setHoveredPropertyId}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Mobile Map Toggle */}
      <MapToggle showMap={showMap} onToggle={() => setShowMap(!showMap)} />
    </div>
  );
}
