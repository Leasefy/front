'use client';

import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Collapsible Root
// ============================================================================

const Collapsible = CollapsiblePrimitive.Root;

// ============================================================================
// Collapsible Trigger
// ============================================================================

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleTrigger
    ref={ref}
    className={cn(
      'flex w-full items-center justify-between',
      'text-sm font-medium transition-all',
      '[&[data-state=open]>svg]:rotate-180',
      className
    )}
    {...props}
  >
    {children}
  </CollapsiblePrimitive.CollapsibleTrigger>
));
CollapsibleTrigger.displayName = CollapsiblePrimitive.CollapsibleTrigger.displayName;

// ============================================================================
// Collapsible Content
// ============================================================================

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={ref}
    className={cn(
      'overflow-hidden',
      'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
      className
    )}
    {...props}
  >
    {children}
  </CollapsiblePrimitive.CollapsibleContent>
));
CollapsibleContent.displayName = CollapsiblePrimitive.CollapsibleContent.displayName;

// ============================================================================
// Collapsible Panel (convenience component)
// ============================================================================

export interface CollapsiblePanelProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
}

const CollapsiblePanel = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  CollapsiblePanelProps
>(({
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = false,
  triggerClassName,
  contentClassName,
  headerClassName,
  children,
  className,
  ...props
}, ref) => (
  <Collapsible
    ref={ref}
    defaultOpen={defaultOpen}
    className={cn('w-full', className)}
    {...props}
  >
    <CollapsibleTrigger
      className={cn(
        'group flex w-full items-center gap-3 rounded-[1px] p-3',
        'hover:bg-accent/50 transition-colors',
        triggerClassName
      )}
    >
      <div className={cn('flex flex-1 items-center gap-3', headerClassName)}>
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </span>
        )}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{title}</span>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </CollapsibleTrigger>
    <CollapsibleContent className={cn('px-3 pb-3', contentClassName)}>
      <div className="pt-2">
        {children}
      </div>
    </CollapsibleContent>
  </Collapsible>
));
CollapsiblePanel.displayName = 'CollapsiblePanel';

// ============================================================================
// Collapsible Card (styled version)
// ============================================================================

export interface CollapsibleCardProps extends CollapsiblePanelProps {
  variant?: 'default' | 'outline' | 'ghost';
}

const CollapsibleCard = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  CollapsibleCardProps
>(({ variant = 'default', className, triggerClassName, contentClassName, ...props }, ref) => {
  const variants = {
    default: 'border bg-card shadow-sm rounded-[1px]',
    outline: 'border rounded-[1px]',
    ghost: 'rounded-[1px]',
  };

  return (
    <CollapsiblePanel
      ref={ref}
      className={cn(variants[variant], className)}
      triggerClassName={cn(
        variant === 'default' && 'rounded-t-lg',
        triggerClassName
      )}
      contentClassName={cn(
        variant !== 'ghost' && 'border-t',
        contentClassName
      )}
      {...props}
    />
  );
});
CollapsibleCard.displayName = 'CollapsibleCard';

// ============================================================================
// Collapsible Section (for page sections)
// ============================================================================

export interface CollapsibleSectionProps extends CollapsiblePanelProps {
  level?: 'h2' | 'h3' | 'h4';
}

const CollapsibleSection = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  CollapsibleSectionProps
>(({ level = 'h3', title, className, triggerClassName, ...props }, ref) => {
  const HeadingTag = level;
  const headingClasses = {
    h2: 'text-xl font-semibold',
    h3: 'text-lg font-semibold',
    h4: 'text-base font-medium',
  };

  return (
    <CollapsiblePanel
      ref={ref}
      title={
        <HeadingTag className={headingClasses[level]}>
          {title}
        </HeadingTag>
      }
      className={cn('border-b pb-4', className)}
      triggerClassName={cn(
        'px-0 hover:bg-transparent',
        triggerClassName
      )}
      {...props}
    />
  );
});
CollapsibleSection.displayName = 'CollapsibleSection';

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsiblePanel,
  CollapsibleCard,
  CollapsibleSection,
};
