'use client';

import { useEffect, useCallback } from 'react';
import { X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * MobileSidebarDrawer - Slide-in overlay drawer for mobile sidebar access.
 *
 * Renders a backdrop overlay (bg-black/50) and a slide-in panel from the left.
 * Width: 280px. Closes on backdrop click or Escape key.
 * Uses CSS transitions for smooth slide animation (translate-x).
 * Portal-free: uses fixed positioning at z-60 directly.
 */
export function MobileSidebarDrawer({ open, onClose, children }: MobileSidebarDrawerProps) {
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
          'fixed inset-0 z-[60] bg-black/50',
          'transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-[61]',
          'w-[280px]',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button overlaid on top-right of drawer */}
        <button
          onClick={onClose}
          className={cn(
            'absolute top-3 right-3 z-10',
            'w-7 h-7 rounded-full',
            'flex items-center justify-center',
            'bg-neutral-100 dark:bg-neutral-800',
            'text-muted-foreground hover:text-foreground',
            'transition-colors duration-150'
          )}
          aria-label="Cerrar menu"
        >
          <X className="w-3.5 h-3.5" weight="bold" />
        </button>

        {children}
      </div>
    </>
  );
}
