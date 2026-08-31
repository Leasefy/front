'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { SectionLabel } from '@/components/ui/section-label';
import type { Property } from '@/lib/types/property';
import type { QualificationResult } from '@/lib/scoring/propertyMatching';

export interface ScoredPropertyItem {
  property: Property;
  qualification: QualificationResult;
}

export interface ForYouCarouselProps {
  scoredProperties: ScoredPropertyItem[];
  className?: string;
}

/**
 * "Para Ti" personalized property carousel
 * Shows top matching properties for logged-in users with completed profiles
 */
export function ForYouCarousel({
  scoredProperties,
  className,
}: ForYouCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll state
  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        scrollEl.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [checkScroll, scoredProperties]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 280; // Card width + gap
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  if (scoredProperties.length === 0) {
    return null;
  }

  return (
    <section className={cn('relative', className)}>
      <div className="mb-4">
        <SectionLabel className="text-muted-foreground mb-2">Para ti</SectionLabel>
        <h2 className="text-xl font-normal text-foreground tracking-tight">
          Propiedades que coinciden con tu perfil
        </h2>
      </div>

      {/* Carousel container */}
      <div className="relative group">
        {/* Left arrow */}
        {canScrollLeft && (
          <IconButton
            variant="ghost"
            icon={<CaretLeft className="h-5 w-5" />}
            onClick={() => scroll('left')}
            aria-label="Anterior"
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 z-10',
              'h-10 w-10 rounded-full bg-white/95',
              'text-foreground hover:bg-white transition-all',
              'opacity-0 group-hover:opacity-100',
              '-translate-x-1/2'
            )}
          />
        )}

        {/* Right arrow */}
        {canScrollRight && (
          <IconButton
            variant="ghost"
            icon={<CaretRight className="h-5 w-5" />}
            onClick={() => scroll('right')}
            aria-label="Siguiente"
            className={cn(
              'absolute right-0 top-1/2 -translate-y-1/2 z-10',
              'h-10 w-10 rounded-full bg-white/95',
              'text-foreground hover:bg-white transition-all',
              'opacity-0 group-hover:opacity-100',
              'translate-x-1/2'
            )}
          />
        )}

        {/* Scrollable cards container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {scoredProperties.map(({ property, qualification }) => (
            <CarouselCard
              key={property.id}
              property={property}
              matchScore={qualification.score}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface CarouselCardProps {
  property: Property;
  matchScore: number;
}

function CarouselCard({ property, matchScore }: CarouselCardProps) {
  const { id, title, thumbnailUrl, monthlyRent, neighborhood, city } = property;

  // Match score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-[hsl(var(--success-500))]';
    if (score >= 70) return 'bg-primary';
    return 'bg-foreground';
  };

  return (
    <Link
      href={`/propiedades/${id}`}
      className="group block shrink-0 w-[260px]"
    >
      {/* Image container */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
        <Image
          src={thumbnailUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          sizes="260px"
        />

        {/* Match score badge - top left */}
        <div
          className={cn(
            'absolute top-3 left-3 z-10 text-white text-xs px-2 py-1 rounded-full font-mono tabular-nums',
            getScoreColor(matchScore)
          )}
        >
          {matchScore}% match
        </div>
      </div>

      {/* Property info */}
      <div className="mt-3">
        <h3 className="text-sm font-normal text-foreground truncate group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {neighborhood}, {city}
        </p>
        <p className="text-sm font-normal text-foreground mt-1.5 font-mono tabular-nums">
          {/* A sale listing has no canon. `—`, never `$ 0` (C6). */}
          {monthlyRent != null ? `${formatCurrency(monthlyRent)}/mes` : '—'}
        </p>
      </div>
    </Link>
  );
}
