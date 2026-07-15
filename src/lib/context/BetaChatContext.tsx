'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useBetaChat, type UseBetaChatReturn, type UseBetaChatOptions } from '@/lib/hooks/useBetaChat';

// ============================================================================
// Context
// ============================================================================

const BetaChatContext = createContext<UseBetaChatReturn | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface BetaChatProviderProps {
  children: ReactNode;
  onTabChange?: (tab: string) => void;
}

/**
 * BetaChatProvider - Wraps the Beta section to persist chat state across
 * page navigation and tab switches within the Beta "universe".
 *
 * Uses useBetaChat internally and exposes its state via React Context.
 * This ensures conversation messages survive when:
 *   - Switching BetaSidebar tabs
 *   - Navigating between /panel/beta/* routes
 *
 * Conversations persist to the browser's localStorage via useBetaChat
 * (`leasefy-beta-conversations`), so they survive reloads and tab closes.
 * They are wiped on: a storage-version bump, or a DAILY RESET (the chat
 * starts fresh on the first load of each calendar day). Persistence is
 * per-device/browser only — server-side sync is deferred to Phase 19.
 */
export function BetaChatProvider({ children, onTabChange }: BetaChatProviderProps) {
  const chat = useBetaChat({ onTabChange });

  return (
    <BetaChatContext.Provider value={chat}>
      {children}
    </BetaChatContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useBetaChatContext - Access chat state from BetaChatProvider.
 *
 * Returns the same interface as useBetaChat.
 * @throws Error if used outside of BetaChatProvider
 */
export function useBetaChatContext(): UseBetaChatReturn {
  const context = useContext(BetaChatContext);
  if (!context) {
    throw new Error(
      'useBetaChatContext must be used within a BetaChatProvider. ' +
      'Wrap your component tree with <BetaChatProvider>.'
    );
  }
  return context;
}
