'use client';

import { cn } from '@/lib/utils';
import {
  type TenantApplicationStatus,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from '@/lib/types/tenant-application';

export interface ApplicationStatusBadgeProps {
  /** Application status to display */
  status: TenantApplicationStatus;
  /** Badge size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Status badge component for tenant application tracking
 * Displays status with appropriate color and Spanish label
 *
 * Colors:
 * - submitted: slate (neutral - waiting)
 * - under_review: blue (active - in progress)
 * - pre_approved: sky (positive - almost there)
 * - approved: emerald (success)
 * - rejected: red (declined)
 * - withdrawn: amber (cancelled by user)
 */
export function ApplicationStatusBadge({
  status,
  size = 'md',
  className,
}: ApplicationStatusBadgeProps) {
  const label = APPLICATION_STATUS_LABELS[status];
  const colorClasses = APPLICATION_STATUS_COLORS[status];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-sm',
        colorClasses,
        sizeClasses[size],
        className
      )}
    >
      {label}
    </span>
  );
}
