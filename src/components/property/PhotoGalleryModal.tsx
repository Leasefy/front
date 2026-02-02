'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, Share2, Heart } from 'lucide-react';
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
 * Full-screen scrollable gallery with thumbnail grid navigation
 */
export function PhotoGalleryModal({
  images,
  propertyTitle,
  isOpen,
  onClose,
  initialImageIndex = 0,
}: PhotoGalleryModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(initialImageIndex);
  const lenis = useLenis();

  // Scroll to initial image when modal opens
  useEffect(() => {
    if (isOpen && initialImageIndex > 0 && imageRefs.current[initialImageIndex]) {
      setTimeout(() => {
        imageRefs.current[initialImageIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 150);
    }
  }, [isOpen, initialImageIndex]);

  // Handle escape key to close and control Lenis
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Stop Lenis smooth scroll so modal can scroll normally
      lenis.stop();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      // Restart Lenis when modal closes
      lenis.start();
    };
  }, [isOpen, onClose, lenis]);

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

  const scrollToImage = useCallback((index: number) => {
    imageRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" data-lenis-prevent>
      {/* Header - Airbnb style */}
      <header className="flex-shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between h-16 px-6 md:px-8">
          {/* Back button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Cerrar galeria"
          >
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 rounded-sm transition-colors">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Compartir</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 rounded-sm transition-colors">
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
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      >
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-6">
          {/* Title */}
          <h1 className="text-2xl md:text-[28px] font-semibold text-gray-900 mb-6">
            Galeria de fotos
          </h1>

          {/* Thumbnail Grid - Airbnb style */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-10">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => scrollToImage(index)}
                className={cn(
                  'relative aspect-[4/3] rounded-sm overflow-hidden transition-all duration-200',
                  'hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2',
                  activeIndex === index && 'ring-2 ring-gray-900 ring-offset-2'
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
          <div className="border-t border-gray-200 mb-10" />

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
                    <p className="text-lg font-medium text-gray-900">
                      Foto {index + 1}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {index + 1} de {images.length}
                    </p>
                  </div>

                  {/* Image - right column */}
                  <div className="relative w-full rounded-sm overflow-hidden bg-gray-100">
                    <Image
                      src={image}
                      alt={`${propertyTitle} - Foto ${index + 1}`}
                      width={1200}
                      height={800}
                      className="w-full h-auto object-cover"
                      sizes="(max-width: 768px) 100vw, 900px"
                      priority={index < 3}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* End indicator */}
          <div className="mt-16 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Has visto todas las {images.length} fotos
            </p>
            <button
              onClick={() => scrollToImage(0)}
              className="mt-4 text-sm font-medium text-gray-900 hover:underline"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
