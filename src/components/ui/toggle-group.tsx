'use client';

import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Toggle Group Variants
// ============================================================================

const toggleGroupVariants = cva(
  'inline-flex items-center rounded-[2px] bg-muted p-1',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        outline: 'border border-input bg-transparent p-0.5',
        ghost: 'bg-transparent p-0',
      },
      size: {
        sm: 'gap-0.5',
        default: 'gap-1',
        lg: 'gap-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const toggleGroupItemVariants = cva(
  cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-[1px] font-medium',
    'ring-offset-background transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50'
  ),
  {
    variants: {
      variant: {
        default: cn(
          'text-muted-foreground',
          'hover:text-foreground',
          'data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm'
        ),
        outline: cn(
          'text-muted-foreground border border-transparent',
          'hover:bg-accent hover:text-accent-foreground',
          'data-[state=on]:border-input data-[state=on]:bg-background data-[state=on]:text-foreground'
        ),
        ghost: cn(
          'text-muted-foreground',
          'hover:bg-accent hover:text-accent-foreground',
          'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground'
        ),
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        default: 'h-9 px-3 text-sm',
        lg: 'h-11 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// ============================================================================
// Context
// ============================================================================

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleGroupVariants>
>({
  variant: 'default',
  size: 'default',
});

// ============================================================================
// Toggle Group Root
// ============================================================================

interface ToggleGroupBaseProps extends VariantProps<typeof toggleGroupVariants> {
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  rovingFocus?: boolean;
  orientation?: 'horizontal' | 'vertical';
  dir?: 'ltr' | 'rtl';
  loop?: boolean;
}

export interface ToggleGroupSingleProps extends ToggleGroupBaseProps {
  type: 'single';
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export interface ToggleGroupMultipleProps extends ToggleGroupBaseProps {
  type: 'multiple';
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}

export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

const ToggleGroup = React.forwardRef<
  HTMLDivElement,
  ToggleGroupProps
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn(toggleGroupVariants({ variant, size, className }))}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

// ============================================================================
// Toggle Group Item
// ============================================================================

export interface ToggleGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>,
    VariantProps<typeof toggleGroupItemVariants> {}

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  ToggleGroupItemProps
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleGroupItemVariants({
          variant: variant ?? context.variant,
          size: size ?? context.size,
          className,
        })
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

// ============================================================================
// Segmented Control (convenience wrapper)
// ============================================================================

export interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps
  extends Omit<ToggleGroupSingleProps, 'type' | 'children'> {
  options: SegmentedControlOption[];
  iconOnly?: boolean;
}

function SegmentedControl({
  options,
  iconOnly,
  ...props
}: SegmentedControlProps) {
  return (
    <ToggleGroup type="single" {...props}>
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          aria-label={iconOnly ? option.label : undefined}
        >
          {option.icon && (
            <span className={cn(!iconOnly && 'mr-2')}>{option.icon}</span>
          )}
          {!iconOnly && option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export { ToggleGroup, ToggleGroupItem, SegmentedControl };
