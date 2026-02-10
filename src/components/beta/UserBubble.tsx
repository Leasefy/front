'use client';

import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types/beta-chat';

interface UserBubbleProps {
  message: ChatMessage;
  className?: string;
}

/**
 * UserBubble - Right-aligned user message bubble.
 *
 * Indigo background, white text, chat bubble shape (rounded-br-sm).
 * Shows user initials in a small avatar circle and timestamp below.
 */
export function UserBubble({ message, className }: UserBubbleProps) {
  const timeStr = message.timestamp.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={cn('flex items-end gap-2 justify-end', className)}>
      <div className="flex flex-col items-end max-w-[75%]">
        {/* Bubble */}
        <div
          className={cn(
            'px-4 py-2.5',
            'bg-indigo-500 text-white',
            'rounded-2xl rounded-br-sm',
            'text-[14px] leading-relaxed',
            'whitespace-pre-wrap break-words'
          )}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <span className="text-[11px] text-muted-foreground mt-1 mr-1">
          {timeStr}
        </span>
      </div>

      {/* User avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full',
          'bg-indigo-100 dark:bg-indigo-500/20',
          'flex items-center justify-center',
          'text-[11px] font-semibold text-indigo-600 dark:text-indigo-400'
        )}
      >
        TU
      </div>
    </div>
  );
}
