'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

import { Navbar } from '@/components/layout/Navbar';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { FilterBar } from '@/components/property/FilterBar';
import { PropertyMap, MapToggle } from '@/components/map';
import { usePropertyFilters } from '@/lib/hooks/usePropertyFilters';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { mockProperties } from '@/lib/data/mock-properties';
import { cn } from '@/lib/utils';

/**
 * Property listing page with Zillow-style split layout
 * - Horizontal filter bar at top
 * - 50/50 split: listings | map
 * - 2-column property grid
 */
export default function PropiedadesPage() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const propertyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listPanelRef = useRef<HTMLDivElement>(null);

  // Use wishlist hook
  const { isWishlisted, toggleWishlist } = useWishlist();

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const {
    filters,
    setCity,
    setPriceRange,
    setBedrooms,
    setPropertyType,
    resetFilters,
    filteredProperties,
    availableCities,
    hasActiveFilters,
  } = usePropertyFilters(mockProperties);

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

      <main id="main-content" className="pt-[65px] md:pt-[81px]">
        {/* Filter Bar - Sticky below navbar */}
        <div className="sticky top-[65px] md:top-[81px] z-40 bg-white">
          <FilterBar
            filters={filters}
            onCityChange={setCity}
            onPriceRangeChange={setPriceRange}
            onBedroomsChange={setBedrooms}
            onPropertyTypeChange={setPropertyType}
            onReset={resetFilters}
            availableCities={availableCities}
            resultsCount={filteredProperties.length}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Split Layout: Listings | Map */}
        <div className="flex">
          {/* Listings Panel */}
          <div
            ref={listPanelRef}
            className={cn(
              'w-full lg:w-1/2 bg-white',
              showMap && 'hidden lg:block'
            )}
          >
            <div className="p-4 lg:p-6">
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

          {/* Map Panel - Fixed on right */}
          <div
            className={cn(
              'w-full lg:w-1/2 lg:fixed lg:right-0 lg:top-[65px] md:lg:top-[81px] lg:h-[calc(100vh-65px)] md:lg:h-[calc(100vh-81px)]',
              !showMap && 'hidden lg:block'
            )}
          >
            <PropertyMap
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
      </main>
    </div>
  );
}
