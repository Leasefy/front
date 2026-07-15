'use client';

import { MessageBubble } from '@leasefy/cadence';
import type { ChatMessage } from '@/lib/types/beta-chat';

interface UserBubbleProps {
  message: ChatMessage;
  className?: string;
}

/**
 * UserBubble — right-aligned user message on the real Cadence MessageBubble
 * (role="user"). Content wrapped in a pre-wrap span so multi-line input keeps
 * its line breaks (MessageBubble's inner pill doesn't pre-wrap by default).
 */
export function UserBubble({ message, className }: UserBubbleProps) {
  return (
    <MessageBubble role="user" className={className}>
      <span className="block whitespace-pre-wrap break-words">{message.content}</span>
    </MessageBubble>
  );
}
