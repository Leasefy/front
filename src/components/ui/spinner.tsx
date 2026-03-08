'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Spinner Variants
// ============================================================================

const spinnerVariants = cva(
  'animate-spin',
  {
    variants: {
      size: {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        default: 'h-5 w-5',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-10 w-10',
        '2xl': 'h-12 w-12',
      },
      variant: {
        default: 'text-primary',
        muted: 'text-muted-foreground',
        white: 'text-white',
        current: 'text-current',
        success: 'text-emerald-500',
        warning: 'text-amber-500',
        error: 'text-rose-500',
        info: 'text-blue-500',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

// ============================================================================
// Spinner Component
// ============================================================================

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, variant, label = 'Loading', ...props }, ref) => {
    return (
      <svg
        ref={ref}
        className={cn(spinnerVariants({ size, variant, className }))}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-label={label}
        role="status"
        {...props}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  }
);
Spinner.displayName = 'Spinner';

// ============================================================================
// Dots Spinner
// ============================================================================

export interface DotsSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Pick<VariantProps<typeof spinnerVariants>, 'variant'> {
  size?: 'xs' | 'sm' | 'default' | 'md' | 'lg';
}

const dotSizes = {
  xs: 'h-1 w-1',
  sm: 'h-1.5 w-1.5',
  default: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

const dotGaps = {
  xs: 'gap-0.5',
  sm: 'gap-1',
  default: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2.5',
};

const dotColors = {
  default: 'bg-primary',
  muted: 'bg-muted-foreground',
  white: 'bg-white',
  current: 'bg-current',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
  info: 'bg-blue-500',
};

function DotsSpinner({
  size = 'default',
  variant = 'default',
  className,
  ...props
}: DotsSpinnerProps) {
  return (
    <div
      className={cn('flex items-center', dotGaps[size], className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-bounce',
            dotSizes[size],
            dotColors[variant || 'default']
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Pulse Spinner
// ============================================================================

export interface PulseSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Pick<VariantProps<typeof spinnerVariants>, 'variant'> {
  size?: 'xs' | 'sm' | 'default' | 'md' | 'lg';
}

const pulseSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  default: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

function PulseSpinner({
  size = 'default',
  variant = 'default',
  className,
  ...props
}: PulseSpinnerProps) {
  const color = dotColors[variant || 'default'];

  return (
    <div
      className={cn('relative', pulseSizes[size], className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <div
        className={cn(
          'absolute inset-0 rounded-full animate-ping opacity-75',
          color
        )}
      />
      <div
        className={cn(
          'relative h-full w-full rounded-full',
          color
        )}
      />
    </div>
  );
}

// ============================================================================
// Bar Spinner
// ============================================================================

export interface BarSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Pick<VariantProps<typeof spinnerVariants>, 'variant'> {
  size?: 'xs' | 'sm' | 'default' | 'md' | 'lg';
}

const barSizes = {
  xs: 'h-3 w-0.5',
  sm: 'h-4 w-0.5',
  default: 'h-5 w-1',
  md: 'h-6 w-1',
  lg: 'h-8 w-1.5',
};

const barGaps = {
  xs: 'gap-0.5',
  sm: 'gap-0.5',
  default: 'gap-1',
  md: 'gap-1',
  lg: 'gap-1.5',
};

function BarSpinner({
  size = 'default',
  variant = 'default',
  className,
  ...props
}: BarSpinnerProps) {
  const color = dotColors[variant || 'default'];

  return (
    <div
      className={cn('flex items-end', barGaps[size], className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-pulse',
            barSizes[size],
            color
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.8s',
            transform: `scaleY(${0.4 + (i % 3) * 0.3})`,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Full Page Spinner
// ============================================================================

export interface FullPageSpinnerProps
  extends Omit<SpinnerProps, 'size'> {
  text?: string;
  backdrop?: boolean;
}

function FullPageSpinner({
  text = 'Cargando...',
  backdrop = true,
  variant = 'default',
  className,
  ...props
}: FullPageSpinnerProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[300] flex flex-col items-center justify-center',
        backdrop && 'bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <Spinner size="xl" variant={variant} {...props} />
      {text && (
        <p className="mt-4 text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

// ============================================================================
// Inline Spinner (for buttons, etc.)
// ============================================================================

export interface InlineSpinnerProps extends SpinnerProps {
  text?: string;
  textPosition?: 'left' | 'right';
}

function InlineSpinner({
  text,
  textPosition = 'right',
  size = 'sm',
  variant = 'current',
  className,
  ...props
}: InlineSpinnerProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {text && textPosition === 'left' && <span>{text}</span>}
      <Spinner size={size} variant={variant} {...props} />
      {text && textPosition === 'right' && <span>{text}</span>}
    </span>
  );
}

export { Spinner, DotsSpinner, PulseSpinner, BarSpinner, FullPageSpinner, InlineSpinner };
