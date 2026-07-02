'use client';

import * as React from 'react';
import { Progress as DSProgress } from '@leasefy/cadence';

import { cn } from '@/lib/utils';

/**
 * ADAPTER fino sobre el Progress de @leasefy/cadence que preserva la API local:
 * - variant: default/success/warning/error/info/indigo/gradient → color del DS
 *   (default/info/indigo/gradient → primary; error → danger).
 * - size: xs/sm/default/md/lg/xl → xs/sm/md del DS + altura exacta legacy por
 *   fidelidad (el DS solo trae h-1/h-1.5/h-2).
 * - label → aria-label del DS.
 * - Los componentes sin call sites (IndeterminateProgress, CircularProgress,
 *   StepProgress) se eliminan.
 */

type ProgressVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'indigo'
  | 'gradient';

type ProgressSize = 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl';

type DSProgressProps = React.ComponentProps<typeof DSProgress>;

const COLOR_MAP: Record<ProgressVariant, NonNullable<DSProgressProps['color']>> = {
  default: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'primary',
  indigo: 'primary',
  gradient: 'primary',
};

const SIZE_MAP: Record<ProgressSize, NonNullable<DSProgressProps['size']>> = {
  xs: 'xs',
  sm: 'sm',
  default: 'md',
  md: 'md',
  lg: 'md',
  xl: 'md',
};

// Alturas exactas de la escala legacy que el DS no trae.
const SIZE_FIDELITY: Partial<Record<ProgressSize, string>> = {
  md: 'h-2.5',
  lg: 'h-3',
  xl: 'h-4',
};

export interface ProgressProps {
  value?: number | null;
  max?: number;
  variant?: ProgressVariant | null;
  size?: ProgressSize | null;
  label?: string;
  className?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, variant, size, label, className }, _ref) => {
    const resolvedVariant = variant ?? 'default';
    const resolvedSize = size ?? 'default';

    return (
      <DSProgress
        value={value ?? 0}
        max={max}
        color={COLOR_MAP[resolvedVariant]}
        size={SIZE_MAP[resolvedSize]}
        label={label}
        className={cn(SIZE_FIDELITY[resolvedSize], className)}
      />
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
