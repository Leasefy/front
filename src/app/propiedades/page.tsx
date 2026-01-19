'use client';

import { useState, useCallback, useEffect } from 'react';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { FilterSidebar } from '@/components/property/FilterSidebar';
import { AISearchInput } from '@/components/property/AISearchInput';
import { usePropertyFilters } from '@/lib/hooks/usePropertyFilters';
import { mockProperties } from '@/lib/data/mock-properties';
import { SectionLabel } from '@/components/ui/section-label';
import { parseSearchQuery } from '@/lib/search/parseSearchQuery';

const WISHLIST_STORAGE_KEY = 'arriendo-facil-wishlist';

/**
 * Property listing page - Luxterra style
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
    setFromParsedQuery,
    setSearchQuery,
    filteredProperties,
    availableCities,
    hasActiveFilters,
  } = usePropertyFilters(mockProperties);

  /**
   * Handle AI search submission
   * Parses the query and updates filters
   */
  const handleAISearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        resetFilters();
        return;
      }
      const parsed = parseSearchQuery(query);
      setFromParsedQuery(parsed);
    },
    [setFromParsedQuery, resetFilters]
  );

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
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Hero Header with AI Search - Luxterra style */}
        <section className="bg-background pt-32 pb-12">
          <div className="container-wide">
            <SectionLabel className="text-muted-foreground mb-4">Propiedades</SectionLabel>
            <h1 className="heading-display text-foreground mb-4">
              Encuentra tu proximo hogar
            </h1>
            <p className="body-text text-muted-foreground max-w-xl mb-8">
              Explora nuestra seleccion de propiedades en las mejores ubicaciones de Colombia
            </p>

            {/* AI Search Input */}
            <AISearchInput
              value={filters.searchQuery}
              onChange={setSearchQuery}
              onSearch={handleAISearch}
              className="max-w-3xl"
            />
          </div>
        </section>

        {/* Listing Section */}
        <section className="light-section bg-[#f7f7f7] section-padding">
          <div className="container-wide">
            {/* Results count */}
            <div className="mb-8">
              <p className="text-xs text-gray-600 tracking-tight">
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

              <div className="flex-1">
                <PropertyGrid
                  properties={filteredProperties}
                  isWishlisted={isWishlisted}
                  onWishlistToggle={handleWishlistToggle}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
