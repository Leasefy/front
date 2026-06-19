'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Image from 'next/image';
import Lenis from 'lenis';
import { CaretLeft, ShareNetwork, Heart, X, MagnifyingGlassPlus, CaretRight } from '@phosphor-icons/react';
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
 * Airbnb-style photo tour modal
 * Full-screen scrollable gallery with thumbnail grid navigation and zoom
 */
export function PhotoGalleryModal({
  images,
  propertyTitle,
  isOpen,
  onClose,
  initialImageIndex = 0,
}: PhotoGalleryModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modalLenisRef = useRef<Lenis | null>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(initialImageIndex);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const lenis = useLenis();

  // Create a dedicated Lenis instance for the modal scroll container
  useEffect(() => {
    if (!isOpen || !scrollContainerRef.current) return;

    const modalLenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wrapper: scrollContainerRef.current,
      content: scrollContainerRef.current.firstElementChild as HTMLElement,
    });

    modalLenisRef.current = modalLenis;

    function raf(time: number) {
      modalLenis.raf(time);
      requestAnimationFrame(raf);
    }
    const frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      modalLenis.destroy();
      modalLenisRef.current = null;
    };
  }, [isOpen]);

  // Define scrollToImage BEFORE the useEffect that uses it
  const scrollToImage = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    const target = imageRefs.current[index];

    if (!container || !target) return;

    // Get the offset of the target relative to the scroll container
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const targetScrollTop = scrollTop + (targetRect.top - containerRect.top) - 24;

    // Use modal Lenis for smooth scroll, fallback to native
    if (modalLenisRef.current) {
      modalLenisRef.current.scrollTo(targetScrollTop, { duration: 1.2 });
    } else {
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  }, []);

  // Scroll to initial image when modal opens
  useEffect(() => {
    if (isOpen && initialImageIndex > 0) {
      const timer = setTimeout(() => {
        scrollToImage(initialImageIndex);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialImageIndex, scrollToImage]);

  // Handle escape key to close and control Lenis
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedIndex !== null) {
          setZoomedIndex(null);
        } else {
          onClose();
        }
      }
    };

    const handleArrowKeys = (e: KeyboardEvent) => {
      if (zoomedIndex === null) return;

      if (e.key === 'ArrowLeft') {
        setZoomedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setZoomedIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : prev));
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleArrowKeys);
      document.body.style.overflow = 'hidden';
      // Stop Lenis smooth scroll so modal can scroll normally
      lenis.stop();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleArrowKeys);
      document.body.style.overflow = '';
      // Restart Lenis when modal closes
      lenis.start();
    };
  }, [isOpen, onClose, lenis, zoomedIndex, images.length]);

  // Track active image on scroll
  useEffect(() => {
    if (!isOpen || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = imageRefs.current.findIndex((ref) => ref === entry.target);
            if (index !== -1) setActiveIndex(index);
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.6,
      }
    );

    imageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [isOpen, images.length]);

  const handleZoom = useCallback((index: number) => {
    setZoomedIndex(index);
  }, []);

  const handleCloseZoom = useCallback(() => {
    setZoomedIndex(null);
  }, []);

  const handlePrevImage = useCallback(() => {
    setZoomedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNextImage = useCallback(() => {
    setZoomedIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : prev));
  }, [images.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" data-lenis-prevent>
      {/* Header - Airbnb style */}
      <header className="flex-shrink-0 bg-card border-b border-border">
        <div className="flex items-center justify-between h-16 px-6 md:px-8">
          {/* Back button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 -ml-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Cerrar galeria"
          >
            <CaretLeft className="w-5 h-5 text-foreground" />
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-neutral-100 rounded-xl transition-colors">
              <ShareNetwork className="w-4 h-4" />
              <span className="hidden sm:inline">Compartir</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-neutral-100 rounded-xl transition-colors">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Guardar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <div
        ref={scrollContainerRef}
        data-lenis-prevent
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth"
      >
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-6">
          {/* Title */}
          <h1 className="text-2xl md:text-[28px] font-heading font-semibold text-foreground mb-6">
            Galería de fotos
          </h1>

          {/* Thumbnail Grid - Rounded style */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-10">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => scrollToImage(index)}
                className={cn(
                  'relative aspect-[4/3] rounded-xl overflow-hidden transition-all duration-200',
                  'hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  activeIndex === index && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <Image
                  src={image}
                  alt={`Foto ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="border-t border-border mb-10" />

          {/* Full-size Images - Airbnb style with title on left */}
          <div className="space-y-16">
            {images.map((image, index) => (
              <div
                key={index}
                ref={(el) => { imageRefs.current[index] = el; }}
                className="scroll-mt-6"
              >
                {/* Two-column layout like Airbnb */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-start">
                  {/* Section title - left column */}
                  <div className="md:sticky md:top-6">
                    <p className="text-lg font-medium text-foreground">
                      Foto {index + 1}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {index + 1} de {images.length}
                    </p>
                    <button
                      onClick={() => handleZoom(index)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MagnifyingGlassPlus className="w-3.5 h-3.5" />
                      Ver en grande
                    </button>
                  </div>

                  {/* Image - right column (clickable for zoom) */}
                  <button
                    onClick={() => handleZoom(index)}
                    className="relative w-full rounded-xl overflow-hidden bg-muted group cursor-zoom-in"
                  >
                    <Image
                      src={image}
                      alt={`${propertyTitle} - Foto ${index + 1}`}
                      width={1200}
                      height={800}
                      className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 768px) 100vw, 900px"
                      priority={index < 3}
                    />
                    {/* Zoom overlay hint */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
                        <MagnifyingGlassPlus className="w-4 h-4 text-foreground" />
                        <span className="text-sm font-medium text-foreground">Ampliar</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* End indicator */}
          <div className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Has visto todas las {images.length} fotos
            </p>
            <button
              onClick={() => scrollToImage(0)}
              className="mt-4 text-sm font-medium text-foreground hover:underline"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Overlay */}
      {zoomedIndex !== null && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
          onClick={handleCloseZoom}
        >
          {/* Close button */}
          <button
            onClick={handleCloseZoom}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Cerrar zoom"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 z-10 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
            <span className="text-sm font-medium text-white">
              {zoomedIndex + 1} / {images.length}
            </span>
          </div>

          {/* Compass buttons */}
          {zoomedIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevImage();
              }}
              className="absolute left-4 z-10 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Imagen anterior"
            >
              <CaretLeft className="w-6 h-6 text-white" />
            </button>
          )}
          {zoomedIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextImage();
              }}
              className="absolute right-4 z-10 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Siguiente imagen"
            >
              <CaretRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Zoomed image */}
          <div
            className="relative max-w-[90vw] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[zoomedIndex]}
              alt={`${propertyTitle} - Foto ${zoomedIndex + 1}`}
              width={1920}
              height={1280}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
              priority
            />
          </div>

          {/* Keyboard hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
            <span className="text-xs text-white/70">
              Usa ← → para navegar · ESC para cerrar
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
