'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, MessageStatus } from '@/lib/types/beta-chat';
import { getMockResponse } from '@/lib/data/mock-chat-responses';

// ============================================================================
// Constants
// ============================================================================

/** Delay before assistant starts "typing" (ms) */
const RESPONSE_DELAY_MIN = 800;
const RESPONSE_DELAY_MAX = 1500;

/** Characters revealed per second during streaming simulation */
const CHARS_PER_SECOND = 40;

/** Characters that trigger a longer pause (natural feel) */
const LONG_PAUSE_CHARS = new Set(['.', '!', '?']);
const SHORT_PAUSE_CHARS = new Set([',', ';', ':']);

const LONG_PAUSE_MULTIPLIER = 6;
const SHORT_PAUSE_MULTIPLIER = 3;

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function randomDelay(): number {
  return Math.floor(
    Math.random() * (RESPONSE_DELAY_MAX - RESPONSE_DELAY_MIN) + RESPONSE_DELAY_MIN
  );
}

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseBetaChatReturn {
  /** All messages in the current conversation */
  messages: ChatMessage[];
  /** Send a message from the user. Triggers mock assistant response. */
  sendMessage: (text: string) => void;
  /** Whether the assistant is currently streaming a response */
  isStreaming: boolean;
  /** Partial content being revealed during streaming */
  streamingContent: string;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useBetaChat - Core chat state hook for the Beta AI interface.
 *
 * Manages local message state with mock response simulation.
 * On sendMessage: adds user message immediately, then after a delay
 * starts character-by-character reveal of a mock AI response.
 *
 * Adapted from useTypingAnimation pattern (timeout-based with punctuation pauses).
 * Will be swapped to real Claude API calls in Phase 24.
 */
export function useBetaChat(): UseBetaChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Refs for timeout cleanup
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const charTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const charIndexRef = useRef(0);

  // Cleanup all pending timeouts
  const clearTimeouts = useCallback(() => {
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }
    if (charTimeoutRef.current) {
      clearTimeout(charTimeoutRef.current);
      charTimeoutRef.current = null;
    }
  }, []);

  // Get pause duration for character (punctuation-aware)
  const getCharDelay = useCallback((char: string): number => {
    const baseInterval = 1000 / CHARS_PER_SECOND;
    if (LONG_PAUSE_CHARS.has(char)) return baseInterval * LONG_PAUSE_MULTIPLIER;
    if (SHORT_PAUSE_CHARS.has(char)) return baseInterval * SHORT_PAUSE_MULTIPLIER;
    return baseInterval;
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      // 1. Add user message immediately
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
        status: 'sent',
      };

      // 2. Create placeholder assistant message (sending state)
      const assistantId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      setStreamingContent('');

      // 3. Get mock response text
      const responseText = getMockResponse(trimmed);

      // 4. After delay, start streaming character by character
      delayTimeoutRef.current = setTimeout(() => {
        charIndexRef.current = 0;

        // Update assistant status to streaming
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, status: 'streaming' as MessageStatus } : m))
        );

        const revealNextChar = () => {
          if (charIndexRef.current >= responseText.length) {
            // Streaming complete
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: responseText, status: 'complete' as MessageStatus }
                  : m
              )
            );
            setIsStreaming(false);
            setStreamingContent('');
            charTimeoutRef.current = null;
            return;
          }

          const currentChar = responseText[charIndexRef.current];
          charIndexRef.current += 1;
          const partial = responseText.slice(0, charIndexRef.current);
          setStreamingContent(partial);

          // Schedule next character
          const delay = getCharDelay(currentChar);
          charTimeoutRef.current = setTimeout(revealNextChar, delay);
        };

        revealNextChar();
      }, randomDelay());
    },
    [isStreaming, getCharDelay]
  );

  return {
    messages,
    sendMessage,
    isStreaming,
    streamingContent,
  };
}
