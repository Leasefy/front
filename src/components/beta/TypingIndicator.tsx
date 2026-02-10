'use client';

import { Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
}

/**
 * TypingIndicator - Animated bouncing dots shown while the AI is "thinking".
 *
 * Mirrors AssistantBubble layout (left-aligned, Sparkle avatar, "Leasefy AI" label)
 * but replaces message content with three staggered bouncing dots.
 */
export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-end gap-2', className)}>
      {/* AI avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full',
          'bg-indigo-50 dark:bg-indigo-500/10',
          'flex items-center justify-center'
        )}
      >
        <Sparkle
          className="w-3.5 h-3.5 text-indigo-500"
          weight="fill"
        />
      </div>

      <div className="flex flex-col items-start">
        {/* Label */}
        <span className="text-[11px] font-medium text-indigo-500 mb-1 ml-1">
          Leasefy AI
        </span>

        {/* Bubble with animated dots */}
        <div
          className={cn(
            'px-4 py-3',
            'bg-white dark:bg-card',
            'border border-neutral-200 dark:border-border',
            'rounded-2xl rounded-bl-sm'
          )}
        >
          <span className="inline-flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
