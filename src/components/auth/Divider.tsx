'use client';

import { cn } from '@/lib/utils';

interface DividerProps {
  text?: string;
  className?: string;
}

/**
 * Auth divider - "or continue with email" pattern
 * Line - text - line
 */
export function Divider({ text = 'o continua con email', className }: DividerProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <div className="flex-1 border-t border-border" />
      <span className="px-4 text-caption text-muted-foreground font-mono uppercase tracking-wide">
        {text}
      </span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}
