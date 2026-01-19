'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
}

/**
 * Image carousel component for property detail pages
 * Features: keyboard navigation, thumbnails, previous/next arrows
 */
export function ImageCarousel({ images, alt, className }: ImageCarouselProps) {
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
          'relative aspect-[4/3] bg-muted flex items-center justify-center rounded-lg',
          className
        )}
      >
        <p className="text-muted-foreground">Sin imagenes disponibles</p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Main image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        <Image
          src={safeImages[currentIndex]}
          alt={`${alt} - Imagen ${currentIndex + 1} de ${totalImages}`}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 50vw"
          priority={currentIndex === 0}
        />

        {/* Image counter badge */}
        <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
          {currentIndex + 1} / {totalImages}
        </div>

        {/* Navigation arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrevious}
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition-all',
                'hover:bg-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary'
              )}
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-5 w-5 text-gray-800" />
            </button>
            <button
              onClick={goToNext}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition-all',
                'hover:bg-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary'
              )}
              aria-label="Siguiente imagen"
            >
              <ChevronRight className="h-5 w-5 text-gray-800" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {hasMultipleImages && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {safeImages.map((image, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={cn(
                'relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-md transition-all',
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

      {/* Dots indicator (shown on mobile when thumbnails hidden) */}
      {hasMultipleImages && (
        <div className="mt-3 flex justify-center gap-2 md:hidden">
          {safeImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={cn(
                'h-2 w-2 rounded-full transition-all',
                index === currentIndex
                  ? 'bg-primary w-4'
                  : 'bg-gray-300 hover:bg-gray-400'
              )}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
