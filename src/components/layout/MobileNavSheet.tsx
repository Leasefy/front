'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from '@phosphor-icons/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { NavItem } from '@/components/ui/plan/PlanSidebar';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface MobileNavSheetProps {
  open: boolean;
  items: NavItem[];
  onClose: () => void;
}

export function MobileNavSheet({ open, items, onClose }: MobileNavSheetProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  function isActive(item: NavItem): boolean {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-xl max-h-[70vh] overflow-y-auto"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t('inmobiliaria.mobileNav.sheetTitle')}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col">
          {items.filter((item) => item.kind !== 'section').map((item) => {
            const active = isActive(item);
            const IconComponent = item.icon as React.ComponentType<{
              className?: string;
              weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
            }>;

            // Render the parent's own link first, then its children as sub-rows
            // (otherwise a parent with children loses its own destination here).
            const rows: NavItem[] = item.children && item.children.length > 0
              ? [item, ...item.children]
              : [item];

            return rows.map((row) => {
              const rowItem = row as NavItem;
              const rowActive = rowItem.exact
                ? pathname === rowItem.href
                : pathname.startsWith(rowItem.href);
              const RowIcon = rowItem.icon as React.ComponentType<{
                className?: string;
                weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
              }>;

              return (
                <Link
                  key={rowItem.href}
                  href={rowItem.href}
                  onClick={onClose}
                  aria-label={rowItem.label}
                  aria-current={rowActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 min-h-[52px] rounded-xl',
                    rowActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-fg hover:bg-surface-muted'
                  )}
                >
                  <RowIcon
                    className="w-5 h-5 flex-shrink-0"
                    weight={rowActive ? 'fill' : 'regular'}
                  />
                  <span className="text-[14px] flex-1">{rowItem.label}</span>
                  {rowItem.badge != null && rowItem.badge > 0 && (
                    <span className="ml-auto text-[11px] font-mono tabular-nums bg-primary text-primary-fg rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {rowItem.badge}
                    </span>
                  )}
                </Link>
              );
            });
          })}
        </div>

        <div className="pt-2 border-t border-border mt-2">
          <button
            onClick={onClose}
            className="flex items-center gap-3 w-full px-4 py-3 min-h-[52px] text-fg-muted hover:bg-surface-muted rounded-xl"
            aria-label={t('inmobiliaria.mobileNav.closeButton')}
          >
            <X className="w-5 h-5" />
            <span className="text-[14px]">{t('inmobiliaria.mobileNav.closeButton')}</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
