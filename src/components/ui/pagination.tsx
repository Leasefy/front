'use client';

import * as React from 'react';
import Link from 'next/link';
import { CaretLeft, CaretRight, CaretDoubleLeft, CaretDoubleRight, DotsThree } from '@phosphor-icons/react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from './button';

// ============================================================================
// Pagination Variants
// ============================================================================

const paginationVariants = cva(
  'flex items-center',
  {
    variants: {
      size: {
        sm: 'gap-1',
        default: 'gap-1.5',
        lg: 'gap-2',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

const paginationItemVariants = cva(
  cn(
    'inline-flex items-center justify-center font-medium',
    'ring-offset-background transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50'
  ),
  {
    variants: {
      variant: {
        default: cn(
          'border border-transparent bg-transparent text-muted-foreground',
          'hover:bg-accent hover:text-accent-foreground',
          'data-[active=true]:border-input data-[active=true]:bg-background data-[active=true]:text-foreground data-[active=true]:shadow-sm'
        ),
        outline: cn(
          'border border-input bg-background text-foreground',
          'hover:bg-accent hover:text-accent-foreground',
          'data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary'
        ),
        ghost: cn(
          'text-muted-foreground',
          'hover:bg-accent hover:text-accent-foreground',
          'data-[active=true]:bg-accent data-[active=true]:text-accent-foreground'
        ),
      },
      size: {
        sm: 'h-7 min-w-7 rounded-[1px] text-xs',
        default: 'h-9 min-w-9 rounded-[1px] text-sm',
        lg: 'h-11 min-w-11 rounded-[2px] text-base',
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

const PaginationContext = React.createContext<{
  variant: VariantProps<typeof paginationItemVariants>['variant'];
  size: VariantProps<typeof paginationItemVariants>['size'];
}>({
  variant: 'default',
  size: 'default',
});

// ============================================================================
// Pagination Root
// ============================================================================

export interface PaginationRootProps
  extends React.ComponentProps<'nav'>,
    VariantProps<typeof paginationVariants>,
    Pick<VariantProps<typeof paginationItemVariants>, 'variant'> {}

function PaginationRoot({
  className,
  size,
  variant,
  ...props
}: PaginationRootProps) {
  return (
    <PaginationContext.Provider value={{ variant, size }}>
      <nav
        role="navigation"
        aria-label="pagination"
        className={cn(paginationVariants({ size, className }))}
        {...props}
      />
    </PaginationContext.Provider>
  );
}

// ============================================================================
// Pagination Content
// ============================================================================

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => {
  const { size } = React.useContext(PaginationContext);
  return (
    <ul
      ref={ref}
      className={cn('flex flex-row items-center', paginationVariants({ size }), className)}
      {...props}
    />
  );
});
PaginationContent.displayName = 'PaginationContent';

// ============================================================================
// Pagination Item
// ============================================================================

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<'li'>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('', className)} {...props} />
));
PaginationItem.displayName = 'PaginationItem';

// ============================================================================
// Pagination Link
// ============================================================================

export interface PaginationLinkProps
  extends React.ComponentProps<typeof Link>,
    VariantProps<typeof paginationItemVariants> {
  isActive?: boolean;
}

function PaginationLink({
  className,
  isActive,
  variant,
  size,
  ...props
}: PaginationLinkProps) {
  const context = React.useContext(PaginationContext);
  return (
    <Link
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive}
      className={cn(
        paginationItemVariants({
          variant: variant ?? context.variant,
          size: size ?? context.size,
          className,
        })
      )}
      {...props}
    />
  );
}

// ============================================================================
// Pagination Button (for non-link pagination)
// ============================================================================

export interface PaginationButtonProps
  extends Omit<ButtonProps, 'variant' | 'size'>,
    VariantProps<typeof paginationItemVariants> {
  isActive?: boolean;
}

function PaginationButton({
  className,
  isActive,
  variant,
  size,
  ...props
}: PaginationButtonProps) {
  const context = React.useContext(PaginationContext);
  return (
    <button
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive}
      className={cn(
        paginationItemVariants({
          variant: variant ?? context.variant,
          size: size ?? context.size,
          className,
        })
      )}
      {...props}
    />
  );
}

// ============================================================================
// Pagination Compass Buttons
// ============================================================================

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  const { size } = React.useContext(PaginationContext);
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <PaginationLink
      aria-label="Go to previous page"
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <CaretLeft className={iconSize} />
      <span className="hidden sm:inline">Anterior</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  const { size } = React.useContext(PaginationContext);
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <PaginationLink
      aria-label="Go to next page"
      className={cn('gap-1 pr-2.5', className)}
      {...props}
    >
      <span className="hidden sm:inline">Siguiente</span>
      <CaretRight className={iconSize} />
    </PaginationLink>
  );
}

function PaginationFirst({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  const { size } = React.useContext(PaginationContext);
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <PaginationLink
      aria-label="Go to first page"
      className={className}
      {...props}
    >
      <CaretDoubleLeft className={iconSize} />
    </PaginationLink>
  );
}

function PaginationLast({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  const { size } = React.useContext(PaginationContext);
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <PaginationLink
      aria-label="Go to last page"
      className={className}
      {...props}
    >
      <CaretDoubleRight className={iconSize} />
    </PaginationLink>
  );
}

// ============================================================================
// Pagination Ellipsis
// ============================================================================

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  const { size } = React.useContext(PaginationContext);
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <span
      aria-hidden
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <DotsThree className={cn(iconSize, 'text-muted-foreground')} />
      <span className="sr-only">More pages</span>
    </span>
  );
}

// ============================================================================
// Full Pagination Component
// ============================================================================

export interface PaginationProps extends Omit<PaginationRootProps, 'children'> {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  getPageHref?: (page: number) => string;
  showFirstLast?: boolean;
  siblingCount?: number;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  getPageHref,
  showFirstLast = false,
  siblingCount = 1,
  ...props
}: PaginationProps) {
  // Generate page numbers to display
  const generatePages = () => {
    const pages: (number | 'ellipsis')[] = [];
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftEllipsis = leftSiblingIndex > 2;
    const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      const leftRange = 1 + 2 * siblingCount;
      for (let i = 1; i <= Math.min(leftRange, totalPages); i++) {
        pages.push(i);
      }
      if (totalPages > leftRange + 1) pages.push('ellipsis');
      if (totalPages > leftRange) pages.push(totalPages);
    } else if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
      pages.push(1);
      if (totalPages > 2 * siblingCount + 2) pages.push('ellipsis');
      const rightRange = totalPages - 2 * siblingCount;
      for (let i = Math.max(rightRange, 2); i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      pages.push(1);
      pages.push('ellipsis');
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        pages.push(i);
      }
      pages.push('ellipsis');
      pages.push(totalPages);
    } else {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pages = generatePages();
  const isUsingLinks = !!getPageHref;

  const PageComponent = isUsingLinks ? PaginationLink : PaginationButton;
  const NavComponent = isUsingLinks ? PaginationLink : PaginationButton;

  return (
    <PaginationRoot {...props}>
      <PaginationContent>
        {showFirstLast && (
          <PaginationItem>
            {isUsingLinks ? (
              <PaginationFirst
                href={getPageHref!(1)}
                aria-disabled={currentPage === 1}
                className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
              />
            ) : (
              <PaginationButton
                onClick={() => onPageChange?.(1)}
                disabled={currentPage === 1}
                aria-label="Go to first page"
              >
                <CaretDoubleLeft className="h-4 w-4" />
              </PaginationButton>
            )}
          </PaginationItem>
        )}

        <PaginationItem>
          {isUsingLinks ? (
            <PaginationPrevious
              href={getPageHref!(Math.max(1, currentPage - 1))}
              aria-disabled={currentPage === 1}
              className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
            />
          ) : (
            <PaginationButton
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Go to previous page"
              className="gap-1 pl-2.5"
            >
              <CaretLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </PaginationButton>
          )}
        </PaginationItem>

        {pages.map((page, index) => (
          <PaginationItem key={`${page}-${index}`}>
            {page === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : isUsingLinks ? (
              <PaginationLink
                href={getPageHref!(page)}
                isActive={page === currentPage}
              >
                {page}
              </PaginationLink>
            ) : (
              <PaginationButton
                onClick={() => onPageChange?.(page)}
                isActive={page === currentPage}
              >
                {page}
              </PaginationButton>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          {isUsingLinks ? (
            <PaginationNext
              href={getPageHref!(Math.min(totalPages, currentPage + 1))}
              aria-disabled={currentPage === totalPages}
              className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
            />
          ) : (
            <PaginationButton
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Go to next page"
              className="gap-1 pr-2.5"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <CaretRight className="h-4 w-4" />
            </PaginationButton>
          )}
        </PaginationItem>

        {showFirstLast && (
          <PaginationItem>
            {isUsingLinks ? (
              <PaginationLast
                href={getPageHref!(totalPages)}
                aria-disabled={currentPage === totalPages}
                className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
              />
            ) : (
              <PaginationButton
                onClick={() => onPageChange?.(totalPages)}
                disabled={currentPage === totalPages}
                aria-label="Go to last page"
              >
                <CaretDoubleRight className="h-4 w-4" />
              </PaginationButton>
            )}
          </PaginationItem>
        )}
      </PaginationContent>
    </PaginationRoot>
  );
}

export {
  Pagination,
  PaginationRoot,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationButton,
  PaginationPrevious,
  PaginationNext,
  PaginationFirst,
  PaginationLast,
  PaginationEllipsis,
};
