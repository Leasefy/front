'use client';

/**
 * Pagination — SHIM/ADAPTER sobre @leasefy/ui.
 *
 * Dos piezas:
 *
 * 1. `TablePagination` — el Pagination del design system (~/rent/design-system):
 *    footer de tabla estilo Manus ("X filas · Filas por página · n/m · ‹ ›"),
 *    API total/page/pageSize. Se envuelve solo para agrandar los touch targets
 *    internos a >=44px en dispositivos táctiles ([@media(pointer:coarse)]);
 *    en desktop (pointer fino) la apariencia no cambia.
 *
 * 2. `Pagination` — paginador con ventana de páginas (1 … 4 5 6 … 12), con la
 *    API del producto (currentPage/totalPages/onPageChange/getPageHref/
 *    showFirstLast/siblingCount) que consumen los call sites del mvp (p.ej.
 *    cobros). Restyle según BRAND-CONTRACT: gris-primero, radio md, sin
 *    sombras, iconos Phosphor; el azul queda reservado a acciones primarias.
 *
 * Nota: la familia composable legacy (PaginationRoot, PaginationContent,
 * PaginationItem, PaginationLink, PaginationButton, PaginationPrevious/Next/
 * First/Last, PaginationEllipsis) no tiene call sites en el mvp; si se
 * necesita de nuevo, recuperar la versión anterior del historial o componer
 * directamente sobre '@leasefy/ui'.
 */

import * as React from 'react';
import Link from 'next/link';
import {
  CaretLeft,
  CaretRight,
  CaretDoubleLeft,
  CaretDoubleRight,
  DotsThree,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Pagination as DSTablePagination } from '@leasefy/ui';
import type { PaginationProps as DSTablePaginationProps } from '@leasefy/ui';

// ============================================================================
// TablePagination — footer de tabla del DS + touch targets táctiles
// ============================================================================

export type TablePaginationProps = DSTablePaginationProps;

export function TablePagination({ className, ...props }: TablePaginationProps) {
  return (
    <DSTablePagination
      className={cn(
        // Touch targets >=44px SOLO con pointer grueso; los controles internos
        // del DS miden 26px y quedan intactos en desktop.
        '[@media(pointer:coarse)]:h-auto [@media(pointer:coarse)]:min-h-11',
        '[@media(pointer:coarse)]:[&_button]:min-h-11 [@media(pointer:coarse)]:[&_button]:min-w-11',
        '[@media(pointer:coarse)]:[&_select]:min-h-11',
        className
      )}
      {...props}
    />
  );
}

// ============================================================================
// Pagination — paginador con ventana de páginas (API del producto)
// ============================================================================

// Gris-primero: la página activa se marca con hairline + texto fuerte, sin
// sombra y sin azul (BRAND-CONTRACT). border-transparent evita layout shift
// al activarse. Touch targets >=44px solo en táctil; desktop intacto.
const pageItemClasses = cn(
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2',
  'border border-transparent text-sm font-medium text-muted-foreground',
  'transition-colors hover:bg-muted hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:pointer-events-none disabled:opacity-50',
  'data-[active=true]:border-border data-[active=true]:bg-background data-[active=true]:text-foreground',
  '[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11'
);

interface PageControlProps {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  isActive?: boolean;
  className?: string;
  'aria-label'?: string;
  children: React.ReactNode;
}

function PageControl({
  href,
  onClick,
  disabled,
  isActive,
  className,
  children,
  ...aria
}: PageControlProps) {
  if (href !== undefined) {
    return (
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        aria-disabled={disabled || undefined}
        data-active={isActive || undefined}
        className={cn(
          pageItemClasses,
          disabled && 'pointer-events-none opacity-50',
          className
        )}
        {...aria}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive || undefined}
      className={cn(pageItemClasses, className)}
      {...aria}
    >
      {children}
    </button>
  );
}

export interface PaginationProps extends React.ComponentProps<'nav'> {
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
  className,
  ...props
}: PaginationProps) {
  // Genera la ventana de páginas a mostrar (1 … 4 5 6 … 12)
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

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn('flex items-center', className)}
      {...props}
    >
      <ul className="flex flex-row items-center gap-1.5">
        {showFirstLast && (
          <li>
            <PageControl
              href={isUsingLinks ? getPageHref!(1) : undefined}
              onClick={() => onPageChange?.(1)}
              disabled={currentPage === 1}
              aria-label="Go to first page"
            >
              <CaretDoubleLeft className="h-4 w-4" />
            </PageControl>
          </li>
        )}

        <li>
          <PageControl
            href={
              isUsingLinks
                ? getPageHref!(Math.max(1, currentPage - 1))
                : undefined
            }
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Go to previous page"
            className="gap-1 px-2.5"
          >
            <CaretLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </PageControl>
        </li>

        {pages.map((page, index) => (
          <li key={`${page}-${index}`}>
            {page === 'ellipsis' ? (
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center"
              >
                <DotsThree className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">More pages</span>
              </span>
            ) : (
              <PageControl
                href={isUsingLinks ? getPageHref!(page) : undefined}
                onClick={() => onPageChange?.(page)}
                isActive={page === currentPage}
              >
                {page}
              </PageControl>
            )}
          </li>
        ))}

        <li>
          <PageControl
            href={
              isUsingLinks
                ? getPageHref!(Math.min(totalPages, currentPage + 1))
                : undefined
            }
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Go to next page"
            className="gap-1 px-2.5"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <CaretRight className="h-4 w-4" />
          </PageControl>
        </li>

        {showFirstLast && (
          <li>
            <PageControl
              href={isUsingLinks ? getPageHref!(totalPages) : undefined}
              onClick={() => onPageChange?.(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Go to last page"
            >
              <CaretDoubleRight className="h-4 w-4" />
            </PageControl>
          </li>
        )}
      </ul>
    </nav>
  );
}

export { Pagination };
