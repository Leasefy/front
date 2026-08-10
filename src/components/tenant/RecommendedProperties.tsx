'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Sparkle, CaretLeft, CaretRight, ArrowUpRight, Info, TrendUp } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import { useRecommendations } from '@/lib/hooks/useRecommendations';
import {
  useTenantProfile,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_LABELS,
  getAccessiblePropertiesPercentage,
  getRiskRecommendation,
} from '@/lib/context/TenantProfileContext';
import { PropertyMatchCard } from './PropertyMatchCard';

// ============================================================================
// TextTs
// ============================================================================

export interface RecommendedPropertiesProps {
  limit?: number;
  showRiskInsight?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function RecommendedProperties({
  limit = 6,
  showRiskInsight = true,
  className,
}: RecommendedPropertiesProps) {
  const { profile, hasVerifiedProfile, isLoading } = useTenantProfile();
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { recommendations, isLoading: recommendationsLoading } = useRecommendations(limit);

  const loading = isLoading || recommendationsLoading;

  // Scroll handlers
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cardWidth = 320; // Approximate card width
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
    const newPosition = scrollPosition + scrollAmount;

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth',
    });

    setScrollPosition(Math.max(0, newPosition));
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft);
    }
  };

  // Loading state
  if (loading) {
    return (
      <section className={cn('bg-surface border border-plan-border', className)}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-surface-muted rounded w-48" />
            <div className="h-4 bg-surface-muted rounded w-64" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-[300px] flex-shrink-0 space-y-3">
                  <div className="aspect-[4/3] bg-surface-muted rounded" />
                  <div className="h-4 bg-surface-muted rounded w-3/4" />
                  <div className="h-4 bg-surface-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // No profile state
  if (!hasVerifiedProfile || !profile) {
    return (
      <section className={cn('bg-surface border border-plan-border', className)}>
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-plan-status-purple-bg flex items-center justify-center mx-auto mb-4">
            <Sparkle className="w-7 h-7 text-plan-status-purple" />
          </div>
          <h3 className="text-lg font-semibold text-plan-primary mb-2">
            Recomendaciones personalizadas
          </h3>
          <p className="text-sm text-plan-secondary mb-4 max-w-md mx-auto">
            Completa una aplicación para que podamos mostrarte propiedades donde tienes alta probabilidad de ser aceptado.
          </p>
          <Link
            href="/inquilino/explorar"
            className="inline-flex items-center gap-2 text-sm font-medium text-plan-primary hover:underline"
          >
            Explorar propiedades
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    );
  }

  // No recommendations
  if (recommendations.length === 0) {
    return (
      <section className={cn('bg-surface border border-plan-border', className)}>
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-4">
            <TrendUp className="w-7 h-7 text-plan-muted" />
          </div>
          <h3 className="text-lg font-semibold text-plan-primary mb-2">
            No encontramos propiedades
          </h3>
          <p className="text-sm text-plan-secondary mb-4">
            No hay propiedades disponibles que coincidan con tu perfil actual.
          </p>
          <Link
            href="/inquilino/explorar"
            className="inline-flex items-center gap-2 text-sm font-medium text-plan-primary hover:underline"
          >
            Ver todas las propiedades
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    );
  }

  const riskLevel = profile.riskLevel;
  const riskColors = riskLevel ? RISK_LEVEL_COLORS[riskLevel] : null;

  return (
    <section className={cn('bg-surface border border-plan-border overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Sparkle className="w-5 h-5 text-plan-status-purple" />
            <h2 className="font-semibold text-plan-primary">Propiedades ideales para ti</h2>
          </div>
          <p className="text-sm text-plan-secondary mt-1">
            Basado en tu perfil verificado
          </p>
        </div>

        {/* Compass arrows */}
        {recommendations.length > 2 && (
          <div className="flex items-center gap-1">
            <IconButton
              variant="ghost"
              onClick={() => scroll('left')}
              disabled={scrollPosition <= 0}
              className={cn(
                'p-1.5 rounded-sm',
                scrollPosition <= 0
                  ? 'text-plan-muted'
                  : 'text-plan-secondary hover:bg-surface-muted hover:text-plan-primary'
              )}
              aria-label="Ver anteriores"
              icon={<CaretLeft className="w-5 h-5" />}
            />
            <IconButton
              variant="ghost"
              onClick={() => scroll('right')}
              className="p-1.5 rounded-sm text-plan-secondary hover:bg-surface-muted hover:text-plan-primary"
              aria-label="Ver siguientes"
              icon={<CaretRight className="w-5 h-5" />}
            />
          </div>
        )}
      </div>

      {/* Risk Insight Banner */}
      {showRiskInsight && riskLevel && riskColors && (
        <div className={cn('px-5 py-3 border-b border-border flex items-center gap-3', riskColors.bg)}>
          <div className={cn('w-8 h-8 rounded-sm flex items-center justify-center text-sm font-bold', riskColors.text, riskColors.border, 'border')}>
            {riskLevel}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-plan-primary">
              Tu score de riesgo <span className={cn('font-semibold', riskColors.text)}>{RISK_LEVEL_LABELS[riskLevel]}</span> te da acceso al{' '}
              <span className="font-semibold">{getAccessiblePropertiesPercentage(riskLevel)}%</span> de propiedades
            </p>
            <p className="text-xs text-plan-muted mt-0.5">
              {getRiskRecommendation(riskLevel)}
            </p>
          </div>
          <Link
            href="/inquilino/perfil"
            className="text-xs text-plan-secondary hover:text-plan-primary flex items-center gap-1 flex-shrink-0"
          >
            <Info className="w-3.5 h-3.5" />
            Mejorar perfil
          </Link>
        </div>
      )}

      {/* Cards Carousel */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto p-5 scrollbar-hide scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {recommendations.map((match) => (
          <div
            key={match.property.id}
            className="flex-shrink-0 w-[300px]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <PropertyMatchCard match={match} />
          </div>
        ))}

        {/* See All Card */}
        <Link
          href="/inquilino/explorar"
          className={cn(
            'flex-shrink-0 w-[200px] flex flex-col items-center justify-center',
            'bg-surface-muted/50 border border-dashed border-plan-border rounded-sm',
            'hover:border-border-strong hover:bg-surface-muted transition-colors',
            'min-h-[320px]'
          )}
        >
          <ArrowUpRight className="w-8 h-8 text-plan-muted mb-3" />
          <span className="text-sm font-medium text-plan-secondary">Ver todas</span>
          <span className="text-xs text-plan-muted mt-1">las propiedades</span>
        </Link>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-surface-muted/30">
        <p className="text-xs text-plan-muted">
          {recommendations.length}{' '}
          {recommendations.length === 1
            ? 'propiedad recomendada'
            : 'propiedades recomendadas'}{' '}
          para tu perfil
        </p>
        <Link
          href="/inquilino/para-ti"
          className="text-xs text-plan-secondary hover:text-plan-primary flex items-center gap-1"
        >
          Ver más recomendaciones
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
