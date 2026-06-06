'use client';

/**
 * useCommandPaletteShortcut
 *
 * Registers the global ⌘K / Ctrl+K listener for the command palette.
 * Skips activation when:
 *   1. The pathname starts with /panel/inmobiliaria/beta (BetaLayout owns ⌘K there).
 *   2. An <input> or <textarea> is focused AND the keydown is not intentional
 *      (we still let ⌘K fire from inputs — same policy as useBetaKeyboardShortcuts).
 *
 * Must be called inside a component that can read usePathname() (client component).
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const BETA_PATH_PREFIX = '/panel/inmobiliaria/beta';

export function useCommandPaletteShortcut(callbacks: {
  onOpen: () => void;
  onClose: () => void;
  isOpen: boolean;
}) {
  const { onOpen, onClose, isOpen } = callbacks;
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ── Escape ────────────────────────────────────────────────────────────
      if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      // ── ⌘K / Ctrl+K ──────────────────────────────────────────────────────
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Yield to BetaLayout when we're in the beta subtree
        if (pathname?.startsWith(BETA_PATH_PREFIX)) return;

        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          onOpen();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pathname, isOpen, onOpen, onClose]);
}
