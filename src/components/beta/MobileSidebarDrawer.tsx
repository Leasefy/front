'use client';

import { useEffect, useCallback } from 'react';
import { X } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * MobileSidebarDrawer - Slide-in overlay drawer for mobile sidebar access.
 *
 * Renders a Cadence ink scrim overlay and a slide-in panel from the left.
 * Width: 280px. Closes on backdrop click or Escape key.
 * Uses CSS transitions for smooth slide animation (translate-x).
 * Portal-free: uses fixed positioning at z-60 directly.
 */
export function MobileSidebarDrawer({ open, onClose, children }: MobileSidebarDrawerProps) {
  const { t } = useI18n();

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-[rgba(20,19,15,0.32)]',
          'transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal={open}
        aria-label={t('beta.a11y.sidebarNav')}
        className={cn(
          'fixed inset-y-0 left-0 z-[61]',
          'w-[280px]',
          'flex flex-col',
          'bg-bg',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Drawer header row — the close button gets its own row so it no
            longer overlaps the AppSwitcher at the top of BetaSidebar. */}
        <div className="flex items-center justify-end px-1.5 pt-1.5 flex-shrink-0">
          <IconButton
            type="button"
            icon={<X className="w-4 h-4" weight="bold" />}
            onClick={onClose}
            variant="ghost"
            aria-label={t('beta.mobile.closeMenu')}
            className="w-11 h-11 rounded-full text-fg-muted hover:text-fg hover:bg-surface-muted"
          />
        </div>

        {/* Drawer scroll region */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
}
