'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Divider Variants
// ============================================================================

const dividerVariants = cva(
  'shrink-0 bg-border',
  {
    variants: {
      orientation: {
        horizontal: 'h-[1px] w-full',
        vertical: 'h-full w-[1px]',
      },
      variant: {
        default: 'bg-border',
        muted: 'bg-muted',
        strong: 'bg-foreground/20',
        gradient: 'bg-gradient-to-r from-transparent via-border to-transparent',
        dashed: 'border-dashed border-t border-border bg-transparent',
        dotted: 'border-dotted border-t border-border bg-transparent',
      },
      spacing: {
        none: '',
        sm: '',
        default: '',
        lg: '',
        xl: '',
      },
    },
    compoundVariants: [
      // Horizontal spacing
      { orientation: 'horizontal', spacing: 'sm', className: 'my-2' },
      { orientation: 'horizontal', spacing: 'default', className: 'my-4' },
      { orientation: 'horizontal', spacing: 'lg', className: 'my-6' },
      { orientation: 'horizontal', spacing: 'xl', className: 'my-8' },
      // Vertical spacing
      { orientation: 'vertical', spacing: 'sm', className: 'mx-2' },
      { orientation: 'vertical', spacing: 'default', className: 'mx-4' },
      { orientation: 'vertical', spacing: 'lg', className: 'mx-6' },
      { orientation: 'vertical', spacing: 'xl', className: 'mx-8' },
    ],
    defaultVariants: {
      orientation: 'horizontal',
      variant: 'default',
      spacing: 'default',
    },
  }
);

// ============================================================================
// Divider Component
// ============================================================================

export interface DividerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dividerVariants> {
  decorative?: boolean;
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation, variant, spacing, decorative = true, ...props }, ref) => (
    <div
      ref={ref}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
      className={cn(dividerVariants({ orientation, variant, spacing, className }))}
      {...props}
    />
  )
);
Divider.displayName = 'Divider';

// ============================================================================
// Divider with Label
// ============================================================================

export interface DividerWithLabelProps extends Omit<DividerProps, 'children'> {
  label: React.ReactNode;
  labelPosition?: 'left' | 'center' | 'right';
  labelClassName?: string;
}

const DividerWithLabel = React.forwardRef<HTMLDivElement, DividerWithLabelProps>(
  ({
    label,
    labelPosition = 'center',
    labelClassName,
    className,
    spacing,
    ...props
  }, ref) => {
    const spacingClasses = {
      none: '',
      sm: 'my-2',
      default: 'my-4',
      lg: 'my-6',
      xl: 'my-8',
    };

    const positionClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          positionClasses[labelPosition],
          spacingClasses[spacing || 'default'],
          className
        )}
        role="separator"
        {...props}
      >
        {labelPosition !== 'left' && (
          <div className={cn('flex-1 bg-border h-[1px]', labelPosition === 'right' && 'flex-[3]')} />
        )}
        <span
          className={cn(
            'px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground',
            labelClassName
          )}
        >
          {label}
        </span>
        {labelPosition !== 'right' && (
          <div className={cn('flex-1 bg-border h-[1px]', labelPosition === 'left' && 'flex-[3]')} />
        )}
      </div>
    );
  }
);
DividerWithLabel.displayName = 'DividerWithLabel';

// ============================================================================
// Or Divider (common pattern for auth forms)
// ============================================================================

export interface OrDividerProps extends Omit<DividerWithLabelProps, 'label'> {
  text?: string;
}

function OrDivider({ text = 'o', ...props }: OrDividerProps) {
  return <DividerWithLabel label={text} {...props} />;
}

// ============================================================================
// Section Divider (with icon)
// ============================================================================

export interface SectionDividerProps extends Omit<DividerProps, 'children'> {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
}

const SectionDivider = React.forwardRef<HTMLDivElement, SectionDividerProps>(
  ({ icon, title, description, className, spacing = 'lg', ...props }, ref) => {
    const spacingClasses = {
      none: '',
      sm: 'my-4',
      default: 'my-6',
      lg: 'my-8',
      xl: 'my-12',
    };

    if (!icon && !title) {
      return <Divider ref={ref} spacing={spacing} className={className} {...props} />;
    }

    return (
      <div
        ref={ref}
        className={cn('relative', spacingClasses[spacing || 'lg'], className)}
        {...props}
      >
        <div className="absolute inset-0 flex items-center">
          <div className="w-full bg-border h-[1px]" />
        </div>
        <div className="relative flex justify-center">
          <div className="flex items-center gap-3 bg-background px-4">
            {icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {icon}
              </span>
            )}
            {title && (
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{title}</p>
                {description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
SectionDivider.displayName = 'SectionDivider';

export { Divider, DividerWithLabel, OrDivider, SectionDivider };
