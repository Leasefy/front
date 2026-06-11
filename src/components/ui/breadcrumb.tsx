'use client';

import * as React from 'react';
import Link from 'next/link';
import { CaretRight, House, DotsThree } from '@phosphor-icons/react';
import {
  Breadcrumb as DSBreadcrumb,
  BreadcrumbItem as DSBreadcrumbItem,
  BreadcrumbPage as DSBreadcrumbPage,
  BreadcrumbSeparator as DSBreadcrumbSeparator,
} from '@leasefy/ui';
import { cn } from '@/lib/utils';

/**
 * Breadcrumb — ADAPTER fino sobre @leasefy/ui que preserva la API local
 * basada en `items[]` (label/href/icon/disabled + showHouseIcon/homeHref/
 * maxItems collapse). La estructura semántica (nav/ol/li, aria-current,
 * separador) viene del DS; los links usan next/link para conservar la
 * navegación client-side (el BreadcrumbLink del DS renderiza <a> plano) y
 * el separador conserva el caret del mvp vía el override de children que
 * soporta el DSBreadcrumbSeparator.
 *
 * La familia composable legacy (BreadcrumbRoot/List/Link/Ellipsis…) no tenía
 * call sites; para composición usar los primitivos de '@leasefy/ui'.
 */

// ============================================================================
// Types (API local intacta)
// ============================================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

type BreadcrumbSize = 'sm' | 'default' | 'lg';

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  size?: BreadcrumbSize | null;
  separator?: React.ReactNode;
  showHouseIcon?: boolean;
  homeHref?: string;
  maxItems?: number;
  itemsBeforeCollapse?: number;
  itemsAfterCollapse?: number;
}

// ============================================================================
// Escalas visuales del mvp (se preservan tal cual)
// ============================================================================

const ROOT_SIZE: Record<BreadcrumbSize, string> = {
  sm: 'text-xs [&>ol]:gap-1 [&>ol]:text-xs',
  default: 'text-sm [&>ol]:gap-1.5 [&>ol]:text-sm',
  lg: 'text-base [&>ol]:gap-2 [&>ol]:text-base',
};

const ICON_SIZE: Record<BreadcrumbSize, string> = {
  sm: 'h-3 w-3',
  default: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

const SEPARATOR_SIZE: Record<BreadcrumbSize, string> = {
  sm: 'h-3 w-3',
  default: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const LINK_CLASSES =
  'flex items-center gap-1 text-muted-foreground transition-colors duration-150 hover:text-foreground';
const DISABLED_CLASSES =
  'flex items-center gap-1 text-muted-foreground/50 pointer-events-none';

// ============================================================================
// Breadcrumb (items API)
// ============================================================================

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  (
    {
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
    },
    ref
  ) => {
    const shouldCollapse = maxItems && items.length > maxItems;

    const visibleItems = React.useMemo(() => {
      if (!shouldCollapse) return items;

      const beforeItems = items.slice(0, itemsBeforeCollapse);
      const afterItems = items.slice(-itemsAfterCollapse);

      return [
        ...beforeItems,
        { label: '...', href: undefined, isCollapsed: true } as BreadcrumbItem & {
          isCollapsed?: boolean;
        },
        ...afterItems,
      ];
    }, [items, shouldCollapse, itemsBeforeCollapse, itemsAfterCollapse]);

    const resolvedSize: BreadcrumbSize = size || 'default';
    const iconSize = ICON_SIZE[resolvedSize];

    const renderSeparator = (key: string) => (
      <DSBreadcrumbItem key={key} aria-hidden="true">
        <DSBreadcrumbSeparator className="mx-0 flex items-center">
          {separator || (
            <CaretRight
              className={cn(SEPARATOR_SIZE[resolvedSize], 'text-muted-foreground/50 shrink-0')}
            />
          )}
        </DSBreadcrumbSeparator>
      </DSBreadcrumbItem>
    );

    return (
      <DSBreadcrumb
        ref={ref}
        className={cn('flex items-center', ROOT_SIZE[resolvedSize], className)}
        {...props}
      >
        {/* House icon */}
        {showHouseIcon && (
          <>
            <DSBreadcrumbItem>
              <Link href={homeHref} aria-label="House" className={LINK_CLASSES}>
                <House className={iconSize} />
              </Link>
            </DSBreadcrumbItem>
            {items.length > 0 && renderSeparator('sep-home')}
          </>
        )}

        {/* Breadcrumb items */}
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          const isCollapsed = (item as BreadcrumbItem & { isCollapsed?: boolean }).isCollapsed;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <DSBreadcrumbItem current={isLast && !isCollapsed}>
                {isCollapsed ? (
                  <span className={DISABLED_CLASSES}>
                    <DotsThree className={iconSize} />
                  </span>
                ) : isLast ? (
                  <DSBreadcrumbPage className="flex items-center gap-1 font-medium text-foreground">
                    {item.icon}
                    {item.label}
                  </DSBreadcrumbPage>
                ) : !item.href || item.disabled ? (
                  <span className={item.disabled ? DISABLED_CLASSES : LINK_CLASSES}>
                    {item.icon}
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className={LINK_CLASSES}>
                    {item.icon}
                    {item.label}
                  </Link>
                )}
              </DSBreadcrumbItem>
              {!isLast && renderSeparator(`sep-${index}`)}
            </React.Fragment>
          );
        })}
      </DSBreadcrumb>
    );
  }
);
Breadcrumb.displayName = 'Breadcrumb';

export { Breadcrumb };
