'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  /** Hero variant: full-width, taller for property detail pages */
  variant?: 'default' | 'hero';
  /** Callback when image is clicked (for opening gallery) */
  onImageClick?: (index: number) => void;
}

/**
 * Image carousel component for property detail pages
 * Features: keyboard navigation, thumbnails, previous/next arrows
 * Variants: default (contained), hero (full-width, taller)
 */
export function ImageCarousel({
  images,
  alt,
  className,
  variant = 'default',
  onImageClick,
}: ImageCarouselProps) {
  const isHero = variant === 'hero';
  const [currentIndex, setCurrentIndex] = useState(0);

  // Compute these values before any hooks to ensure consistent hook order
  const safeImages = images && images.length > 0 ? images : [];
  const totalImages = safeImages.length;
  const hasMultipleImages = totalImages > 1;
  const isEmpty = totalImages === 0;

  const goToPrevious = useCallback(() => {
    if (totalImages === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  }, [totalImages]);

  const goToNext = useCallback(() => {
    if (totalImages === 0) return;
    setCurrentIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  }, [totalImages]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (totalImages === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, totalImages]);

  // Handle empty images array - render after hooks
  if (isEmpty) {
    return (
      <div
        className={cn(
          'relative bg-muted flex items-center justify-center',
          isHero ? 'h-[50vh] md:h-[70vh]' : 'aspect-[4/3] rounded-sm',
          className
        )}
      >
        <p className="text-muted-foreground">Sin imagenes disponibles</p>
      </div>
    );
  }

  // Handle image click for gallery opening
  const handleImageClick = () => {
    if (onImageClick) {
      onImageClick(currentIndex);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Main image */}
      <div
        className={cn(
          'relative overflow-hidden bg-muted',
          isHero
            ? 'h-[50vh] md:h-[70vh] cursor-pointer group'
            : 'aspect-[4/3] rounded-sm'
        )}
        onClick={isHero ? handleImageClick : undefined}
        role={isHero && onImageClick ? 'button' : undefined}
        tabIndex={isHero && onImageClick ? 0 : undefined}
        onKeyDown={
          isHero && onImageClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleImageClick();
                }
              }
            : undefined
        }
      >
        <Image
          src={safeImages[currentIndex]}
          alt={`${alt} - Imagen ${currentIndex + 1} de ${totalImages}`}
          fill
          className={cn(
            'object-cover transition-all duration-300',
            isHero && 'group-hover:scale-105'
          )}
          sizes={
            isHero
              ? '100vw'
              : '(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 50vw'
          }
          priority={currentIndex === 0}
        />

        {/* Hero overlay on hover */}
        {isHero && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        )}

        {/* Image counter badge */}
        <div
          className={cn(
            'absolute rounded-full bg-black/60 px-3 py-1 text-sm text-white',
            isHero ? 'bottom-4 right-4' : 'bottom-3 right-3'
          )}
        >
          {currentIndex + 1} / {totalImages}
        </div>

        {/* View all images button (hero only) */}
        {isHero && hasMultipleImages && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImageClick?.(0);
            }}
            className="absolute bottom-4 left-4 px-4 py-2 bg-white text-foreground text-xs font-medium tracking-tight rounded-sm hover:bg-muted transition-colors shadow-sm"
          >
            Ver todas las imagenes ({totalImages})
          </button>
        )}

        {/* Compass arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-md transition-all',
                'hover:bg-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary',
                isHero ? 'left-4 p-3' : 'left-3 p-2'
              )}
              aria-label="Imagen anterior"
            >
              <CaretLeft className={cn(isHero ? 'h-6 w-6' : 'h-5 w-5', 'text-foreground')} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-md transition-all',
                'hover:bg-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary',
                isHero ? 'right-4 p-3' : 'right-3 p-2'
              )}
              aria-label="Siguiente imagen"
            >
              <CaretRight className={cn(isHero ? 'h-6 w-6' : 'h-5 w-5', 'text-foreground')} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip (hidden for hero variant) */}
      {hasMultipleImages && !isHero && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {safeImages.map((image, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={cn(
                'relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-sm transition-all',
                'hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary',
                index === currentIndex
                  ? 'ring-2 ring-primary'
                  : 'opacity-70 hover:opacity-100'
              )}
              aria-label={`Ver imagen ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : undefined}
            >
              <Image
                src={image}
                alt={`${alt} miniatura ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Dots indicator (shown on mobile when thumbnails hidden, not for hero) */}
      {hasMultipleImages && !isHero && (
        <div className="mt-3 flex justify-center gap-2 md:hidden">
          {safeImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={cn(
                'h-2 w-2 rounded-full transition-all',
                index === currentIndex
                  ? 'bg-primary w-4'
                  : 'bg-border hover:bg-muted-foreground'
              )}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
