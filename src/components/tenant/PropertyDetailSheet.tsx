'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLenis } from '@/components/providers/SmoothScroll';
import { MapPin, Heart, Camera, Bed, Bathtub, CornersOut, House, ArrowSquareOut, CaretRight, X, ArrowsOut } from '@phosphor-icons/react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { IconButton } from '@leasefy/cadence';
import { PropertyAccordion } from '@/components/property/PropertyAccordion';
import { PhotoGalleryModal } from '@/components/property/PhotoGalleryModal';
import { cn } from '@/lib/utils';
import { formatCurrency, formatArea } from '@/lib/format';
import { useWishlist } from '@/lib/hooks/useWishlist';
import type { Property } from '@/lib/types/property';
import type { AcceptanceProbability } from '@/lib/scoring/propertyMatching';
import { PostularButton } from '@/components/tenant/PostularButton';
import {
  getMatchScoreBgColor,
  getAcceptanceProbabilityLabel,
} from '@/lib/scoring/propertyMatching';

// ============================================================================
// TextTs
// ============================================================================

interface MatchData {
  matchScore: number;
  acceptanceProbability: AcceptanceProbability;
  recommendation: string;
}

export interface PropertyDetailSheetProps {
  property: Property | null;
  open: boolean;
  onClose: () => void;
  matchData?: MatchData;
}

// ============================================================================
// Component
// ============================================================================

export function PropertyDetailSheet({
  property,
  open,
  onClose,
  matchData,
}: PropertyDetailSheetProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { isWishlisted, toggleWishlist } = useWishlist();
  const lenis = useLenis();

  // Stop Lenis when sheet is open to allow native scroll
  useEffect(() => {
    if (open) {
      lenis.stop();
    } else {
      lenis.start();
    }
    return () => {
      lenis.start();
    };
  }, [open, lenis]);

  if (!property) return null;

  const wishlisted = isWishlisted(property.id);
  const typeLabels: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    studio: 'Estudio',
    room: 'Habitación',
  };

  const handleOpenGallery = (index = 0) => {
    setSelectedImageIndex(index);
    setGalleryOpen(true);
  };

  const handleWishlistClick = () => {
    toggleWishlist(property.id);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent
          side="right"
          className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl bg-surface"
          hideCloseButton
        >
          {/* Custom Header */}
          <SheetHeader className="flex-shrink-0 flex flex-row items-center justify-between px-5 py-4 border-b border-border-faint">
            <div>
              <SheetTitle className="text-lg font-semibold text-fg">
                Detalle de propiedad
              </SheetTitle>
              <SheetDescription className="text-sm text-fg-muted">
                {property.neighborhood}, {property.city}
              </SheetDescription>
            </div>
            <IconButton
              variant="ghost"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-muted"
              aria-label="Cerrar"
              icon={<X className="w-5 h-5 text-fg-muted" />}
            />
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
            {/* Hero Image */}
            <div className="relative aspect-video bg-surface-muted">
              <Image
                src={property.thumbnailUrl}
                alt={property.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 600px"
                priority
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* View photos button */}
              <Button
                variant="secondary"
                size="sm"
                hideArrow
                onClick={() => handleOpenGallery(0)}
                className="absolute bottom-4 right-4 bg-surface/90 backdrop-blur-sm"
              >
                <Camera className="w-4 h-4" />
                Ver {property.images.length} fotos
              </Button>

              {/* Match Score Badge (if matchData present) */}
              {matchData && (
                <div
                  className={cn(
                    'absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md',
                    getMatchScoreBgColor(matchData.matchScore)
                  )}
                >
                  <span className="text-sm font-bold text-white">
                    {matchData.matchScore}%
                  </span>
                  <span className="text-[10px] text-white/80">match</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* Match Data Section */}
              {matchData && (
                <div className="flex items-center gap-3 p-3 bg-surface-muted border border-border rounded-xl">
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-xl font-bold text-lg',
                      getMatchScoreBgColor(matchData.matchScore),
                      'text-white'
                    )}
                  >
                    {matchData.matchScore}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-fg">
                        Compatibilidad
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full',
                          matchData.acceptanceProbability === 'alta'
                            ? 'bg-success-soft text-success'
                            : matchData.acceptanceProbability === 'media'
                              ? 'bg-warning-soft text-warning'
                              : 'bg-danger-soft text-danger'
                        )}
                      >
                        {getAcceptanceProbabilityLabel(matchData.acceptanceProbability)}
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted mt-0.5 truncate">
                      {matchData.recommendation}
                    </p>
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="flex items-center gap-1.5 text-sm text-fg-muted">
                <MapPin className="w-4 h-4" />
                <span>
                  {property.neighborhood}, {property.city}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold text-fg leading-tight">
                {property.title}
              </h2>

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-fg">
                  {formatCurrency(property.monthlyRent)}
                </span>
                <span className="text-sm text-fg-muted">
                  /mes
                </span>
                {property.adminFee > 0 && (
                  <span className="text-sm text-fg-muted">
                    (+{formatCurrency(property.adminFee)} admin)
                  </span>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center p-3 bg-surface-muted border border-border rounded-xl">
                  <ArrowsOut className="w-5 h-5 text-fg-muted mb-1.5" />
                  <span className="text-sm font-semibold text-fg">
                    {formatArea(property.area)}
                  </span>
                </div>
                <div className="flex flex-col items-center p-3 bg-surface-muted border border-border rounded-xl">
                  <Bed className="w-5 h-5 text-fg-muted mb-1.5" />
                  <span className="text-sm font-semibold text-fg">
                    {property.bedrooms} hab
                  </span>
                </div>
                <div className="flex flex-col items-center p-3 bg-surface-muted border border-border rounded-xl">
                  <Bathtub className="w-5 h-5 text-fg-muted mb-1.5" />
                  <span className="text-sm font-semibold text-fg">
                    {property.bathrooms} baño
                  </span>
                </div>
                <div className="flex flex-col items-center p-3 bg-surface-muted border border-border rounded-xl">
                  <House className="w-5 h-5 text-fg-muted mb-1.5" />
                  <span className="text-sm font-semibold text-fg truncate text-center text-[13px]">
                    {typeLabels[property.type]}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-fg mb-2">
                  Descripción
                </h3>
                <p className="text-sm text-fg-muted leading-relaxed">
                  {property.description}
                </p>
              </div>

              {/* Property Accordion */}
              <PropertyAccordion
                property={property}
                defaultOpen={['amenities', 'costs']}
                className="[&_[data-radix-accordion-trigger]]:hover:bg-surface-muted"
              />

              {/* Gallery Thumbnails */}
              {property.images.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold text-fg mb-3">
                    Galería
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {property.images.slice(0, 4).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => handleOpenGallery(index)}
                        className="relative aspect-square rounded-md overflow-hidden group"
                      >
                        <Image
                          src={image}
                          alt={`Foto ${index + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="100px"
                        />
                        {index === 3 && property.images.length > 4 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              +{property.images.length - 4}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Card */}
              <div className="bg-surface-muted border border-border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary-soft rounded-xl">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-fg">
                        Ubicación
                      </h3>
                      <p className="text-sm text-fg-muted mt-0.5">
                        {property.neighborhood}, {property.city}
                      </p>
                      <p className="text-xs text-fg-subtle mt-0.5">
                        {property.address}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${property.address}, ${property.neighborhood}, ${property.city}, Colombia`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary transition-colors"
                  >
                    Ver en Maps
                    <ArrowSquareOut className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Robottom padding for footer */}
              <div className="h-4" />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex-shrink-0 border-t border-border-faint bg-surface p-4">
            <div className="flex items-center gap-3">
              {/* Price */}
              <div className="flex-1 min-w-0">
                <span className="text-lg font-bold text-fg">
                  {formatCurrency(property.monthlyRent)}
                </span>
                <span className="text-sm text-fg-muted">
                  /mes
                </span>
              </div>

              {/* Wishlist Button */}
              <IconButton
                variant="ghost"
                onClick={handleWishlistClick}
                className={cn(
                  'w-12 h-12 rounded-xl border',
                  wishlisted
                    ? 'bg-danger-soft border-danger/30'
                    : 'bg-surface-muted border-border hover:bg-surface-muted'
                )}
                aria-label={wishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                icon={
                  <Heart
                    className={cn(
                      'w-5 h-5 transition-colors',
                      wishlisted
                        ? 'fill-danger text-danger'
                        : 'text-fg-muted'
                    )}
                  />
                }
              />

              {/* Postulación — el gate enseña el camino si todavía no puede
                  (ver PostularButton). "Aplicar" murió: docs/VOCABULARIO.md. */}
              <PostularButton
                propertyId={property.id}
                canonCop={property.monthlyRent}
                className="w-full h-12"
              >
                Postularme a esta propiedad
              </PostularButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Photo Gallery Modal */}
      <PhotoGalleryModal
        images={property.images}
        propertyTitle={property.title}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialImageIndex={selectedImageIndex}
      />
    </>
  );
}
