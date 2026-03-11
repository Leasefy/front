'use client';

import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';

// ============================================================================
// Scroll Area
// ============================================================================

export interface ScrollAreaProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  orientation?: 'vertical' | 'horizontal' | 'both';
  scrollbarSize?: 'thin' | 'default' | 'thick';
  scrollHideDelay?: number;
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({
  className,
  children,
  orientation = 'vertical',
  scrollbarSize = 'default',
  scrollHideDelay = 600,
  ...props
}, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    {(orientation === 'vertical' || orientation === 'both') && (
      <ScrollBar orientation="vertical" size={scrollbarSize} scrollHideDelay={scrollHideDelay} />
    )}
    {(orientation === 'horizontal' || orientation === 'both') && (
      <ScrollBar orientation="horizontal" size={scrollbarSize} scrollHideDelay={scrollHideDelay} />
    )}
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

// ============================================================================
// Scroll Bar
// ============================================================================

const scrollbarSizes = {
  thin: {
    vertical: 'w-1.5',
    horizontal: 'h-1.5',
    thumb: 'rounded-full',
  },
  default: {
    vertical: 'w-2.5',
    horizontal: 'h-2.5',
    thumb: 'rounded-full',
  },
  thick: {
    vertical: 'w-3',
    horizontal: 'h-3',
    thumb: 'rounded-sm',
  },
};

interface ScrollBarProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> {
  size?: 'thin' | 'default' | 'thick';
  scrollHideDelay?: number;
}

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  ScrollBarProps
>(({ className, orientation = 'vertical', size = 'default', scrollHideDelay, ...props }, ref) => {
  const sizeClasses = scrollbarSizes[size];

  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      ref={ref}
      orientation={orientation}
      className={cn(
        'flex touch-none select-none transition-colors',
        orientation === 'vertical' && cn('h-full border-l border-l-transparent p-[1px]', sizeClasses.vertical),
        orientation === 'horizontal' && cn('flex-col border-t border-t-transparent p-[1px]', sizeClasses.horizontal),
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        className={cn(
          'relative flex-1 bg-border hover:bg-muted-foreground/30 transition-colors',
          sizeClasses.thumb
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
});
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

// ============================================================================
// Scroll Area with Shadow Indicators
// ============================================================================

export interface ScrollAreaWithShadowsProps extends ScrollAreaProps {
  shadowColor?: string;
  showShadows?: boolean;
}

function ScrollAreaWithShadows({
  children,
  className,
  orientation = 'vertical',
  shadowColor = 'from-background',
  showShadows = true,
  ...props
}: ScrollAreaWithShadowsProps) {
  const [showTopShadow, setShowTopShadow] = React.useState(false);
  const [showRobottomShadow, setShowRobottomShadow] = React.useState(false);
  const [showLeftShadow, setShowLeftShadow] = React.useState(false);
  const [showRightShadow, setShowRightShadow] = React.useState(false);

  const handleScroll = React.useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = target;

    if (orientation === 'vertical' || orientation === 'both') {
      setShowTopShadow(scrollTop > 0);
      setShowRobottomShadow(scrollTop < scrollHeight - clientHeight - 1);
    }

    if (orientation === 'horizontal' || orientation === 'both') {
      setShowLeftShadow(scrollLeft > 0);
      setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, [orientation]);

  return (
    <div className={cn('relative', className)}>
      <ScrollArea
        orientation={orientation}
        onScroll={handleScroll as unknown as React.UIEventHandler}
        {...props}
      >
        {children}
      </ScrollArea>
      {showShadows && (
        <>
          {(orientation === 'vertical' || orientation === 'both') && (
            <>
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b to-transparent transition-opacity duration-200',
                  shadowColor,
                  showTopShadow ? 'opacity-100' : 'opacity-0'
                )}
              />
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t to-transparent transition-opacity duration-200',
                  shadowColor,
                  showRobottomShadow ? 'opacity-100' : 'opacity-0'
                )}
              />
            </>
          )}
          {(orientation === 'horizontal' || orientation === 'both') && (
            <>
              <div
                className={cn(
                  'pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r to-transparent transition-opacity duration-200',
                  shadowColor,
                  showLeftShadow ? 'opacity-100' : 'opacity-0'
                )}
              />
              <div
                className={cn(
                  'pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent transition-opacity duration-200',
                  shadowColor,
                  showRightShadow ? 'opacity-100' : 'opacity-0'
                )}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export { ScrollArea, ScrollBar, ScrollAreaWithShadows };
