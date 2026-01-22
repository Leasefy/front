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
      {/* Card container with white background */}
      <div className="bg-white rounded-[2px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Image container with candidate count badge */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Candidate count badge - bottom right */}
          <div className="absolute bottom-3 right-3">
            <Badge
              variant="default"
              className="bg-white/95 text-slate-900 hover:bg-white shadow-sm px-3 py-1.5 text-sm font-medium"
            >
              <Users className="w-4 h-4 mr-1.5" />
              {candidateCount} {candidateCount === 1 ? 'candidato' : 'candidatos'}
            </Badge>
          </div>

          {/* Property status overlay if no candidates */}
          {candidateCount === 0 && (
            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
              <span className="bg-white text-slate-700 text-xs px-4 py-2 rounded-[2px]">
                Sin candidatos
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title and price row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-medium text-slate-900 group-hover:text-primary transition-colors tracking-tight truncate">
                {title}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5 tracking-tight truncate">
                {neighborhood}, {city}
              </p>
            </div>
            <p className="text-base font-medium text-slate-900 whitespace-nowrap tracking-tight">
              {formatCurrency(monthlyRent)}
              <span className="text-slate-400 text-sm font-normal">/mes</span>
            </p>
          </div>

          {/* Risk Gauge */}
          {candidateCount > 0 && (
            <div className="mt-4">
              <RiskGaugeMini distribution={riskDistribution} />
            </div>
          )}

          {/* Status badges row */}
          {candidateCount > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              {/* Pending count */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-[2px]">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Urgent badge */}
              {hasUrgent && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-[2px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Urgente</span>
                </div>
              )}

              {/* All reviewed indicator when no pending */}
              {pendingCount === 0 && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <span>Todo revisado</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
