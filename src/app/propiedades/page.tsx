'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, X, SlidersHorizontal } from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { AISearchInput } from '@/components/property/AISearchInput';
import { PropertyMap, MapToggle } from '@/components/map';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { mockProperties } from '@/lib/data/mock-properties';
import { cn } from '@/lib/utils';

/**
 * Property listing page with full-height split layout
 * - Left: AI search + filters + property grid (scrollable)
 * - Right: Map (fixed, full height)
 */
const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recomendado' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'newest', label: 'Mas reciente' },
];

const CITIES = ['Bogota', 'Medellin', 'Cali', 'Barranquilla', 'Cartagena'];
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
  { value: '4000000-99999999', label: 'Mas de $4M' },
];

export default function PropiedadesPage() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [showAiResults, setShowAiResults] = useState(false);
  const [aiResults, setAiResults] = useState<typeof mockProperties>([]);
  const [mapKey, setMapKey] = useState(0);
  const [sortBy, setSortBy] = useState('recommended');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const propertyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter state
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedBedrooms, setSelectedBedrooms] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);

  // Use wishlist hook
  const { isWishlisted, toggleWishlist } = useWishlist();

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Force map reload on mount to fix intermittent loading
  useEffect(() => {
    const timer = setTimeout(() => setMapKey(prev => prev + 1), 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle AI search
  const handleAiSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setShowAiResults(false);
      setAiResults([]);
      return;
    }

    setIsAiSearching(true);
    setShowAiResults(false);

    // Simulate AI processing and return random results
    setTimeout(() => {
      setIsAiSearching(false);
      // Get random 4-8 properties as "AI results"
      const shuffled = [...mockProperties].sort(() => 0.5 - Math.random());
      const resultCount = Math.floor(Math.random() * 5) + 4;
      setAiResults(shuffled.slice(0, resultCount));
      setShowAiResults(true);
    }, 1800);
  }, []);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let result = [...mockProperties];

    // Apply filters
    if (selectedCity) {
      result = result.filter(p => p.city === selectedCity);
    }
    if (selectedBedrooms) {
      if (selectedBedrooms === '4+') {
        result = result.filter(p => p.bedrooms >= 4);
      } else {
        result = result.filter(p => p.bedrooms === parseInt(selectedBedrooms));
      }
    }
    if (selectedType) {
      result = result.filter(p => p.type === selectedType);
    }
    if (selectedPrice) {
      const [min, max] = selectedPrice.split('-').map(Number);
      result = result.filter(p => {
        return p.monthlyRent >= min && p.monthlyRent <= max;
      });
    }

    // Apply sorting
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
  }, [selectedCity, selectedBedrooms, selectedType, selectedPrice, sortBy]);

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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Main Layout - Split View */}
      <div className="pt-[65px] md:pt-[81px] flex">
        {/* Left Panel - Scrollable Content */}
        <div
          className={cn(
            'w-full lg:w-1/2 min-h-[calc(100vh-65px)] md:min-h-[calc(100vh-81px)]',
            showMap && 'hidden lg:block'
          )}
        >
          {/* AI Search Section */}
          <div className="bg-white py-4 md:py-5">
            <div className="px-4 md:px-6">
              <h1 className="text-lg font-medium text-black tracking-tight mb-4">
                Busqueda inteligente
              </h1>
              <AISearchInput
                value={aiSearchQuery}
                onChange={setAiSearchQuery}
                onSearch={handleAiSearch}
                isSearching={isAiSearching}
                results={aiResults}
                showResults={showAiResults}
              />
            </div>
          </div>

          {/* Filter & Results Bar */}
          <div className="sticky top-[65px] md:top-[81px] z-40 bg-white border-y border-black/5">
            <div className="px-4 md:px-6 py-3">
              {/* Filter Pills Row */}
              <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                {/* City Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveFilter(activeFilter === 'city' ? null : 'city')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-[2px] border transition-colors whitespace-nowrap',
                      selectedCity
                        ? 'bg-black text-white border-black'
                        : 'border-black/20 text-black/70 hover:border-black/40'
                    )}
                  >
                    {selectedCity || 'Ciudad'}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {activeFilter === 'city' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveFilter(null)} />
                      <div className="absolute left-0 top-full mt-1 py-1 bg-white border border-black/10 rounded-[2px] shadow-lg z-50 min-w-[140px]">
                        {CITIES.map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => { setSelectedCity(selectedCity === city ? null : city); setActiveFilter(null); }}
                            className={cn('w-full px-3 py-2 text-left text-sm', selectedCity === city ? 'bg-black/5 font-medium' : 'hover:bg-black/5')}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Bedrooms Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveFilter(activeFilter === 'bedrooms' ? null : 'bedrooms')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-[2px] border transition-colors whitespace-nowrap',
                      selectedBedrooms
                        ? 'bg-black text-white border-black'
                        : 'border-black/20 text-black/70 hover:border-black/40'
                    )}
                  >
                    {selectedBedrooms ? `${selectedBedrooms} hab` : 'Habitaciones'}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {activeFilter === 'bedrooms' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveFilter(null)} />
                      <div className="absolute left-0 top-full mt-1 py-1 bg-white border border-black/10 rounded-[2px] shadow-lg z-50 min-w-[120px]">
                        {BEDROOMS.map((bed) => (
                          <button
                            key={bed}
                            type="button"
                            onClick={() => { setSelectedBedrooms(selectedBedrooms === bed ? null : bed); setActiveFilter(null); }}
                            className={cn('w-full px-3 py-2 text-left text-sm', selectedBedrooms === bed ? 'bg-black/5 font-medium' : 'hover:bg-black/5')}
                          >
                            {bed} habitacion{bed !== '1' ? 'es' : ''}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveFilter(activeFilter === 'type' ? null : 'type')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-[2px] border transition-colors whitespace-nowrap',
                      selectedType
                        ? 'bg-black text-white border-black'
                        : 'border-black/20 text-black/70 hover:border-black/40'
                    )}
                  >
                    {PROPERTY_TYPES.find(t => t.value === selectedType)?.label || 'Tipo'}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {activeFilter === 'type' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveFilter(null)} />
                      <div className="absolute left-0 top-full mt-1 py-1 bg-white border border-black/10 rounded-[2px] shadow-lg z-50 min-w-[140px]">
                        {PROPERTY_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => { setSelectedType(selectedType === type.value ? null : type.value); setActiveFilter(null); }}
                            className={cn('w-full px-3 py-2 text-left text-sm', selectedType === type.value ? 'bg-black/5 font-medium' : 'hover:bg-black/5')}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Price Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveFilter(activeFilter === 'price' ? null : 'price')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-[2px] border transition-colors whitespace-nowrap',
                      selectedPrice
                        ? 'bg-black text-white border-black'
                        : 'border-black/20 text-black/70 hover:border-black/40'
                    )}
                  >
                    {PRICE_RANGES.find(p => p.value === selectedPrice)?.label || 'Precio'}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {activeFilter === 'price' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveFilter(null)} />
                      <div className="absolute left-0 top-full mt-1 py-1 bg-white border border-black/10 rounded-[2px] shadow-lg z-50 min-w-[160px]">
                        {PRICE_RANGES.map((range) => (
                          <button
                            key={range.value}
                            type="button"
                            onClick={() => { setSelectedPrice(selectedPrice === range.value ? null : range.value); setActiveFilter(null); }}
                            className={cn('w-full px-3 py-2 text-left text-sm', selectedPrice === range.value ? 'bg-black/5 font-medium' : 'hover:bg-black/5')}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-black/50 hover:text-black transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpiar
                  </button>
                )}
              </div>

              {/* Results Count + Sort */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-black/70">
                  <span className="font-medium text-black">{filteredProperties.length}</span> propiedades
                </p>

                {/* Sort Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-2 text-sm text-black/70 hover:text-black transition-colors"
                  >
                    <span>{currentSortLabel}</span>
                    <ChevronDown className={cn('w-4 h-4 transition-transform', showSortMenu && 'rotate-180')} />
                  </button>

                  {showSortMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 py-1 bg-white border border-black/10 rounded-[2px] shadow-lg z-50 min-w-[160px]">
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => { setSortBy(option.value); setShowSortMenu(false); }}
                            className={cn('w-full px-4 py-2 text-left text-sm transition-colors', sortBy === option.value ? 'bg-black/5 text-black font-medium' : 'text-black/70 hover:bg-black/5')}
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
            'w-full lg:w-1/2 lg:fixed lg:right-0 lg:top-[65px] md:lg:top-[81px]',
            'h-[calc(100vh-65px)] md:h-[calc(100vh-81px)]',
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
