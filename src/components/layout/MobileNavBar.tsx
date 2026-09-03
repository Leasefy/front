'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DotsThree } from '@phosphor-icons/react';
import { NavItem } from '@/components/ui/plan/PlanSidebar';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { MobileNavSheet } from '@/components/layout/MobileNavSheet';

interface MobileNavBarProps {
  navItems: NavItem[];
}

export function MobileNavBar({ navItems }: MobileNavBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  // Section markers are desktop-sidebar-only labels; disabled items aren't tappable.
  const navigable = navItems.filter((item) => item.kind !== 'section' && !item.disabled);
  const topItems = navigable.slice(0, 5);
  const overflowItems = navigable.slice(5);
  const hasOverflow = navigable.length > 5;

  function isActive(item: NavItem): boolean {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface border-t border-border"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch justify-around">
          {topItems.map((item) => {
            const active = isActive(item);
            const IconComponent = item.icon as React.ComponentType<{
              className?: string;
              weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
            }>;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'min-h-[56px] min-w-[56px] flex flex-col items-center justify-center px-2 py-2 rounded-lg',
                  active
                    ? 'bg-primary-soft text-primary'
                    : 'text-fg-muted'
                )}
              >
                <IconComponent
                  className="w-5 h-5"
                  weight={active ? 'fill' : 'regular'}
                />
                <span className="text-[9px] font-mono uppercase tracking-wider mt-1">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {hasOverflow && (
            <button
              onClick={() => setMoreOpen(true)}
              aria-label={t('inmobiliaria.mobileNav.moreAriaLabel')}
              aria-haspopup="dialog"
              className="min-h-[56px] min-w-[56px] flex flex-col items-center justify-center px-2 py-2 text-fg-muted"
            >
              <DotsThree className="w-5 h-5" weight="bold" />
              <span className="text-[9px] font-mono uppercase tracking-wider mt-1">
                {t('inmobiliaria.mobileNav.moreButton')}
              </span>
            </button>
          )}
        </div>
      </nav>

      {hasOverflow && (
        <MobileNavSheet
          open={moreOpen}
          items={overflowItems}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </>
  );
}
