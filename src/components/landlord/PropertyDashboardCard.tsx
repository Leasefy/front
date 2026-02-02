'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Users, Clock, AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { RiskGaugeMini } from './RiskGauge';
import type { LandlordProperty } from '@/lib/types/landlord';

export interface PropertyDashboardCardProps {
  property: LandlordProperty;
  className?: string;
}

/**
 * Calculate risk distribution from candidates
 */
function calculateRiskDistribution(property: LandlordProperty) {
  const candidates = property.candidates || [];

  return {
    levelA: candidates.filter((c) => c.riskLevel === 'A').length,
    levelB: candidates.filter((c) => c.riskLevel === 'B').length,
    levelC: candidates.filter((c) => c.riskLevel === 'C').length,
    levelD: candidates.filter((c) => c.riskLevel === 'D').length,
  };
}

/**
 * Property card for landlord dashboard
 * Shows property with candidate count badge, risk gauge, and status breakdown
 *
 * Layout (redesigned):
 * +---------------------------------------------+
 * |  [Property Image]                           |
 * |                              +------------+ |
 * |                              | 5 candidatos | |
 * |                              +------------+ |
 * +---------------------------------------------+
 * |  Apartamento en Chapinero                   |
 * |  $ 2.500.000/mes                            |
 * |  +-----------------------------------------+|
 * |  | Risk Gauge Bar                          ||
 * |  +-----------------------------------------+|
 * |  +--------+ +--------+                      |
 * |  | 3 pend | | Urgente|                      |
 * |  +--------+ +--------+                      |
 * +---------------------------------------------+
 */
export function PropertyDashboardCard({
  property,
  className,
}: PropertyDashboardCardProps) {
  const {
    id,
    title,
    thumbnailUrl,
    monthlyRent,
    neighborhood,
    city,
    candidateCount,
    pendingCount,
  } = property;

  const riskDistribution = calculateRiskDistribution(property);
  const hasUrgent = pendingCount >= 3;

  return (
    <Link
      href={`/panel/${id}`}
      className={cn('group block', className)}
    >
      {/* Card container - Premium design with subtle glow on hover */}
      <div className="relative bg-white rounded-2xl border border-border/60 overflow-hidden transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08),0_0_0_1px_rgba(127,81,255,0.05)]">
        {/* Image container with gradient overlay */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Premium gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

          {/* Candidate count badge - floating design */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <Badge
              variant="default"
              className="bg-white/95 backdrop-blur-sm text-foreground hover:bg-white shadow-lg shadow-black/10 px-3 py-2 text-sm font-semibold rounded-xl border-0"
            >
              <Users className="w-4 h-4 mr-2 text-[black]" />
              {candidateCount} {candidateCount === 1 ? 'candidato' : 'candidatos'}
            </Badge>

            {/* Price tag on image */}
            <div className="bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-xl">
              <span className="font-semibold">{formatCurrency(monthlyRent)}</span>
              <span className="text-white/60 text-xs ml-1">/mes</span>
            </div>
          </div>

          {/* Property status overlay if no candidates */}
          {candidateCount === 0 && (
            <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm flex items-center justify-center">
              <span className="bg-white/95 backdrop-blur-sm text-foreground text-sm px-5 py-2.5 rounded-xl font-medium shadow-lg">
                Sin candidatos
              </span>
            </div>
          )}
        </div>

        {/* Content - cleaner layout */}
        <div className="p-5">
          {/* Title and location */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-[black] transition-colors duration-300 truncate">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {neighborhood}, {city}
            </p>
          </div>

          {/* Risk Gauge - improved */}
          {candidateCount > 0 && (
            <div className="mb-4">
              <RiskGaugeMini distribution={riskDistribution} />
            </div>
          )}

          {/* Status badges row - modernized */}
          {candidateCount > 0 && (
            <div className="flex items-center gap-2 pt-4 border-t border-border">
              {/* Pending count */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-foreground bg-muted/80 px-3 py-2 rounded-lg font-medium">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Urgent badge - with subtle pulse */}
              {hasUrgent && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg font-medium">
                  <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                  <span>Urgente</span>
                </div>
              )}

              {/* All reviewed indicator */}
              {pendingCount === 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Todo revisado</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hover accent line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-black to-purple-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      </div>
    </Link>
  );
}
