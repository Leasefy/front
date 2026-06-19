'use client';

import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types/beta-chat';

interface UserBubbleProps {
  message: ChatMessage;
  className?: string;
}

/**
 * UserBubble - Clean right-aligned user message.
 * Simple gray background, no gradients, no effects.
 */
export function UserBubble({ message, className }: UserBubbleProps) {
  return (
    <div className={cn('flex justify-end', className)}>
      <div
        className={cn(
          'max-w-[75%]',
          'px-4 py-2.5',
          'bg-neutral-100 dark:bg-neutral-800',
          'rounded-xl',
          'text-[14px] leading-relaxed text-foreground',
          'whitespace-pre-wrap break-words'
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
