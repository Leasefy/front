'use client';

import { useEffect } from 'react';

interface UseBetaKeyboardShortcutsOptions {
  /** Called when Cmd/Ctrl+K is pressed */
  onNewConversation: () => void;
  /** Called when Escape is pressed (e.g., close drawer/modal) */
  onClose?: () => void;
}

/**
 * useBetaKeyboardShortcuts - Global keyboard shortcuts for the Beta AI section.
 *
 * - Cmd/Ctrl + K  →  Create new conversation
 * - Escape        →  Close drawer / modal (if onClose provided)
 *
 * Cmd+K is suppressed when the active element is a textarea or input
 * (to avoid hijacking browser search inside form fields).
 * Escape always fires regardless of focus target so modals/drawers can close.
 */
export function useBetaKeyboardShortcuts({
  onNewConversation,
  onClose,
}: UseBetaKeyboardShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K → new conversation
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Skip if user is typing in an input/textarea (except when explicitly using shortcut)
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
          // Still allow Cmd+K even in inputs — it's a global shortcut
        }
        e.preventDefault();
        onNewConversation();
      }

      // Escape → close drawer/modal
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewConversation, onClose]);
}
