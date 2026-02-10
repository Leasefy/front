/**
 * Beta Chat type definitions.
 *
 * Core message and conversation types for the Leasefy AI Beta chat interface.
 * Used by useBetaChat hook and all chat UI components.
 */

// ============================================================================
// Enums / Unions
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'complete' | 'error';

// ============================================================================
// Core Types
// ============================================================================

export interface ChatMessage {
  /** Unique identifier (crypto.randomUUID or fallback) */
  id: string;
  /** Who sent this message */
  role: MessageRole;
  /** Message text content (plain text for now, markdown in 18-02) */
  content: string;
  /** When the message was created */
  timestamp: Date;
  /** Current delivery/processing status */
  status: MessageStatus;
}

export interface Conversation {
  /** Unique conversation identifier */
  id: string;
  /** Auto-generated or user-set title */
  title: string;
  /** Ordered list of messages */
  messages: ChatMessage[];
  /** When this conversation was started */
  createdAt: Date;
  /** Last activity timestamp */
  updatedAt: Date;
}

// ============================================================================
// Hook State
// ============================================================================

export interface ChatState {
  /** All messages in the current conversation */
  messages: ChatMessage[];
  /** Whether the assistant is currently generating a response */
  isStreaming: boolean;
  /** Partial content being revealed during streaming */
  streamingContent: string;
}
