'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Slider Variants
// ============================================================================

const sliderVariants = cva(
  'relative flex w-full touch-none select-none items-center',
  {
    variants: {
      size: {
        sm: '[&_[data-slider-track]]:h-1 [&_[data-slider-thumb]]:h-3.5 [&_[data-slider-thumb]]:w-3.5',
        default: '[&_[data-slider-track]]:h-1.5 [&_[data-slider-thumb]]:h-4 [&_[data-slider-thumb]]:w-4',
        lg: '[&_[data-slider-track]]:h-2 [&_[data-slider-thumb]]:h-5 [&_[data-slider-thumb]]:w-5',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const sliderTrackVariants = cva(
  'relative w-full grow overflow-hidden rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-neutral-200 dark:bg-neutral-700',
        muted: 'bg-muted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const sliderRangeVariants = cva(
  'absolute h-full',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        error: 'bg-rose-500',
        indigo: 'bg-indigo-600',
        gradient: 'bg-gradient-to-r from-indigo-500 to-violet-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const sliderThumbVariants = cva(
  cn(
    'block rounded-full border-2 bg-background shadow-md transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'hover:scale-110 active:scale-95 transition-transform'
  ),
  {
    variants: {
      variant: {
        default: 'border-primary',
        success: 'border-emerald-500',
        warning: 'border-amber-500',
        error: 'border-rose-500',
        indigo: 'border-indigo-500',
        gradient: 'border-violet-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// ============================================================================
// Slider Component
// ============================================================================

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderVariants>,
    VariantProps<typeof sliderRangeVariants> {
  showValue?: boolean;
  valuePosition?: 'top' | 'tooltip';
  formatValue?: (value: number) => string;
  label?: string;
  showMinMax?: boolean;
  marks?: { value: number; label?: string }[];
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({
  className,
  size,
  variant,
  showValue,
  valuePosition = 'top',
  formatValue = (v) => String(v),
  label,
  showMinMax,
  marks,
  value,
  defaultValue,
  min = 0,
  max = 100,
  ...props
}, ref) => {
  const currentValue = value ?? defaultValue ?? [min];
  const displayValue = Array.isArray(currentValue) ? currentValue : [currentValue];

  return (
    <div className="w-full">
      {/* Label and value display */}
      {(label || (showValue && valuePosition === 'top')) && (
        <div className="mb-2 flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-foreground">{label}</span>
          )}
          {showValue && valuePosition === 'top' && (
            <span className="font-mono text-sm text-muted-foreground">
              {displayValue.map(formatValue).join(' - ')}
            </span>
          )}
        </div>
      )}

      {/* Slider */}
      <SliderPrimitive.Root
        ref={ref}
        className={cn(sliderVariants({ size, className }))}
        value={value}
        defaultValue={defaultValue}
        min={min}
        max={max}
        {...props}
      >
        <SliderPrimitive.Track
          data-slider-track
          className={cn(sliderTrackVariants({ variant: 'default' }))}
        >
          <SliderPrimitive.Range
            className={cn(sliderRangeVariants({ variant }))}
          />
        </SliderPrimitive.Track>
        {displayValue.map((_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            data-slider-thumb
            className={cn(sliderThumbVariants({ variant }))}
          />
        ))}
      </SliderPrimitive.Root>

      {/* Marks */}
      {marks && marks.length > 0 && (
        <div className="relative mt-1 flex w-full justify-between px-2">
          {marks.map((mark) => {
            const position = ((mark.value - min) / (max - min)) * 100;
            return (
              <div
                key={mark.value}
                className="absolute flex flex-col items-center"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div className="h-1.5 w-0.5 bg-neutral-300 dark:bg-neutral-600" />
                {mark.label && (
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    {mark.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Min/Max labels */}
      {showMinMax && (
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      )}
    </div>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

// ============================================================================
// Range Slider (convenience wrapper)
// ============================================================================

export interface RangeSliderProps extends Omit<SliderProps, 'value' | 'defaultValue'> {
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
}

function RangeSlider({
  value,
  defaultValue = [25, 75],
  onValueChange,
  ...props
}: RangeSliderProps) {
  return (
    <Slider
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange as (value: number[]) => void}
      {...props}
    />
  );
}

export { Slider, RangeSlider };
