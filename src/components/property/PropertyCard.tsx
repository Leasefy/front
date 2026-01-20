'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency, formatArea } from '@/lib/format';
import type { Property } from '@/lib/types/property';
import type { QualificationResult } from '@/lib/scoring/qualificationScore';

export interface PropertyCardProps {
  property: Property;
  isWishlisted?: boolean;
  onWishlistToggle?: (propertyId: string) => void;
  /** Qualification result for personalization badge (only shown when provided) */
  qualification?: QualificationResult;
  className?: string;
}

/**
 * Property card component - Luxterra exact design
 * Square corners (2px radius), minimalist layout
 */
export function PropertyCard({
  property,
  isWishlisted = false,
  onWishlistToggle,
  qualification,
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
    type,
  } = property;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlistToggle?.(id);
  };

  const typeLabels: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    studio: 'Estudio',
    room: 'Habitacion',
  };

  return (
    <Link
      href={`/propiedades/${id}`}
      className={cn('group block', className)}
    >
      {/* Image container with badges - Luxterra: 2px radius */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
        <Image
          src={thumbnailUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Badges overlay - top left */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-white/90 text-gray-900 text-xs px-3 py-1.5 rounded-sm">
            En arriendo
          </span>
          <span className="bg-white/90 text-gray-900 text-xs px-3 py-1.5 rounded-sm">
            {typeLabels[type] || type}
          </span>
        </div>

        {/* Wishlist button - top right */}
        {onWishlistToggle && (
          <button
            onClick={handleWishlistClick}
            className={cn(
              'absolute right-3 top-3 rounded-sm bg-white/90 p-2 transition-all duration-300',
              'hover:bg-white focus:outline-none',
              isWishlisted && 'text-red-500'
            )}
            aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart
              className={cn('h-4 w-4', isWishlisted && 'fill-current')}
            />
          </button>
        )}

        {/* Status overlay if not available */}
        {status !== 'available' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-900 text-xs px-4 py-2 rounded-sm">
              {status === 'pending' ? 'En proceso' : 'Arrendado'}
            </span>
          </div>
        )}

        {/* Qualification badge - bottom right (only when qualification data exists) */}
        {qualification && (
          <div
            className={cn(
              'absolute bottom-3 right-3 z-10 text-xs px-2 py-1 rounded-sm border',
              qualification.qualifies
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}
          >
            {qualification.qualifies ? 'Califica' : 'Fuera de presupuesto'}
          </div>
        )}
      </div>

      {/* Content - Luxterra layout */}
      <div className="pt-4">
        {/* Title and location row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-normal text-gray-900 group-hover:text-primary transition-colors tracking-tight truncate">
              {title}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5 tracking-tight truncate">
              {neighborhood}, {city}
            </p>
          </div>
          <p className="text-base font-normal text-gray-900 whitespace-nowrap tracking-tight">
            {formatCurrency(monthlyRent)}
          </p>
        </div>

        {/* Features row - icons with text */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100" aria-label="Caracteristicas de la propiedad">
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="1" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <span aria-label={`Area: ${formatArea(area)}`}>{formatArea(area)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 12h18M3 12v6a2 2 0 002 2h14a2 2 0 002-2v-6M3 12V8a4 4 0 014-4h1a3 3 0 013 3v5" />
            </svg>
            <span aria-label={`${bedrooms} habitaciones`}>{bedrooms} Bed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 12h16a2 2 0 012 2v2a4 4 0 01-4 4H6a4 4 0 01-4-4v-2a2 2 0 012-2z" />
              <path d="M6 12V5a2 2 0 012-2h8a2 2 0 012 2v7" />
            </svg>
            <span aria-label={`${bathrooms} banos`}>{bathrooms} Bath</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
