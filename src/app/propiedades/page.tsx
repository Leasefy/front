'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { User, UserX } from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { FilterSidebar } from '@/components/property/FilterSidebar';
import { AISearchInput } from '@/components/property/AISearchInput';
import { ForYouCarousel } from '@/components/property/ForYouCarousel';
import { usePropertyFilters } from '@/lib/hooks/usePropertyFilters';
import { mockProperties } from '@/lib/data/mock-properties';
import { SectionLabel } from '@/components/ui/section-label';
import { parseSearchQuery } from '@/lib/search/parseSearchQuery';
import {
  UserProfileProvider,
  useUserProfile,
} from '@/lib/context/UserProfileContext';
import {
  rankPropertiesByMatch,
  calculateQualification,
  filterAffordableProperties,
  type QualificationResult,
} from '@/lib/scoring/qualificationScore';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

const WISHLIST_STORAGE_KEY = 'arriendo-facil-wishlist';

/**
 * Property listing page - Luxterra style
 * Route: /propiedades
 */
export default function PropiedadesPage() {
  return (
    <UserProfileProvider>
      <PropiedadesContent />
    </UserProfileProvider>
  );
}

/**
 * Main content component with personalization
 */
function PropiedadesContent() {
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [onlyAffordable, setOnlyAffordable] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const { profile, isSimulating, enableSimulation, disableSimulation } =
    useUserProfile();

  // Simulate initial loading state to demonstrate skeleton loaders
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

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
   * Parses the query and updates filters with animated loading state
   */
  const handleAISearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        resetFilters();
        return;
      }

      // Show searching animation for conversational feel
      setIsSearching(true);

      // Simulate AI processing time for magical feel
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const parsed = parseSearchQuery(query);
      setFromParsedQuery(parsed);
      setIsSearching(false);
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

  // Personalization: Top matches for carousel
  const topMatches = useMemo(() => {
    if (!profile?.hasCompletedProfile) return [];
    return rankPropertiesByMatch(mockProperties, profile, 6);
  }, [profile]);

  // Personalization: Qualification map for all properties
  const qualifications = useMemo(() => {
    if (!profile?.hasCompletedProfile) return undefined;
    const map = new Map<string, QualificationResult>();
    mockProperties.forEach((property) => {
      map.set(property.id, calculateQualification(property, profile));
    });
    return map;
  }, [profile]);

  // Apply affordability filter if enabled
  const displayProperties = useMemo(() => {
    if (!onlyAffordable || !profile?.hasCompletedProfile) {
      return filteredProperties;
    }
    return filterAffordableProperties(filteredProperties, profile);
  }, [filteredProperties, onlyAffordable, profile]);

  const showPersonalization = profile?.hasCompletedProfile ?? false;

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen">
        {/* Hero Header with AI Search - Luxterra style */}
        <section className="bg-background pt-32 pb-12">
          <div className="container-wide">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SectionLabel className="text-muted-foreground mb-4">Propiedades</SectionLabel>
                <h1 className="heading-display text-foreground mb-4">
                  Encuentra tu proximo hogar
                </h1>
                <p className="body-text text-muted-foreground max-w-xl mb-8">
                  Explora nuestra seleccion de propiedades en las mejores ubicaciones de Colombia
                </p>
              </div>

              {/* Simulation toggle for testing */}
              <SimulationToggle
                isSimulating={isSimulating}
                onEnable={enableSimulation}
                onDisable={disableSimulation}
                maxAffordableRent={profile?.maxAffordableRent}
              />
            </div>

            {/* AI Search Input */}
            <AISearchInput
              value={filters.searchQuery}
              onChange={setSearchQuery}
              onSearch={handleAISearch}
              isSearching={isSearching}
              className="max-w-3xl"
            />
          </div>
        </section>

        {/* For You Carousel - only when user has profile */}
        {showPersonalization && topMatches.length > 0 && (
          <section className="bg-background pb-12">
            <div className="container-wide">
              <ForYouCarousel scoredProperties={topMatches} />
            </div>
          </section>
        )}

        {/* Listing Section */}
        <section className="light-section bg-[#f7f7f7] section-padding">
          <div className="container-wide">
            {/* Results count - contextual based on search/filter state */}
            <div className="mb-8">
              <p className="text-xs text-gray-600 tracking-tight">
                {hasActiveFilters || filters.searchQuery ? (
                  <>
                    {displayProperties.length}{' '}
                    {displayProperties.length === 1
                      ? 'propiedad encontrada'
                      : 'propiedades encontradas'}
                  </>
                ) : (
                  <>
                    {displayProperties.length}{' '}
                    {displayProperties.length === 1
                      ? 'propiedad disponible'
                      : 'propiedades disponibles'}
                  </>
                )}
                {onlyAffordable && showPersonalization && (
                  <span className="text-green-600 ml-2">
                    (filtrado por tu presupuesto)
                  </span>
                )}
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
                resultsCount={displayProperties.length}
                hasActiveFilters={hasActiveFilters}
                showPersonalization={showPersonalization}
                onlyAffordable={onlyAffordable}
                onOnlyAffordableChange={setOnlyAffordable}
              />

              <div className="flex-1">
                <PropertyGrid
                  properties={displayProperties}
                  isWishlisted={isWishlisted}
                  onWishlistToggle={handleWishlistToggle}
                  qualifications={showPersonalization ? qualifications : undefined}
                  isLoading={isInitialLoading}
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

/**
 * Simulation toggle component for testing personalization
 * In production, this would be replaced with actual auth state
 */
function SimulationToggle({
  isSimulating,
  onEnable,
  onDisable,
  maxAffordableRent,
}: {
  isSimulating: boolean;
  onEnable: () => void;
  onDisable: () => void;
  maxAffordableRent?: number;
}) {
  return (
    <div className="shrink-0">
      <button
        onClick={isSimulating ? onDisable : onEnable}
        aria-pressed={isSimulating}
        aria-label={isSimulating ? 'Desactivar simulacion de usuario' : 'Activar simulacion de usuario'}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-sm text-xs transition-all',
          isSimulating
            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
        )}
      >
        {isSimulating ? (
          <>
            <User className="h-4 w-4" />
            <span>Usuario simulado</span>
          </>
        ) : (
          <>
            <UserX className="h-4 w-4" />
            <span>Simular usuario</span>
          </>
        )}
      </button>
      {isSimulating && maxAffordableRent && (
        <p className="text-xs text-gray-500 mt-2 text-right">
          Presupuesto: {formatCurrency(maxAffordableRent)}/mes
        </p>
      )}
    </div>
  );
}
