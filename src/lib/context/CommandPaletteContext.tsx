'use client';

/**
 * CommandPaletteContext — global open/close state for the ⌘K command palette.
 *
 * ── ⌘K coexistence with useBetaKeyboardShortcuts ──────────────────────────
 * useBetaKeyboardShortcuts (BetaLayout) owns ⌘K ONLY inside the /panel/…/beta
 * subtree, where BetaLayout renders. The command palette lives at the
 * inmobiliaria-layout level (above the beta subtree). Rather than competing
 * for the same keydown event, we use a simple route check: the global
 * palette listener in InmobiliariaLayoutInner skips activation when the
 * current pathname starts with /panel/inmobiliaria/beta (or any path that
 * mounts BetaLayout). This means:
 *
 *  - /panel/inmobiliaria/*               → ⌘K opens palette      ✅
 *  - /panel/inmobiliaria/beta/*          → ⌘K = new conversation  ✅
 *  - /panel/inmobiliaria/ai/cobranza/*   → ⌘K opens palette      ✅
 *
 * The check is done inside InmobiliariaLayoutInner (layout.tsx) using
 * `usePathname()` before deciding to call `open()`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <CommandPaletteContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

/** Use inside any component that needs to open/close the palette. */
export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return ctx;
}

/** Safe variant — returns null outside the provider (for shared components). */
export function useCommandPaletteSafe(): CommandPaletteContextValue | null {
  return useContext(CommandPaletteContext);
}
