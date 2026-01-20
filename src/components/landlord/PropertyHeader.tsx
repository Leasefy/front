'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Bed, Maximize2, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { RiskGauge } from './RiskGauge';
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

  return (
    <div className={cn('bg-white rounded-sm border border-slate-100 overflow-hidden', className)}>
      {/* Back Navigation */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-100">
        <Link
          href="/panel"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
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
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                {title}
              </h1>

              {/* Location */}
              <div className="flex items-center gap-1.5 mt-2 text-slate-500">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">
                  {neighborhood}, {city}
                </span>
              </div>

              {/* Property specs */}
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-slate-400" />
                  <span>{bedrooms} hab.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4 text-slate-400" />
                  <span>{area} m²</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>{candidates.length} candidatos</span>
                </div>
              </div>
            </div>

            {/* Right: Price */}
            <div className="lg:text-right">
              <p className="text-2xl font-bold text-slate-900 tracking-tight">
                {formatCurrency(monthlyRent)}
                <span className="text-slate-400 text-base font-normal">/mes</span>
              </p>
            </div>
          </div>

          {/* Risk distribution */}
          {candidates.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">
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
