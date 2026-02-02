'use client';

import { Users, Clock, CheckCircle2, Award } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { DashboardSummary as DashboardSummaryType } from '@/lib/types/landlord';

export interface DashboardSummaryProps {
  summary: DashboardSummaryType;
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant?: 'default' | 'pending' | 'pre-approved' | 'approved';
}

function StatCard({ icon, label, value, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-white border-border text-foreground',
    pending: 'bg-amber-50/50 border-amber-100 text-amber-700',
    'pre-approved': 'bg-blue-50/50 border-blue-100 text-blue-700',
    approved: 'bg-emerald-50/50 border-emerald-100 text-emerald-700',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    pending: 'text-amber-500',
    'pre-approved': 'text-blue-500',
    approved: 'text-emerald-500',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-sm border',
        variantStyles[variant]
      )}
    >
      <div className={cn('flex-shrink-0', iconStyles[variant])}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-semibold tabular-nums">
          {value}
        </p>
        <p className={cn(
          'text-sm truncate',
          variant === 'default' ? 'text-muted-foreground' : 'opacity-80'
        )}>
          {label}
        </p>
      </div>
    </div>
  );
}

/**
 * Dashboard summary stats component
 * Displays aggregate statistics for all landlord properties
 *
 * Layout:
 * +------------+ +------------+ +------------+ +------------+
 * | 12         | | 5          | | 2          | | 1          |
 * | candidatos | | pendientes | | pre-aprob. | | aprobados  |
 * +------------+ +------------+ +------------+ +------------+
 */
export function DashboardSummary({ summary, className }: DashboardSummaryProps) {
  const {
    totalCandidates,
    pendingReview,
    preApproved,
    approved,
  } = summary;

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      <StatCard
        icon={<Users className="w-6 h-6" />}
        label="Total candidatos"
        value={totalCandidates}
        variant="default"
      />

      <StatCard
        icon={<Clock className="w-6 h-6" />}
        label="Pendientes"
        value={pendingReview}
        variant="pending"
      />

      <StatCard
        icon={<CheckCircle2 className="w-6 h-6" />}
        label="Pre-aprobados"
        value={preApproved}
        variant="pre-approved"
      />

      <StatCard
        icon={<Award className="w-6 h-6" />}
        label="Aprobados"
        value={approved}
        variant="approved"
      />
    </div>
  );
}
