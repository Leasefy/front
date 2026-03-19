'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Avatar Variants
// ============================================================================

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-[10px]',
        sm: 'h-8 w-8 text-xs',
        default: 'h-10 w-10 text-sm',
        md: 'h-12 w-12 text-base',
        lg: 'h-14 w-14 text-lg',
        xl: 'h-16 w-16 text-xl',
        '2xl': 'h-20 w-20 text-2xl',
      },
      ring: {
        none: '',
        default: 'ring-2 ring-background',
        primary: 'ring-2 ring-primary',
        success: 'ring-2 ring-emerald-500',
        warning: 'ring-2 ring-amber-500',
        error: 'ring-2 ring-rose-500',
      },
    },
    defaultVariants: {
      size: 'default',
      ring: 'none',
    },
  }
);

const avatarFallbackVariants = cva(
  'flex h-full w-full items-center justify-center font-medium uppercase',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        primary: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary text-secondary-foreground',
        indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
        emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
        amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
        rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// ============================================================================
// Avatar Root
// ============================================================================

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, ring, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size, ring, className }))}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

// ============================================================================
// Avatar Image
// ============================================================================

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

// ============================================================================
// Avatar Fallback
// ============================================================================

export interface AvatarFallbackProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>,
    VariantProps<typeof avatarFallbackVariants> {}

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, variant, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(avatarFallbackVariants({ variant, className }))}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// ============================================================================
// Avatar Group
// ============================================================================

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
  children: React.ReactNode;
}

function AvatarGroup({ children, max, size = 'default', className, ...props }: AvatarGroupProps) {
  const childrenArray = React.Children.toArray(children);
  const visibleChildren = max ? childrenArray.slice(0, max) : childrenArray;
  const remainingCount = max ? Math.max(0, childrenArray.length - max) : 0;

  return (
    <div
      className={cn('flex -space-x-2', className)}
      {...props}
    >
      {visibleChildren.map((child, index) => (
        <div key={index} className="relative" style={{ zIndex: visibleChildren.length - index }}>
          {React.isValidElement<AvatarProps>(child)
            ? React.cloneElement(child, { size, ring: 'default' } as Partial<AvatarProps>)
            : child}
        </div>
      ))}
      {remainingCount > 0 && (
        <Avatar size={size} ring="default" className="relative z-0">
          <AvatarFallback variant="default">+{remainingCount}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

// ============================================================================
// Avatar with Status Indicator
// ============================================================================

export interface AvatarWithStatusProps extends AvatarProps {
  status?: 'online' | 'offline' | 'busy' | 'away';
  src?: string;
  alt?: string;
  fallback?: string;
  fallbackVariant?: VariantProps<typeof avatarFallbackVariants>['variant'];
}

const statusColors = {
  online: 'bg-emerald-500',
  offline: 'bg-neutral-400',
  busy: 'bg-rose-500',
  away: 'bg-amber-500',
};

const statusSizes = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  default: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
  xl: 'h-4 w-4',
  '2xl': 'h-5 w-5',
};

function AvatarWithStatus({
  status,
  src,
  alt,
  fallback,
  fallbackVariant,
  size = 'default',
  ...props
}: AvatarWithStatusProps) {
  return (
    <div className="relative inline-block">
      <Avatar size={size} {...props}>
        {src && <AvatarImage src={src} alt={alt || ''} />}
        <AvatarFallback variant={fallbackVariant}>
          {fallback || alt?.charAt(0).toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
            statusColors[status],
            statusSizes[size || 'default']
          )}
          aria-label={status}
        />
      )}
    </div>
  );
}

// ============================================================================
// Utility: Get initials from name
// ============================================================================

export function getInitials(name: string, maxLength = 2): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .filter(Boolean)
    .slice(0, maxLength)
    .join('')
    .toUpperCase();
}

// ============================================================================
// Utility: Get color variant from string (for consistent colors per user)
// ============================================================================

const colorVariants: NonNullable<VariantProps<typeof avatarFallbackVariants>['variant']>[] = [
  'indigo',
  'emerald',
  'amber',
  'rose',
  'blue',
  'violet',
];

export function getColorFromString(str: string): NonNullable<VariantProps<typeof avatarFallbackVariants>['variant']> {
  const hash = str.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const index = Math.abs(hash) % colorVariants.length;
  return colorVariants[index];
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarWithStatus };
