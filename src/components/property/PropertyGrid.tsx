'use client';

import { useState, useCallback, useEffect } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { PropertyCard } from '@/components/property/PropertyCard';
import { PropertyCardSkeleton } from '@/components/skeleton';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import type { Property } from '@/lib/types/property';
import type { QualificationResult } from '@/lib/scoring/propertyMatching';

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
  /** Currently hovered property ID (for map sync) */
  hoveredPropertyId?: string | null;
  /** Callback when property is hovered (for map sync) */
  onPropertyHover?: (id: string | null) => void;
  /** Ref callback for property elements (for scroll-to-property) */
  propertyRefCallback?: (id: string, el: HTMLDivElement | null) => void;
  /** Prefix for card detail links. Public '/propiedades', tenant '/inquilino/propiedades'. */
  basePath?: string;
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
  hoveredPropertyId,
  onPropertyHover,
  propertyRefCallback,
  basePath,
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
      <div className="space-y-8" role="status" aria-label="Cargando propiedades">
        <span className="sr-only">Cargando propiedades...</span>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
        icon={MagnifyingGlass}
        title="No encontramos propiedades"
        description="Intenta ajustar los filtros para ver más opciones."
        action={{ label: 'Limpiar filtros', href: '/propiedades' }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Property Grid - 2 columns for split view */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {displayedProperties.map((property) => (
          <div
            key={property.id}
            ref={(el) => propertyRefCallback?.(property.id, el)}
            className="animate-in fade-in duration-300"
          >
            <PropertyCard
              property={property}
              isWishlisted={isWishlisted(property.id)}
              onWishlistToggle={onWishlistToggle}
              qualification={qualifications?.get(property.id)}
              isHighlighted={hoveredPropertyId === property.id}
              onHoverStart={() => onPropertyHover?.(property.id)}
              onHoverEnd={() => onPropertyHover?.(null)}
              basePath={basePath}
            />
          </div>
        ))}
      </div>

      {/* Load More Section - Left aligned */}
      {hasMore && (
        <div className="flex flex-col items-start gap-4 pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="text-sm"
          >
            {isLoadingMore ? (
              <>
                <Spinner size="sm" variant="current" className="mr-2" />
                Cargando...
              </>
            ) : (
              <>
                Cargar más
                <span className="ml-2 text-muted-foreground">
                  ({remainingCount} {remainingCount === 1 ? 'propiedad' : 'propiedades'})
                </span>
              </>
            )}
          </Button>

          {/* Progress indicator */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground tracking-tight">
            <span>
              Mostrando {displayedProperties.length} de {properties.length}
            </span>
            <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-muted-foreground rounded-full transition-all duration-300"
                style={{ width: `${(displayedProperties.length / properties.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* End of results indicator - Left aligned */}
      {!hasMore && properties.length > INITIAL_ITEMS && (
        <div className="flex justify-start pt-4">
          <p className="text-xs text-muted-foreground tracking-tight">
            Has visto todas las propiedades disponibles
          </p>
        </div>
      )}
    </div>
  );
}
