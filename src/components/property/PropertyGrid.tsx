'use client';

import { useState, useCallback, useEffect } from 'react';
import { Loader2, Search } from 'lucide-react';
import { PropertyCard } from '@/components/property/PropertyCard';
import { PropertyCardSkeleton } from '@/components/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types/property';
import type { QualificationResult } from '@/lib/scoring/qualificationScore';

const INITIAL_ITEMS = 9;
const LOAD_MORE_ITEMS = 6;
const SKELETON_COUNT = 6;

export interface PropertyGridProps {
  properties: Property[];
  isWishlisted: (id: string) => boolean;
  onWishlistToggle: (id: string) => void;
  /** Map of property ID to qualification result (for personalization badges) */
  qualifications?: Map<string, QualificationResult>;
  /** Show skeleton loaders instead of content */
  isLoading?: boolean;
}

/**
 * Responsive grid layout for property cards with Load More pagination
 * Shows 9 properties initially, loads 6 more per click
 * 1 column on mobile, 2 on tablet, 3 on desktop
 */
export function PropertyGrid({
  properties,
  isWishlisted,
  onWishlistToggle,
  qualifications,
  isLoading: externalLoading = false,
}: PropertyGridProps) {
  const [displayCount, setDisplayCount] = useState(INITIAL_ITEMS);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedIndices, setLoadedIndices] = useState<number[]>([]);

  // Reset display count when properties change (new search/filter)
  useEffect(() => {
    setDisplayCount(INITIAL_ITEMS);
    setLoadedIndices([]);
  }, [properties]);

  const displayedProperties = properties.slice(0, displayCount);
  const hasMore = displayCount < properties.length;
  const remainingCount = properties.length - displayCount;

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);

    // Simulate loading for smooth UX
    setTimeout(() => {
      const newCount = Math.min(displayCount + LOAD_MORE_ITEMS, properties.length);
      // Track newly loaded indices for animation
      const newIndices = Array.from(
        { length: newCount - displayCount },
        (_, i) => displayCount + i
      );
      setLoadedIndices(newIndices);
      setDisplayCount(newCount);
      setIsLoadingMore(false);

      // Clear animation tracking after animation completes
      setTimeout(() => setLoadedIndices([]), 500);
    }, 300);
  }, [displayCount, properties.length]);

  // Show skeleton grid when loading
  if (externalLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No encontramos propiedades"
        description="Intenta ajustar los filtros para ver mas opciones."
        action={{ label: 'Limpiar filtros', href: '/propiedades' }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Property Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {displayedProperties.map((property, index) => (
          <div
            key={property.id}
            className={cn(
              loadedIndices.includes(index) && 'animate-fade-in-up'
            )}
            style={{
              animationDelay: loadedIndices.includes(index)
                ? `${(index - Math.min(...loadedIndices)) * 100}ms`
                : undefined
            }}
          >
            <PropertyCard
              property={property}
              isWishlisted={isWishlisted(property.id)}
              onWishlistToggle={onWishlistToggle}
              qualification={qualifications?.get(property.id)}
            />
          </div>
        ))}
      </div>

      {/* Load More Section */}
      {hasMore && (
        <div className="flex flex-col items-center gap-4 pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="min-w-[200px] text-sm tracking-tight"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                Cargar mas
                <span className="ml-2 text-gray-400">
                  ({remainingCount} {remainingCount === 1 ? 'propiedad' : 'propiedades'})
                </span>
              </>
            )}
          </Button>

          {/* Progress indicator */}
          <div className="flex items-center gap-3 text-xs text-gray-400 tracking-tight">
            <span>
              Mostrando {displayedProperties.length} de {properties.length}
            </span>
            <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-400 rounded-full transition-all duration-300"
                style={{ width: `${(displayedProperties.length / properties.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* End of results indicator */}
      {!hasMore && properties.length > INITIAL_ITEMS && (
        <div className="flex justify-center pt-4">
          <p className="text-xs text-gray-400 tracking-tight">
            Has visto todas las propiedades disponibles
          </p>
        </div>
      )}
    </div>
  );
}
