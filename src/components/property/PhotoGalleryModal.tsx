'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useLenis } from '@/components/providers/SmoothScroll';

interface PhotoGalleryModalProps {
  images: string[];
  propertyTitle: string;
  isOpen: boolean;
  onClose: () => void;
  initialImageIndex?: number;
}

/**
 * Full-screen photo carousel / lightbox.
 *
 * Opens straight into the large image at `initialImageIndex` (no intermediate
 * scrollable "gallery page"). Navigate the whole set with the on-screen arrows,
 * ← / → keys, a swipe, or the thumbnail strip. Wraps around at the ends.
 *
 * Modal + Lenis contract (see DESIGN.md): the overlay carries `data-lenis-prevent`
 * and calls `useLenis().stop()` while open so the page behind never scrolls.
 */
export function PhotoGalleryModal({
  images,
  propertyTitle,
  isOpen,
  onClose,
  initialImageIndex = 0,
}: PhotoGalleryModalProps) {
  const [activeIndex, setActiveIndex] = useState(initialImageIndex);
  const lenis = useLenis();
  const touchStartX = useRef<number | null>(null);

  const total = images.length;
  const hasMultiple = total > 1;

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + total) % total);
  }, [total]);

  // Re-sync to the clicked image every time the carousel is (re)opened.
  useEffect(() => {
    if (isOpen) setActiveIndex(initialImageIndex);
  }, [isOpen, initialImageIndex]);

  // Keyboard nav + freeze the page behind the overlay.
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    lenis.stop();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      lenis.start();
    };
  }, [isOpen, onClose, goPrev, goNext, lenis]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !hasMultiple) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${propertyTitle}`}
      onClick={onClose}
    >
      {/* Header — close + counter */}
      <header
        className="flex-shrink-0 flex items-center justify-between h-16 px-4 md:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          variant="ghost"
          icon={<X className="w-5 h-5 text-white" />}
          onClick={onClose}
          aria-label="Cerrar galería"
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20"
        />
        {hasMultiple && (
          <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
            <span data-testid="gallery-counter" className="text-sm font-medium text-white font-mono tabular-nums">
              {activeIndex + 1} / {total}
            </span>
          </div>
        )}
      </header>

      {/* Stage — large image + arrows */}
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center px-4 md:px-16"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {hasMultiple && (
          <IconButton
            variant="ghost"
            icon={<CaretLeft className="w-6 h-6 text-white" />}
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Imagen anterior"
            className="absolute left-3 md:left-5 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20"
          />
        )}

        <div
          className="relative w-full h-full max-w-6xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            key={activeIndex}
            src={images[activeIndex]}
            alt={`${propertyTitle} - Foto ${activeIndex + 1}`}
            fill
            className="object-contain"
            sizes="100vw"
            priority
            data-testid="gallery-active-image"
          />
        </div>

        {hasMultiple && (
          <IconButton
            variant="ghost"
            icon={<CaretRight className="w-6 h-6 text-white" />}
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Siguiente imagen"
            className="absolute right-3 md:right-5 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20"
          />
        )}
      </div>

      {/* Thumbnail strip */}
      {hasMultiple && (
        <div
          className="flex-shrink-0 py-4 px-4 md:px-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2 overflow-x-auto justify-start md:justify-center pb-1">
            {images.map((image, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Ver foto ${index + 1}`}
                aria-current={activeIndex === index}
                className={cn(
                  'relative aspect-[4/3] w-16 md:w-20 flex-shrink-0 rounded-md overflow-hidden transition-all duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  activeIndex === index ? 'ring-2 ring-white opacity-100' : 'opacity-50 hover:opacity-90'
                )}
              >
                <Image src={image} alt={`Miniatura ${index + 1}`} fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
