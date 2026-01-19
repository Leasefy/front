'use client';

import { PropertyCard } from '@/components/property/PropertyCard';
import type { Property } from '@/lib/types/property';
import type { QualificationResult } from '@/lib/scoring/qualificationScore';

export interface PropertyGridProps {
  properties: Property[];
  isWishlisted: (id: string) => boolean;
  onWishlistToggle: (id: string) => void;
  /** Map of property ID to qualification result (for personalization badges) */
  qualifications?: Map<string, QualificationResult>;
}

/**
 * Responsive grid layout for property cards
 * 1 column on mobile, 2 on tablet, 3 on desktop
 */
export function PropertyGrid({
  properties,
  isWishlisted,
  onWishlistToggle,
  qualifications,
}: PropertyGridProps) {
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl">🏠</div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          No se encontraron propiedades
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Intenta ajustar los filtros para ver mas resultados
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          isWishlisted={isWishlisted(property.id)}
          onWishlistToggle={onWishlistToggle}
          qualification={qualifications?.get(property.id)}
        />
      ))}
    </div>
  );
}
