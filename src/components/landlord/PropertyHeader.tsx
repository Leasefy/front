'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Bed, CornersOut, Users, CheckCircle, ArrowsOut } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { RiskGauge } from './RiskGauge';
import { useDecisions, MAX_PRE_APPROVALS } from '@/lib/context/DecisionContext';
import type { LandlordProperty, LandlordCandidate } from '@/lib/types/landlord';

interface PropertyHeaderProps {
  property: LandlordProperty;
  candidates: LandlordCandidate[];
  className?: string;
}

/**
 * Calculate risk distribution from candidates
 */
function calculateRiskDistribution(candidates: LandlordCandidate[]) {
  return {
    levelA: candidates.filter((c) => c.riskLevel === 'A').length,
    levelB: candidates.filter((c) => c.riskLevel === 'B').length,
    levelC: candidates.filter((c) => c.riskLevel === 'C').length,
    levelD: candidates.filter((c) => c.riskLevel === 'D').length,
  };
}

/**
 * Property Header - Hero header for property detail page
 */
export function PropertyHeader({
  property,
  candidates,
  className,
}: PropertyHeaderProps) {
  const { getPreApprovedCount } = useDecisions();

  const {
    title,
    thumbnailUrl,
    monthlyRent,
    neighborhood,
    city,
    bedrooms,
    area,
  } = property;

  const riskDistribution = calculateRiskDistribution(candidates);
  const allCandidateIds = candidates.map((c) => c.id);
  const preApprovedCount = getPreApprovedCount(allCandidateIds);

  return (
    <div className={cn('bg-card rounded-sm border border-border overflow-hidden', className)}>
      {/* Back Compass */}
      <div className="px-4 sm:px-6 py-3 border-b border-border">
        <Link
          href="/panel"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a mis propiedades
        </Link>
      </div>

      {/* Content */}
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        <div className="relative w-full md:w-72 lg:w-80 aspect-video md:aspect-auto">
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 320px"
          />
        </div>

        {/* Info */}
        <div className="flex-1 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left: Title and details */}
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                {title}
              </h1>

              {/* Location */}
              <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">
                  {neighborhood}, {city}
                </span>
              </div>

              {/* Property specs */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-muted-foreground" />
                  <span>{bedrooms} hab.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowsOut className="w-4 h-4 text-muted-foreground" />
                  <span>{area} m²</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{candidates.length} candidatos</span>
                </div>
                {preApprovedCount > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">
                      {preApprovedCount}/{MAX_PRE_APPROVALS} pre-aprobados
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Price */}
            <div className="lg:text-right">
              <p className="text-2xl font-bold text-foreground tracking-tight">
                {formatCurrency(monthlyRent)}
                <span className="text-muted-foreground text-base font-normal">/mes</span>
              </p>
            </div>
          </div>

          {/* Risk distribution */}
          {candidates.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                Distribucion de riesgo de candidatos
              </p>
              <RiskGauge distribution={riskDistribution} showLabels />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { PropertyHeader as default };
