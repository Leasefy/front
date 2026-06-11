'use client';

import { Users, Clock, CheckCircle, Medal, Trophy } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import type { DashboardSummary as DashboardSummaryTextT } from '@/lib/types/landlord';

export interface DashboardSummaryProps {
  summary: DashboardSummaryTextT;
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
    default: 'bg-card border-border text-foreground',
    pending: 'bg-[#F8F0E0]/50 border-[#B7791F]/30 text-[#B7791F]',
    'pre-approved': 'bg-[#EEF1FF]/50 border-[#1A40FF]/30 text-[#1A40FF]',
    approved: 'bg-[#E8F3EC]/50 border-[#2C7A53]/30 text-[#2C7A53]',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    pending: 'text-[#B7791F]',
    'pre-approved': 'text-[#1A40FF]',
    approved: 'text-[#2C7A53]',
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
        icon={<CheckCircle className="w-6 h-6" />}
        label="Pre-aprobados"
        value={preApproved}
        variant="pre-approved"
      />

      <StatCard
        icon={<Trophy className="w-6 h-6" />}
        label="Aprobados"
        value={approved}
        variant="approved"
      />
    </div>
  );
}
