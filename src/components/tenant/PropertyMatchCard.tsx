'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, CaretRight, Check } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { formatCurrency, formatArea } from '@/lib/format';
import type { PropertyMatch } from '@/lib/scoring/propertyMatching';
import {
  getMatchScoreBgColor,
  getAcceptanceProbabilityColors,
  getAcceptanceProbabilityLabel,
} from '@/lib/scoring/propertyMatching';

// ============================================================================
// TextTs
// ============================================================================

export interface PropertyMatchCardProps {
  match: PropertyMatch;
  variant?: 'default' | 'compact';
  className?: string;
  /** When provided, opens a sheet/modal instead of navigating */
  onViewProperty?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function PropertyMatchCard({
  match,
  variant = 'default',
  className,
  onViewProperty,
}: PropertyMatchCardProps) {
  const { property, matchScore, acceptanceProbability, recommendation } = match;
  const probabilityColors = getAcceptanceProbabilityColors(acceptanceProbability);

  if (variant === 'compact') {
    const CompactContent = (
      <>
        {/* Match Score Badge */}
        <div className="relative w-14 h-14 rounded-sm overflow-hidden flex-shrink-0">
          <Image
            src={property.thumbnailUrl}
            alt={property.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <span className="text-lg font-bold text-white">{matchScore}%</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-plan-primary truncate group-hover:text-plan-secondary transition-colors">
            {property.title}
          </h4>
          <p className="text-xs text-plan-muted mt-0.5">
            {formatCurrency(property.monthlyRent)}/mes
          </p>
        </div>

        {/* Probability Badge */}
        <div
          className={cn(
            'text-[10px] font-medium px-2 py-1 rounded-sm border',
            probabilityColors.bg,
            probabilityColors.text,
            probabilityColors.border
          )}
        >
          {acceptanceProbability === 'alta' ? 'Alta' : acceptanceProbability === 'media' ? 'Media' : 'Baja'}
        </div>

        <CaretRight className="w-4 h-4 text-plan-muted group-hover:text-plan-secondary transition-colors" />
      </>
    );

    if (onViewProperty) {
      return (
        <button
          onClick={onViewProperty}
          className={cn(
            'group flex items-center gap-4 p-4 bg-card border border-plan-border w-full text-left',
            'hover:border-plan-border-hover transition-colors',
            className
          )}
        >
          {CompactContent}
        </button>
      );
    }

    return (
      <Link
        href={`/propiedades/${property.id}`}
        className={cn(
          'group flex items-center gap-4 p-4 bg-card border border-plan-border',
          'hover:border-plan-border-hover transition-colors',
          className
        )}
      >
        {CompactContent}
      </Link>
    );
  }

  // Image overlay content (shared between Link and button)
  const ImageOverlay = (
    <>
      <Image
        src={property.thumbnailUrl}
        alt={property.title}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-500"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Match Score Badge - Top Left */}
      <div
        className={cn(
          'absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm',
          getMatchScoreBgColor(matchScore)
        )}
      >
        <span className="text-sm font-bold text-white">{matchScore}%</span>
        <span className="text-[10px] text-white/80">match</span>
      </div>

      {/* Probability Badge - Top Right */}
      <div
        className={cn(
          'absolute top-3 right-3 text-[10px] font-medium px-2 py-1 rounded-sm border backdrop-blur-sm',
          'bg-white/90',
          acceptanceProbability === 'alta' ? 'text-emerald-700 border-emerald-200' :
          acceptanceProbability === 'media' ? 'text-amber-700 border-amber-200' :
          'text-red-700 border-red-200'
        )}
      >
        {getAcceptanceProbabilityLabel(acceptanceProbability)}
      </div>

      {/* Robottom Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <MapPin className="w-3 h-3 text-white/70" />
          <span className="text-[11px] text-white/80">
            {property.neighborhood}, {property.city}
          </span>
        </div>
        <p className="text-lg font-bold text-white">
          {formatCurrency(property.monthlyRent)}
          <span className="text-sm font-normal text-white/70">/mes</span>
        </p>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        'group bg-card border border-plan-border overflow-hidden h-full flex flex-col',
        'hover:border-plan-border-hover transition-colors',
        className
      )}
    >
      {/* Image with Match Score Overlay */}
      {onViewProperty ? (
        <button
          onClick={onViewProperty}
          className="block relative aspect-[4/3] flex-shrink-0 w-full"
        >
          {ImageOverlay}
        </button>
      ) : (
        <Link href={`/propiedades/${property.id}`} className="block relative aspect-[4/3] flex-shrink-0">
          {ImageOverlay}
        </Link>
      )}

      {/* Content - flex-1 to fill remaining space */}
      <div className="p-4 flex flex-col flex-1">
        {onViewProperty ? (
          <button onClick={onViewProperty} className="text-left">
            <h3 className="font-medium text-plan-primary group-hover:text-plan-secondary transition-colors line-clamp-1">
              {property.title}
            </h3>
          </button>
        ) : (
          <Link href={`/propiedades/${property.id}`}>
            <h3 className="font-medium text-plan-primary group-hover:text-plan-secondary transition-colors line-clamp-1">
              {property.title}
            </h3>
          </Link>
        )}

        {/* Property Features */}
        <div className="flex items-center gap-3 mt-2 text-xs text-plan-muted">
          <span>{property.bedrooms} hab</span>
          <span className="w-1 h-1 rounded-full bg-plan-border" />
          <span>{property.bathrooms} bano</span>
          <span className="w-1 h-1 rounded-full bg-plan-border" />
          <span>{formatArea(property.area)}</span>
        </div>

        {/* Recommendation - fixed height with line clamp */}
        <div className="flex items-start gap-2 mt-3 p-2.5 bg-muted/50 rounded-sm min-h-[52px]">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-plan-secondary line-clamp-2">{recommendation}</p>
        </div>

        {/* Spacer to push CTA to bottom */}
        <div className="flex-1" />

        {/* CTA */}
        {onViewProperty ? (
          <button
            onClick={onViewProperty}
            className={cn(
              'flex items-center justify-center gap-2 mt-4 py-2.5 px-4 w-full',
              'text-sm font-medium rounded-sm transition-colors',
              matchScore >= 70
                ? 'bg-plan-primary text-white hover:bg-plan-primary/90'
                : 'bg-muted text-plan-primary hover:bg-muted/80'
            )}
          >
            Ver propiedad
            <CaretRight className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href={`/propiedades/${property.id}`}
            className={cn(
              'flex items-center justify-center gap-2 mt-4 py-2.5 px-4 w-full',
              'text-sm font-medium rounded-sm transition-colors',
              matchScore >= 70
                ? 'bg-plan-primary text-white hover:bg-plan-primary/90'
                : 'bg-muted text-plan-primary hover:bg-muted/80'
            )}
          >
            Ver propiedad
            <CaretRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
