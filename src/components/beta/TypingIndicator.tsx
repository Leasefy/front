'use client';

import { Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * TypingIndicator - Simple bounce dots matching the assistant icon style.
 */
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3', className)}>
      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <Sparkle className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" weight="fill" />
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
