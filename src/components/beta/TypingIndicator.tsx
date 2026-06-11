'use client';

import { cn } from '@/lib/utils';
import { LeasefyMark } from './LeasefyMark';

/**
 * TypingIndicator - Simple bounce dots matching the assistant icon style.
 */
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3', className)}>
      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <LeasefyMark className="w-3.5 h-auto text-[#1A40FF] dark:text-neutral-200" />
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
