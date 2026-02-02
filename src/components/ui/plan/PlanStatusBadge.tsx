'use client';

import { cn } from '@/lib/utils';

export type PlanStatusType =
  | 'new'
  | 'in_progress'
  | 'accepted'
  | 'rejected'
  | 'important'
  | 'pending'
  | 'completed'
  | 'loan_granted'
  | 'custom';

export interface PlanStatusBadgeProps {
  status: PlanStatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  customColor?: {
    bg: string;
    text: string;
  };
}

// PLan CRM exact colors - flat, no borders
const statusConfig: Record<Exclude<PlanStatusType, 'custom'>, {
  label: string;
  bg: string;
  text: string;
}> = {
  new: {
    label: 'Nuevo',
    bg: 'bg-yellow-100',
    text: 'text-yellow-900',
  },
  in_progress: {
    label: 'En progreso',
    bg: 'bg-plan-status-green',
    text: 'text-white',
  },
  accepted: {
    label: 'Aceptado',
    bg: 'bg-plan-status-green-bg',
    text: 'text-green-800',
  },
  rejected: {
    label: 'Rechazado',
    bg: 'bg-plan-status-red-bg',
    text: 'text-red-800',
  },
  important: {
    label: 'Importante',
    bg: 'bg-rose-200',
    text: 'text-rose-800',
  },
  pending: {
    label: 'Pendiente',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
  },
  completed: {
    label: 'Completado',
    bg: 'bg-plan-status-green-bg',
    text: 'text-green-800',
  },
  loan_granted: {
    label: 'Prestamo otorgado',
    bg: 'bg-rose-200',
    text: 'text-rose-800',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-[11px]',
  lg: 'px-3 py-1.5 text-[12px]',
};

export function PlanStatusBadge({
  status,
  label,
  size = 'sm',
  className,
  customColor,
}: PlanStatusBadgeProps) {
  const config = status === 'custom' && customColor
    ? { label: label || 'Personalizado', ...customColor }
    : statusConfig[status as Exclude<PlanStatusType, 'custom'>];

  const displayLabel = label || config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium whitespace-nowrap rounded-sm',
        config.bg,
        config.text,
        sizeClasses[size],
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

// Status transition component (New → In progress)
export function PlanStatusTransition({
  from,
  to,
  fromLabel,
  toLabel,
  className,
}: {
  from: PlanStatusType;
  to: PlanStatusType;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <PlanStatusBadge status={from} label={fromLabel} size="sm" />
      <span className="text-plan-muted text-[11px]">→</span>
      <PlanStatusBadge status={to} label={toLabel} size="sm" />
    </div>
  );
}

// Utility to get status from various application states
export function getApplicationStatus(status: string): PlanStatusType {
  const statusMap: Record<string, PlanStatusType> = {
    'pending': 'pending',
    'submitted': 'new',
    'under_review': 'in_progress',
    'reviewing': 'in_progress',
    'approved': 'accepted',
    'rejected': 'rejected',
    'documentation': 'in_progress',
    'final_review': 'in_progress',
    'accepted': 'accepted',
    'pre_approved': 'in_progress',
    'pre-approved': 'in_progress',
    'active': 'in_progress',
    'ending_soon': 'important',
    'ended': 'completed',
    'paid': 'completed',
    'overdue': 'important',
    'upcoming': 'new',
    'loan_granted': 'loan_granted',
    'granted': 'loan_granted',
  };

  return statusMap[status.toLowerCase()] || 'pending';
}

// Risk level badge variant
export type RiskLevel = 'A' | 'B' | 'C' | 'D';

const riskConfig: Record<RiskLevel, {
  label: string;
  bg: string;
  text: string;
}> = {
  A: {
    label: 'Bajo Riesgo',
    bg: 'bg-plan-status-green-bg',
    text: 'text-green-800',
  },
  B: {
    label: 'Riesgo Moderado',
    bg: 'bg-plan-status-blue-bg',
    text: 'text-blue-800',
  },
  C: {
    label: 'Riesgo Medio',
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
  },
  D: {
    label: 'Alto Riesgo',
    bg: 'bg-plan-status-red-bg',
    text: 'text-red-800',
  },
};

export interface PlanRiskBadgeProps {
  level: RiskLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PlanRiskBadge({
  level,
  showLabel = false,
  size = 'md',
  className,
}: PlanRiskBadgeProps) {
  const config = riskConfig[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-sm',
        config.bg,
        config.text,
        sizeClasses[size],
        className
      )}
    >
      <span className="font-bold">{level}</span>
      {showLabel && <span className="font-medium">{config.label}</span>}
    </span>
  );
}
