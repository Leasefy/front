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
      className="fixed inset-0 z-50 flex flex-col bg-[#07080C] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] text-[#F3F1ED]"
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${propertyTitle}`}
      onClick={onClose}
    >
      {/* Header — el inmueble y el contador a la izquierda, cerrar a la
          derecha (ronda 30, diseño nuevo: noche sólida, sin vidrio). */}
      <header
        className="flex-shrink-0 flex items-center justify-between gap-4 px-[max(16px,3vw)] py-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="min-w-0 truncate text-[15px]">
          {propertyTitle}
          {hasMultiple && (
            <span data-testid="gallery-counter" className="ml-2.5 font-mono tabular-nums text-[#8E93B0]">
              {activeIndex + 1} / {total}
            </span>
          )}
        </p>
        <IconButton
          variant="ghost"
          icon={<X className="w-5 h-5 text-white" />}
          onClick={onClose}
          aria-label="Cerrar galería"
          className="h-11 w-11 shrink-0 rounded-full bg-white/[0.08] hover:bg-white/[0.16]"
        />
      </header>

      {/* Stage — large image + arrows */}
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center px-2 min-[601px]:px-[max(16px,7vw)]"
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
            className="absolute left-[max(12px,2vw)] z-10 hidden h-12 w-12 rounded-full bg-white/[0.08] hover:bg-white/[0.16] min-[601px]:inline-flex"
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
            className="absolute right-[max(12px,2vw)] z-10 hidden h-12 w-12 rounded-full bg-white/[0.08] hover:bg-white/[0.16] min-[601px]:inline-flex"
          />
        )}
      </div>

      {/* Thumbnail strip */}
      {hasMultiple && (
        <div
          className="flex-shrink-0 px-[max(16px,3vw)] pb-[18px] pt-3.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2 overflow-x-auto justify-start md:justify-center pb-1 [scrollbar-width:none]">
            {images.map((image, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Ver foto ${index + 1}`}
                aria-current={activeIndex === index}
                className={cn(
                  'relative h-11 w-[58px] min-[601px]:h-14 min-[601px]:w-[76px] flex-shrink-0 rounded-[10px] overflow-hidden border-2 transition-[opacity,border-color] duration-fast',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  activeIndex === index ? 'border-[#4D6BFF] opacity-100' : 'border-transparent opacity-[0.42] hover:opacity-[0.85]'
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
