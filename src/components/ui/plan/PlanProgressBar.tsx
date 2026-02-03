'use client';

import { cn } from '@/lib/utils';

export interface PlanProgressBarProps {
  value: number; // 0-100
  max?: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted';
  className?: string;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
};

export function PlanProgressBar({
  value,
  max = 100,
  showValue = false,
  size = 'sm',
  variant = 'default',
  className,
}: PlanProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  // PLan CRM uses simple gray track with green/lime fill
  const getBarColor = () => {
    switch (variant) {
      case 'success':
        return 'bg-plan-status-green';
      case 'warning':
        return 'bg-plan-status-yellow';
      case 'danger':
        return 'bg-plan-status-red';
      case 'muted':
        return 'bg-plan-muted';
      default:
        // PLan CRM lime/green gradient
        return 'bg-gradient-to-r from-lime-300 to-plan-status-green';
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'relative flex-1 bg-muted rounded-full overflow-visible',
        sizeClasses[size]
      )}>
        {/* Progress fill with diagonal stripes */}
        <div
          className={cn(
            'h-full rounded-full relative overflow-hidden',
            getBarColor(),
            'transition-all duration-300'
          )}
          style={{ width: `${percentage}%` }}
        >
          {/* Diagonal stripes overlay */}
          {percentage > 0 && (
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 2px,
                  rgba(255,255,255,0.5) 2px,
                  rgba(255,255,255,0.5) 4px
                )`,
              }}
            />
          )}
        </div>

        {/* Dot at the end - matches bar color */}
        {percentage > 0 && (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 rounded-full',
              variant === 'success' ? 'bg-plan-status-green' :
              variant === 'warning' ? 'bg-plan-status-yellow' :
              variant === 'danger' ? 'bg-plan-status-red' :
              variant === 'muted' ? 'bg-plan-muted' :
              'bg-emerald-600',
              size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-2.5 h-2.5' : 'w-3 h-3'
            )}
            style={{
              left: `calc(${percentage}% - ${size === 'sm' ? '4px' : size === 'md' ? '5px' : '6px'})`
            }}
          />
        )}
      </div>

      {/* Percentage value */}
      {showValue && (
        <span className="text-[11px] font-medium text-plan-secondary min-w-[32px] text-right">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// Circular progress variant
export interface PlanCircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

const circularVariantColors = {
  default: '#22C55E',
  success: '#22C55E',
  warning: '#EAB308',
  danger: '#EF4444',
};

export function PlanCircularProgress({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  showValue = true,
  variant = 'default',
  className,
}: PlanCircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const color = circularVariantColors[variant];

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300"
        />
      </svg>
      {showValue && (
        <span className="absolute text-[11px] font-semibold text-plan-primary">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
