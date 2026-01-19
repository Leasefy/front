'use client';

import { useState, useCallback, useEffect } from 'react';

import { PropertyGrid } from '@/components/property/PropertyGrid';
import { FilterSidebar } from '@/components/property/FilterSidebar';
import { usePropertyFilters } from '@/lib/hooks/usePropertyFilters';
import { mockProperties } from '@/lib/data/mock-properties';

const WISHLIST_STORAGE_KEY = 'arriendo-facil-wishlist';

/**
 * Property listing page with filtering and wishlist functionality
 * Route: /propiedades
 */
export default function PropiedadesPage() {
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (saved) {
      try {
        setWishlistedIds(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save wishlist to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistedIds));
  }, [wishlistedIds]);

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

  const isWishlisted = useCallback(
    (id: string) => wishlistedIds.includes(id),
    [wishlistedIds]
  );

  const handleWishlistToggle = useCallback((id: string) => {
    setWishlistedIds((prev) =>
      prev.includes(id) ? prev.filter((wId) => wId !== id) : [...prev, id]
    );
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Encuentra tu proximo hogar
        </h1>
        <p className="mt-2 text-muted-foreground">
          {filteredProperties.length}{' '}
          {filteredProperties.length === 1 ? 'propiedad disponible' : 'propiedades disponibles'}
        </p>
      </div>

      {/* Main content: Sidebar + Grid */}
      <div className="flex flex-col gap-8 lg:flex-row">
        <FilterSidebar
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

        <main className="flex-1">
          <PropertyGrid
            properties={filteredProperties}
            isWishlisted={isWishlisted}
            onWishlistToggle={handleWishlistToggle}
          />
        </main>
      </div>
    </div>
  );
}
