'use client';

import { cn } from '@/lib/utils';
import { LeasefyMark } from './LeasefyMark';

/**
 * TypingIndicator - Simple bounce dots matching the assistant icon style.
 */
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3', className)}>
      <div className="flex-shrink-0 w-6 h-6 rounded-sm bg-surface-muted flex items-center justify-center">
        <LeasefyMark className="w-3.5 h-auto text-primary" />
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-border-strong animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-border-strong animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-border-strong animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
