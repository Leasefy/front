'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MapPin, CaretLeft, CaretRight } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { formatCurrency, formatArea } from '@/lib/format';
import type { Property } from '@/lib/types/property';
import type { QualificationResult } from '@/lib/scoring/propertyMatching';

export interface PropertyCardProps {
  property: Property;
  isWishlisted?: boolean;
  onWishlistToggle?: (propertyId: string) => void;
  qualification?: QualificationResult;
  isHighlighted?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  className?: string;
}

export function PropertyCard({
  property,
  isWishlisted = false,
  onWishlistToggle,
  qualification,
  isHighlighted = false,
  onHoverStart,
  onHoverEnd,
  className,
}: PropertyCardProps) {
  const {
    id,
    title,
    thumbnailUrl,
    images,
    monthlyRent,
    neighborhood,
    city,
    bedrooms,
    bathrooms,
    area,
    status,
    type,
  } = property;

  const [activeImage, setActiveImage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Use images array if available, fallback to thumbnailUrl
  const allImages = images && images.length > 0 ? images : [thumbnailUrl];

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImage((prev) => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImage((prev) => (prev + 1) % allImages.length);
  }, [allImages.length]);

  const handleDotClick = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImage(index);
  }, []);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlistToggle?.(id);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHoverStart?.();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setActiveImage(0);
    onHoverEnd?.();
  };

  const typeLabels: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    studio: 'Estudio',
    room: 'Habitación',
  };

  return (
    <Link
      href={`/propiedades/${id}`}
      className={cn(
        'group block rounded-xl transition-all duration-300 ease-out',
        isHighlighted && 'ring-2 ring-primary ring-offset-2',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image container */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
        {/* All images stacked with opacity crossfade */}
        {allImages.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`${title} - ${i + 1}`}
            fill
            className={cn(
              'object-cover transition-all duration-500 ease-out',
              i === activeImage ? 'opacity-100' : 'opacity-0',
              isHovered && i === activeImage && 'scale-105'
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={i === 0}
          />
        ))}

        {/* Subtle bottom gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Compass arrows — visible on hover when multiple images */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className={cn(
                'absolute left-2 top-1/2 -translate-y-1/2 z-20',
                'w-8 h-8 rounded-full flex items-center justify-center',
                'bg-white/80 hover:bg-white text-foreground/70 hover:text-foreground',
                ' backdrop-blur-sm',
                'transition-all duration-300',
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
              )}
              aria-label="Imagen anterior"
            >
              <CaretLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 z-20',
                'w-8 h-8 rounded-full flex items-center justify-center',
                'bg-white/80 hover:bg-white text-foreground/70 hover:text-foreground',
                ' backdrop-blur-sm',
                'transition-all duration-300',
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
              )}
              aria-label="Imagen siguiente"
            >
              <CaretRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Dot indicators — bottom center, visible on hover */}
        {allImages.length > 1 && (
          <div
            className={cn(
              'absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5',
              'transition-all duration-300',
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            )}
          >
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => handleDotClick(e, i)}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === activeImage
                    ? 'w-2 h-2 bg-white'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                )}
                aria-label={`Ver imagen ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Glass badges — top left */}
        <div className="absolute top-3 left-3 flex gap-1.5 z-10">
          <span className="inline-flex items-center text-[11px] font-mono font-normal uppercase text-white bg-white/15 backdrop-blur-xl border border-white/20 rounded-full px-2.5 py-1">
            En arriendo
          </span>
          <span className="inline-flex items-center text-[11px] font-mono font-normal uppercase text-white bg-white/15 backdrop-blur-xl border border-white/20 rounded-full px-2.5 py-1">
            {typeLabels[type] || type}
          </span>
        </div>

        {/* Wishlist button — top right, glass */}
        {onWishlistToggle && (
          <button
            onClick={handleWishlistClick}
            className={cn(
              'absolute right-3 top-3 rounded-full p-2 z-10',
              'bg-white/15 backdrop-blur-xl border border-white/20',
              'transition-all duration-300',
              'hover:bg-white/30',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
              isWishlisted ? 'text-[#C4503B]' : 'text-white/80'
            )}
            aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart className={cn('h-4 w-4', isWishlisted && 'fill-current')} />
          </button>
        )}

        {/* Status overlay - only for rented properties */}
        {status === 'rented' && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30">
            <span className="text-white text-sm font-medium bg-white/15 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2">
              Arrendado
            </span>
          </div>
        )}

        {/* Qualification badge */}
        {qualification && (
          <div
            className={cn(
              'absolute bottom-3 right-3 z-10 text-[11px] font-medium rounded-full px-2.5 py-1 border backdrop-blur-xl',
              qualification.qualifies
                ? 'bg-[hsl(var(--success-500)/0.2)] text-white border-[hsl(var(--success-500)/0.3)]'
                : 'bg-[hsl(var(--warning-500)/0.2)] text-white border-[hsl(var(--warning-500)/0.3)]'
            )}
          >
            {qualification.qualifies ? 'Califica' : 'Fuera de presupuesto'}
          </div>
        )}

        {/* Price overlay — bottom left, shows on hover (hidden when dots visible to avoid overlap) */}
        {allImages.length <= 1 && (
          <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-1 group-hover:translate-y-0">
            <span className="text-[13px] font-semibold text-white bg-black/40 backdrop-blur-xl rounded-full px-3 py-1.5">
              {formatCurrency(monthlyRent)}<span className="text-white/50 font-normal">/mes</span>
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-4 pb-1.5">
        {/* Location — small, above title */}
        <div className="flex items-center gap-1.5 mb-1">
          <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" strokeWidth={1.5} />
          <p className="text-[13px] text-muted-foreground truncate">
            {neighborhood}, {city}
          </p>
        </div>

        {/* Title */}
        <h3 className="text-[16px] font-heading font-semibold text-foreground tracking-[-0.02em] leading-snug truncate group-hover:text-primary transition-colors duration-200">
          {title}
        </h3>

        {/* Price — prominent */}
        <p className="text-[22px] font-heading font-bold text-foreground tracking-[-0.03em] leading-none mt-3">
          {formatCurrency(monthlyRent)}
          <span className="text-[13px] font-normal text-muted-foreground ml-1">/mes</span>
        </p>

        {/* Features — clean chips */}
        <div
          className="flex items-center gap-2 mt-4"
          aria-label="Características de la propiedad"
        >
          <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground/70 bg-neutral-100 border border-border rounded-md px-2.5 py-1.5">
            <svg className="h-3.5 w-3.5 text-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="1" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            {formatArea(area)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground/70 bg-neutral-100 border border-border rounded-md px-2.5 py-1.5">
            <svg className="h-3.5 w-3.5 text-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 12h18M3 12v6a2 2 0 002 2h14a2 2 0 002-2v-6M3 12V8a4 4 0 014-4h1a3 3 0 013 3v5" />
            </svg>
            {bedrooms} hab
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground/70 bg-neutral-100 border border-border rounded-md px-2.5 py-1.5">
            <svg className="h-3.5 w-3.5 text-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 12h16a2 2 0 012 2v2a4 4 0 01-4 4H6a4 4 0 01-4-4v-2a2 2 0 012-2z" />
              <path d="M6 12V5a2 2 0 012-2h8a2 2 0 012 2v7" />
            </svg>
            {bathrooms} baño{bathrooms !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </Link>
  );
}
