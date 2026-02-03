'use client';

import * as React from 'react';
import * as VisuallyHiddenPrimitive from '@radix-ui/react-visually-hidden';

// ============================================================================
// Visually Hidden
// ============================================================================

/**
 * Visually Hidden Component
 *
 * Hides content visually while keeping it accessible to screen readers.
 * Useful for providing context that is only needed by assistive technologies.
 *
 * @example
 * ```tsx
 * <button>
 *   <Icon />
 *   <VisuallyHidden>Close dialog</VisuallyHidden>
 * </button>
 * ```
 */
const VisuallyHidden = VisuallyHiddenPrimitive.Root;

// ============================================================================
// Screen Reader Only (alias)
// ============================================================================

/**
 * Screen Reader Only Component
 *
 * Alias for VisuallyHidden, following the naming convention used by Tailwind's sr-only class.
 */
const ScreenReaderOnly = VisuallyHiddenPrimitive.Root;

// ============================================================================
// Announce Component (for dynamic announcements)
// ============================================================================

export interface AnnounceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all' | 'additions text';
}

/**
 * Announce Component
 *
 * Creates a live region that announces changes to screen readers.
 * Content is visually hidden but announced when it changes.
 *
 * @example
 * ```tsx
 * <Announce politeness="polite">
 *   {itemCount} items in your cart
 * </Announce>
 * ```
 */
function Announce({
  children,
  politeness = 'polite',
  atomic = true,
  relevant = 'additions text',
  ...props
}: AnnounceProps) {
  return (
    <VisuallyHidden
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      {...props}
    >
      {children}
    </VisuallyHidden>
  );
}

// ============================================================================
// Live Region Hook (for programmatic announcements)
// ============================================================================

export interface UseLiveRegionOptions {
  politeness?: 'polite' | 'assertive';
  clearDelay?: number;
}

/**
 * useLiveRegion Hook
 *
 * Creates a live region for programmatic announcements.
 * Returns a function to announce messages and a component to render.
 *
 * @example
 * ```tsx
 * const { announce, LiveRegion } = useLiveRegion();
 *
 * const handleSave = () => {
 *   await save();
 *   announce('Changes saved successfully');
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleSave}>Save</button>
 *     <LiveRegion />
 *   </>
 * );
 * ```
 */
export function useLiveRegion(options: UseLiveRegionOptions = {}) {
  const { politeness = 'polite', clearDelay = 3000 } = options;
  const [message, setMessage] = React.useState<string>('');
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  const announce = React.useCallback((text: string) => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Clear the message first to ensure re-announcement of same message
    setMessage('');

    // Set the new message in the next tick
    requestAnimationFrame(() => {
      setMessage(text);
    });

    // Optionally clear after delay
    if (clearDelay > 0) {
      timeoutRef.current = setTimeout(() => {
        setMessage('');
      }, clearDelay);
    }
  }, [clearDelay]);

  const clear = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMessage('');
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const LiveRegion = React.useCallback(() => (
    <Announce politeness={politeness}>
      {message}
    </Announce>
  ), [message, politeness]);

  return { announce, clear, LiveRegion, message };
}

// ============================================================================
// Skip Link Component
// ============================================================================

export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId: string;
  children?: React.ReactNode;
}

/**
 * Skip Link Component
 *
 * Provides a link that becomes visible on focus, allowing keyboard users
 * to skip repetitive content like navigation.
 *
 * @example
 * ```tsx
 * <SkipLink targetId="main-content">Skip to main content</SkipLink>
 * ```
 */
function SkipLink({
  targetId,
  children = 'Skip to main content',
  className,
  ...props
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={className ?? [
        'sr-only focus:not-sr-only',
        'focus:fixed focus:left-4 focus:top-4 focus:z-[9999]',
        'focus:rounded-md focus:bg-background focus:px-4 focus:py-2',
        'focus:text-sm focus:font-medium focus:text-foreground',
        'focus:shadow-lg focus:ring-2 focus:ring-ring',
        'focus:outline-none',
      ].join(' ')}
      {...props}
    >
      {children}
    </a>
  );
}

export { VisuallyHidden, ScreenReaderOnly, Announce, SkipLink };
