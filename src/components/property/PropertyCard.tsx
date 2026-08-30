'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MapPin, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';

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
  /** Prefix for the detail link. Public '/propiedades', tenant '/inquilino/propiedades'. */
  basePath?: string;
  /** Query extra en el link (p.ej. `from=para-ti`) para que el detalle sepa de dónde vino. */
  linkQuery?: string;
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
  basePath = '/propiedades',
  linkQuery,
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
    agencyName,
    listingType,
    salePrice,
  } = property;

  // T-0038 §3.2.2/§3.2.3/§3.2.4 — a SALE listing shows `salePrice`, never
  // the (absent) `monthlyRent`. `displayPrice == null` renders "Sin dato",
  // never `formatCurrency(null)` (silently "$ 0", C6).
  const isSaleListing = listingType === 'sale';
  const displayPrice = isSaleListing ? salePrice : monthlyRent;

  const [activeImage, setActiveImage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Use images array if available, fallback to thumbnailUrl. Empty strings are
  // filtered first: demo/incomplete properties can carry a blank thumbnailUrl
  // or blank entries, and `next/image` warns (and preloads an empty href) on
  // `src=""`. If nothing usable is left, fall back to the shared placeholder.
  const PLACEHOLDER = '/placeholder-property.svg';
  // `trim()` y no `length > 0`: la base trae entradas de puros espacios, y
  // `next/image` no las trata como vacías — las intenta resolver como ruta
  // relativa y tira «Failed to parse src "   "», que rompe el render entero
  // de la tarjeta en vez de degradar a placeholder.
  const isNonEmpty = (src: unknown): src is string =>
    typeof src === 'string' && src.trim().length > 0;
  const gallery = (images ?? []).filter(isNonEmpty);
  const sinFotos = gallery.length === 0 && !isNonEmpty(thumbnailUrl);
  const allImages =
    gallery.length > 0
      ? gallery
      : isNonEmpty(thumbnailUrl)
        ? [thumbnailUrl]
        : [PLACEHOLDER];

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
      href={linkQuery ? `${basePath}/${id}?${linkQuery}` : `${basePath}/${id}`}
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

        {sinFotos && (
          <div
            data-testid="inmueble-sin-fotos"
            className="absolute inset-0 flex items-center justify-center text-sm font-medium text-fg-muted"
          >
            Sin fotos
          </div>
        )}

        {/* Subtle bottom gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Compass arrows — visible on hover when multiple images */}
        {allImages.length > 1 && (
          <>
            <IconButton
              variant="ghost"
              size="sm"
              icon={<CaretLeft className="h-4 w-4" />}
              onClick={handlePrev}
              aria-label="Imagen anterior"
              className={cn(
                'absolute left-2 top-1/2 -translate-y-1/2 z-20',
                'h-8 w-8 rounded-full',
                'bg-white/80 hover:bg-white text-foreground/70 hover:text-foreground',
                'backdrop-blur-sm',
                'transition-all duration-300',
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
              )}
            />
            <IconButton
              variant="ghost"
              size="sm"
              icon={<CaretRight className="h-4 w-4" />}
              onClick={handleNext}
              aria-label="Imagen siguiente"
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 z-20',
                'h-8 w-8 rounded-full',
                'bg-white/80 hover:bg-white text-foreground/70 hover:text-foreground',
                'backdrop-blur-sm',
                'transition-all duration-300',
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
              )}
            />
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
            {isSaleListing ? 'En venta' : 'En arriendo'}
          </span>
          <span className="inline-flex items-center text-[11px] font-mono font-normal uppercase text-white bg-white/15 backdrop-blur-xl border border-white/20 rounded-full px-2.5 py-1">
            {typeLabels[type] || type}
          </span>
        </div>

        {/* Wishlist button — top right, glass */}
        {onWishlistToggle && (
          <IconButton
            variant="ghost"
            size="sm"
            icon={<Heart className={cn('h-4 w-4', isWishlisted && 'fill-current')} />}
            onClick={handleWishlistClick}
            aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            className={cn(
              'absolute right-3 top-3 rounded-full p-2 z-10',
              'bg-white/15 backdrop-blur-xl border border-white/20',
              'transition-all duration-300',
              'hover:bg-white/30',
              isWishlisted ? 'text-danger' : 'text-white/80'
            )}
          />
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
            <span className="text-[13px] font-semibold text-white bg-black/40 backdrop-blur-xl rounded-full px-3 py-1.5 font-mono tabular-nums">
              {displayPrice != null ? formatCurrency(displayPrice) : 'Sin dato'}
              {!isSaleListing && <span className="text-white/50 font-normal font-sans">/mes</span>}
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

        {/* Offering agency — only when the property belongs to an agency */}
        {agencyName && (
          <p className="text-[12px] text-muted-foreground truncate mt-0.5">
            Ofrecido por {agencyName}
          </p>
        )}

        {/* Price — prominent */}
        <p className="text-[22px] font-mono tabular-nums font-bold text-foreground tracking-[-0.03em] leading-none mt-3">
          {displayPrice != null ? formatCurrency(displayPrice) : 'Sin dato'}
          {!isSaleListing && (
            <span className="text-[13px] font-normal text-muted-foreground ml-1 font-sans">/mes</span>
          )}
        </p>

        {/* Features — clean chips */}
        <div
          className="flex items-center gap-2 mt-4"
          aria-label="Características de la propiedad"
        >
          <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground/70 bg-surface-muted border border-border rounded-full px-2.5 py-1.5 font-mono tabular-nums">
            <svg className="h-3.5 w-3.5 text-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="1" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            {formatArea(area)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground/70 bg-surface-muted border border-border rounded-full px-2.5 py-1.5 font-mono tabular-nums">
            <svg className="h-3.5 w-3.5 text-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 12h18M3 12v6a2 2 0 002 2h14a2 2 0 002-2v-6M3 12V8a4 4 0 014-4h1a3 3 0 013 3v5" />
            </svg>
            {bedrooms} hab
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground/70 bg-surface-muted border border-border rounded-full px-2.5 py-1.5 font-mono tabular-nums">
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
