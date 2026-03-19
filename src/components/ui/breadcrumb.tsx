'use client';

import * as React from 'react';
import Link from 'next/link';
import { CaretRight, House, DotsThree } from '@phosphor-icons/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Breadcrumb Variants
// ============================================================================

const breadcrumbVariants = cva(
  'flex items-center',
  {
    variants: {
      size: {
        sm: 'text-xs gap-1',
        default: 'text-sm gap-1.5',
        lg: 'text-base gap-2',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const breadcrumbItemVariants = cva(
  'transition-colors duration-150',
  {
    variants: {
      variant: {
        default: 'text-muted-foreground hover:text-foreground',
        active: 'text-foreground font-medium',
        disabled: 'text-muted-foreground/50 pointer-events-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// ============================================================================
// TextTs
// ============================================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface BreadcrumbProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof breadcrumbVariants> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHouseIcon?: boolean;
  homeHref?: string;
  maxItems?: number;
  itemsBeforeCollapse?: number;
  itemsAfterCollapse?: number;
}

// ============================================================================
// Breadcrumb List Context
// ============================================================================

const BreadcrumbContext = React.createContext<{
  size: VariantProps<typeof breadcrumbVariants>['size'];
}>({ size: 'default' });

// ============================================================================
// Breadcrumb Root
// ============================================================================

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({
    items,
    size,
    separator,
    showHouseIcon = true,
    homeHref = '/',
    maxItems,
    itemsBeforeCollapse = 1,
    itemsAfterCollapse = 2,
    className,
    ...props
  }, ref) => {
    const shouldCollapse = maxItems && items.length > maxItems;

    const visibleItems = React.useMemo(() => {
      if (!shouldCollapse) return items;

      const beforeItems = items.slice(0, itemsBeforeCollapse);
      const afterItems = items.slice(-itemsAfterCollapse);

      return [
        ...beforeItems,
        { label: '...', href: undefined, isCollapsed: true } as BreadcrumbItem & { isCollapsed?: boolean },
        ...afterItems,
      ];
    }, [items, shouldCollapse, itemsBeforeCollapse, itemsAfterCollapse]);

    const iconSizes = {
      sm: 'h-3 w-3',
      default: 'h-3.5 w-3.5',
      lg: 'h-4 w-4',
    };

    const separatorSizes = {
      sm: 'h-3 w-3',
      default: 'h-4 w-4',
      lg: 'h-5 w-5',
    };

    const resolvedSize = size || 'default';
    const iconSize = iconSizes[resolvedSize];
    const separatorSize = separatorSizes[resolvedSize];

    const defaultSeparator = (
      <CaretRight className={cn(separatorSize, 'text-muted-foreground/50 shrink-0')} />
    );

    return (
      <BreadcrumbContext.Provider value={{ size }}>
        <nav
          ref={ref}
          aria-label="Breadcrumb"
          className={cn(breadcrumbVariants({ size, className }))}
          {...props}
        >
          <ol className={cn('flex items-center', breadcrumbVariants({ size }))}>
            {/* House icon */}
            {showHouseIcon && (
              <>
                <li>
                  <Link
                    href={homeHref}
                    className={cn(
                      breadcrumbItemVariants({ variant: 'default' }),
                      'flex items-center'
                    )}
                    aria-label="House"
                  >
                    <House className={iconSize} />
                  </Link>
                </li>
                {items.length > 0 && (
                  <li className="flex items-center" aria-hidden="true">
                    {separator || defaultSeparator}
                  </li>
                )}
              </>
            )}

            {/* Breadcrumb items */}
            {visibleItems.map((item, index) => {
              const isLast = index === visibleItems.length - 1;
              const isCollapsed = (item as BreadcrumbItem & { isCollapsed?: boolean }).isCollapsed;

              return (
                <React.Fragment key={`${item.label}-${index}`}>
                  <li className="flex items-center">
                    {isCollapsed ? (
                      <span className={cn(breadcrumbItemVariants({ variant: 'disabled' }), 'flex items-center gap-1')}>
                        <DotsThree className={iconSize} />
                      </span>
                    ) : isLast || !item.href || item.disabled ? (
                      <span
                        className={cn(
                          breadcrumbItemVariants({
                            variant: isLast ? 'active' : item.disabled ? 'disabled' : 'default',
                          }),
                          'flex items-center gap-1'
                        )}
                        aria-current={isLast ? 'page' : undefined}
                      >
                        {item.icon}
                        {item.label}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          breadcrumbItemVariants({ variant: 'default' }),
                          'flex items-center gap-1'
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    )}
                  </li>
                  {!isLast && (
                    <li className="flex items-center" aria-hidden="true">
                      {separator || defaultSeparator}
                    </li>
                  )}
                </React.Fragment>
              );
            })}
          </ol>
        </nav>
      </BreadcrumbContext.Provider>
    );
  }
);
Breadcrumb.displayName = 'Breadcrumb';

// ============================================================================
// Composable Breadcrumb Components
// ============================================================================

const BreadcrumbRoot = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & VariantProps<typeof breadcrumbVariants>
>(({ className, size, ...props }, ref) => (
  <BreadcrumbContext.Provider value={{ size }}>
    <nav
      ref={ref}
      aria-label="Breadcrumb"
      className={cn(breadcrumbVariants({ size, className }))}
      {...props}
    />
  </BreadcrumbContext.Provider>
));
BreadcrumbRoot.displayName = 'BreadcrumbRoot';

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.OlHTMLAttributes<HTMLOListElement>
>(({ className, ...props }, ref) => {
  const { size } = React.useContext(BreadcrumbContext);
  return (
    <ol
      ref={ref}
      className={cn('flex items-center', breadcrumbVariants({ size }), className)}
      {...props}
    />
  );
});
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItemWrapper = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn('flex items-center', className)}
    {...props}
  />
));
BreadcrumbItemWrapper.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; asChild?: boolean }
>(({ className, href, asChild, ...props }, ref) => {
  return (
    <Link
      ref={ref}
      href={href}
      className={cn(breadcrumbItemVariants({ variant: 'default' }), className)}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-current="page"
    aria-disabled="true"
    className={cn(breadcrumbItemVariants({ variant: 'active' }), className)}
    {...props}
  />
));
BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, children, ...props }, ref) => {
  const { size } = React.useContext(BreadcrumbContext);
  const separatorSizes = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  const resolvedSize = size || 'default';

  return (
    <li
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn('flex items-center', className)}
      {...props}
    >
      {children ?? (
        <CaretRight
          className={cn(separatorSizes[resolvedSize], 'text-muted-foreground/50')}
        />
      )}
    </li>
  );
});
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbEllipsis = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const { size } = React.useContext(BreadcrumbContext);
  const iconSizes = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  const resolvedSize = size || 'default';

  return (
    <span
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn('flex items-center', className)}
      {...props}
    >
      <DotsThree className={iconSizes[resolvedSize]} />
      <span className="sr-only">More</span>
    </span>
  );
});
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

export {
  Breadcrumb,
  BreadcrumbRoot,
  BreadcrumbList,
  BreadcrumbItemWrapper as BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
