'use client';

import Image from 'next/image';
import { Heart, Bed, Bath, Maximize } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatArea } from '@/lib/format';
import type { Property } from '@/lib/types/property';

export interface PropertyCardProps {
  property: Property;
  isWishlisted?: boolean;
  onWishlistToggle?: (propertyId: string) => void;
  className?: string;
}

/**
 * Property card component for catalog display
 * Shows image, price, location, and key features
 */
export function PropertyCard({
  property,
  isWishlisted = false,
  onWishlistToggle,
  className,
}: PropertyCardProps) {
  const {
    id,
    title,
    thumbnailUrl,
    monthlyRent,
    neighborhood,
    city,
    bedrooms,
    bathrooms,
    area,
    status,
  } = property;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlistToggle?.(id);
  };

  return (
    <Card
      className={cn(
        'group overflow-hidden transition-shadow duration-200 hover:shadow-lg',
        className
      )}
    >
      {/* Image container with aspect ratio */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={thumbnailUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-200 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Wishlist button overlay */}
        <button
          onClick={handleWishlistClick}
          className={cn(
            'absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm transition-colors',
            'hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            isWishlisted && 'text-red-500'
          )}
          aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Heart
            className={cn('h-5 w-5', isWishlisted && 'fill-current')}
          />
        </button>

        {/* Status badge if not available */}
        {status !== 'available' && (
          <Badge
            variant={status === 'pending' ? 'secondary' : 'outline'}
            className="absolute left-3 top-3"
          >
            {status === 'pending' ? 'En proceso' : 'Arrendado'}
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        {/* Price */}
        <p className="text-lg font-bold text-foreground">
          {formatCurrency(monthlyRent)}
          <span className="text-sm font-normal text-muted-foreground">
            /mes
          </span>
        </p>

        {/* Title - truncated */}
        <h3 className="mt-1 truncate text-sm font-medium text-foreground">
          {title}
        </h3>

        {/* Location */}
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {neighborhood}, {city}
        </p>

        {/* Features row */}
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span>{bedrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span>{bathrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize className="h-4 w-4" />
            <span>{formatArea(area)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
