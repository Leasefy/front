'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseTypingAnimationOptions {
  /** The full text to animate */
  text: string;
  /** Characters per second (default: 40) */
  speed?: number;
  /** Initial delay in milliseconds before starting (default: 0) */
  delay?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Whether animation is enabled (default: true) */
  enabled?: boolean;
}

export interface UseTypingAnimationReturn {
  /** The currently visible text */
  displayText: string;
  /** Whether the animation has completed */
  isComplete: boolean;
  /** Restart the animation from the beginning */
  restart: () => void;
  /** Skip to the end of the animation */
  skip: () => void;
}

// ============================================================================
// Constants
// ============================================================================

// Characters that should have a longer pause after them (for natural feel)
const PAUSE_CHARACTERS = new Set(['.', '!', '?', ',', ';', ':']);
const LONG_PAUSE_CHARACTERS = new Set(['.', '!', '?']);

// Pause multipliers (relative to base interval)
const SHORT_PAUSE_MULTIPLIER = 3;
const LONG_PAUSE_MULTIPLIER = 6;

// ============================================================================
// Hook
// ============================================================================

/**
 * useTypingAnimation - Custom hook for typewriter effect
 *
 * Creates a natural-feeling typing animation with configurable speed,
 * initial delay, and punctuation-aware pauses.
 *
 * Implementation: JavaScript interval-based typing with natural punctuation pauses.
 * This provides more control than CSS-only solutions and feels more natural than
 * character-by-character without pauses.
 *
 * @example
 * ```tsx
 * const { displayText, isComplete, restart } = useTypingAnimation({
 *   text: "Hello, world! How are you?",
 *   speed: 40,
 *   delay: 500,
 *   onComplete: () => console.log('Done!')
 * });
 *
 * return <p>{displayText}</p>;
 * ```
 */
export function useTypingAnimation({
  text,
  speed = 40,
  delay = 0,
  onComplete,
  enabled = true,
}: UseTypingAnimationOptions): UseTypingAnimationReturn {
  const [displayText, setDisplayText] = useState(enabled ? '' : text);
  const [isComplete, setIsComplete] = useState(!enabled);

  // Refs to handle cleanup and callbacks
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Calculate base interval from speed
  const baseInterval = speed === Infinity ? 0 : 1000 / speed;

  // Get pause duration for a character
  const getPauseDuration = useCallback((char: string): number => {
    if (LONG_PAUSE_CHARACTERS.has(char)) {
      return baseInterval * LONG_PAUSE_MULTIPLIER;
    }
    if (PAUSE_CHARACTERS.has(char)) {
      return baseInterval * SHORT_PAUSE_MULTIPLIER;
    }
    return baseInterval;
  }, [baseInterval]);

  // Clear any pending timeout
  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Type the next character
  const typeNextChar = useCallback(() => {
    if (indexRef.current >= text.length) {
      setIsComplete(true);
      onCompleteRef.current?.();
      return;
    }

    const currentChar = text[indexRef.current];
    indexRef.current += 1;
    setDisplayText(text.slice(0, indexRef.current));

    // Schedule next character with appropriate pause
    const pauseDuration = getPauseDuration(currentChar);
    timeoutRef.current = setTimeout(typeNextChar, pauseDuration);
  }, [text, getPauseDuration]);

  // Start the animation
  const startAnimation = useCallback(() => {
    clearPendingTimeout();
    indexRef.current = 0;
    setDisplayText('');
    setIsComplete(false);

    // Start after initial delay
    timeoutRef.current = setTimeout(typeNextChar, delay);
  }, [clearPendingTimeout, typeNextChar, delay]);

  // Restart animation
  const restart = useCallback(() => {
    if (!enabled) return;
    startAnimation();
  }, [enabled, startAnimation]);

  // Skip to end
  const skip = useCallback(() => {
    clearPendingTimeout();
    indexRef.current = text.length;
    setDisplayText(text);
    setIsComplete(true);
    onCompleteRef.current?.();
  }, [clearPendingTimeout, text]);

  // Main effect to start animation
  useEffect(() => {
    if (!enabled) {
      // Not animating - show full text immediately
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    // Handle instant speed (Infinity)
    if (speed === Infinity) {
      setDisplayText(text);
      setIsComplete(true);
      onCompleteRef.current?.();
      return;
    }

    // Start the animation
    startAnimation();

    // Cleanup on unmount
    return clearPendingTimeout;
  }, [text, enabled, speed, startAnimation, clearPendingTimeout]);

  return {
    displayText,
    isComplete,
    restart,
    skip,
  };
}
