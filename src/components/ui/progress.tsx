'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Linear Progress
// ============================================================================

const progressVariants = cva(
  'relative w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800',
  {
    variants: {
      size: {
        xs: 'h-1',
        sm: 'h-1.5',
        default: 'h-2',
        md: 'h-2.5',
        lg: 'h-3',
        xl: 'h-4',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const progressIndicatorVariants = cva(
  'h-full w-full flex-1 transition-all duration-300 ease-out',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        error: 'bg-rose-500',
        info: 'bg-blue-500',
        indigo: 'bg-indigo-500',
        gradient: 'bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500',
      },
      animated: {
        true: 'animate-pulse',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      animated: false,
    },
  }
);

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof progressIndicatorVariants> {
  showValue?: boolean;
  valuePosition?: 'inside' | 'outside' | 'tooltip';
  label?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({
  className,
  value = 0,
  size,
  variant,
  animated,
  showValue,
  valuePosition = 'outside',
  label,
  ...props
}, ref) => {
  const percentage = Math.min(100, Math.max(0, value || 0));
  const showInsideValue = showValue && valuePosition === 'inside' && (size === 'lg' || size === 'xl');

  return (
    <div className="w-full">
      {(label || (showValue && valuePosition === 'outside')) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && <span className="font-medium text-foreground">{label}</span>}
          {showValue && valuePosition === 'outside' && (
            <span className="font-mono text-xs text-muted-foreground">{percentage}%</span>
          )}
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ size, className }))}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(progressIndicatorVariants({ variant, animated }), 'relative')}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        >
          {showInsideValue && (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
              {percentage}%
            </span>
          )}
        </ProgressPrimitive.Indicator>
      </ProgressPrimitive.Root>
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

// ============================================================================
// Indeterminate Progress
// ============================================================================

export interface IndeterminateProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof progressVariants>,
    Pick<VariantProps<typeof progressIndicatorVariants>, 'variant'> {}

function IndeterminateProgress({
  className,
  size,
  variant,
  ...props
}: IndeterminateProgressProps) {
  return (
    <div
      className={cn(progressVariants({ size, className }), 'overflow-hidden')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-busy="true"
      {...props}
    >
      <div
        className={cn(
          progressIndicatorVariants({ variant }),
          'w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite]'
        )}
      />
    </div>
  );
}

// ============================================================================
// Circular Progress
// ============================================================================

const circularSizes = {
  xs: { size: 16, strokeWidth: 2 },
  sm: { size: 24, strokeWidth: 2 },
  default: { size: 32, strokeWidth: 3 },
  md: { size: 40, strokeWidth: 3 },
  lg: { size: 48, strokeWidth: 4 },
  xl: { size: 64, strokeWidth: 4 },
  '2xl': { size: 80, strokeWidth: 5 },
};

export interface CircularProgressProps extends React.SVGAttributes<SVGSVGElement> {
  value?: number;
  size?: keyof typeof circularSizes;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'indigo';
  showValue?: boolean;
  indeterminate?: boolean;
  label?: string;
}

const circularColors = {
  default: 'stroke-primary',
  success: 'stroke-emerald-500',
  warning: 'stroke-amber-500',
  error: 'stroke-rose-500',
  info: 'stroke-blue-500',
  indigo: 'stroke-indigo-500',
};

function CircularProgress({
  value = 0,
  size = 'default',
  variant = 'default',
  showValue = false,
  indeterminate = false,
  label,
  className,
  ...props
}: CircularProgressProps) {
  const { size: svgSize, strokeWidth } = circularSizes[size];
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, value));
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="relative">
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className={cn(
            indeterminate && 'animate-spin',
            className
          )}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          {...props}
        >
          {/* Background circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-neutral-200 dark:stroke-neutral-700"
          />
          {/* Progress circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
            strokeLinecap="round"
            className={cn(
              circularColors[variant],
              'transition-all duration-300 ease-out',
              '-rotate-90 origin-center'
            )}
            style={{ transformOrigin: 'center' }}
          />
        </svg>
        {showValue && !indeterminate && (size === 'lg' || size === 'xl' || size === '2xl') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              'font-mono font-medium',
              size === 'lg' && 'text-xs',
              size === 'xl' && 'text-sm',
              size === '2xl' && 'text-base'
            )}>
              {percentage}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

// ============================================================================
// Multi-step Progress
// ============================================================================

export interface Step {
  id: string;
  label: string;
  description?: string;
}

export interface StepProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  currentStep: number;
  variant?: 'default' | 'success' | 'indigo';
}

function StepProgress({
  steps,
  currentStep,
  variant = 'default',
  className,
  ...props
}: StepProgressProps) {
  const stepColors = {
    default: {
      completed: 'bg-primary border-primary text-primary-foreground',
      current: 'border-primary text-primary',
      upcoming: 'border-muted text-muted-foreground',
      line: 'bg-primary',
      lineIncomplete: 'bg-muted',
    },
    success: {
      completed: 'bg-emerald-500 border-emerald-500 text-white',
      current: 'border-emerald-500 text-emerald-600',
      upcoming: 'border-muted text-muted-foreground',
      line: 'bg-emerald-500',
      lineIncomplete: 'bg-muted',
    },
    indigo: {
      completed: 'bg-indigo-500 border-indigo-500 text-white',
      current: 'border-indigo-500 text-indigo-600',
      upcoming: 'border-muted text-muted-foreground',
      line: 'bg-indigo-500',
      lineIncomplete: 'bg-muted',
    },
  };

  const colors = stepColors[variant];

  return (
    <div className={cn('w-full', className)} {...props}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                    isCompleted && colors.completed,
                    isCurrent && cn('bg-background', colors.current),
                    !isCompleted && !isCurrent && cn('bg-background', colors.upcoming)
                  )}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    'text-sm font-medium',
                    (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                  )}
                </div>
              </div>
              {!isLast && (
                <div className="mx-2 flex-1">
                  <div
                    className={cn(
                      'h-0.5 w-full transition-colors',
                      index < currentStep ? colors.line : colors.lineIncomplete
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export { Progress, IndeterminateProgress, CircularProgress, StepProgress };
