'use client';

import { Buildings, Users, Clock, CheckCircle, Medal, Trophy } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { KPICard } from './KPICard';
import type { DashboardSummary } from '@/lib/types/landlord';

interface KPIGridProps {
  summary: DashboardSummary;
  className?: string;
}

/**
 * KPI Grid - Dashboard metrics grid
 * 4 columns on desktop, 2 on mobile
 */
export function KPIGrid({ summary, className }: KPIGridProps) {
  const {
    totalProperties,
    totalCandidates,
    pendingReview,
    preApproved,
    approved,
  } = summary;

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      <KPICard
        title="Total Candidatos"
        value={totalCandidates}
        icon={Users}
        variant="primary"
      />

      <KPICard
        title="Pendientes"
        value={pendingReview}
        icon={Clock}
        variant="warning"
        trend={
          pendingReview > 0
            ? { value: 12, isPositive: true, label: 'vs semana anterior' }
            : undefined
        }
      />

      <KPICard
        title="Pre-aprobados"
        value={preApproved}
        icon={CheckCircle}
        variant="info"
      />

      <KPICard
        title="Aprobados"
        value={approved}
        icon={Trophy}
        variant="success"
      />
    </div>
  );
}

export { KPIGrid as default };
