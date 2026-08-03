'use client';

import { Copy, ArrowsClockwise, ThumbsUp, ThumbsDown } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import { LeasefyMark } from './LeasefyMark';

interface AssistantBubbleProps {
  message: ChatMessage;
  /** Partial content during streaming (overrides message.content) */
  streamingContent?: string;
  className?: string;
}

const ACTION_BUTTONS: { icon: Icon; label: string }[] = [
  { icon: Copy, label: 'Copy' },
  { icon: ArrowsClockwise, label: 'Regenerate' },
  { icon: ThumbsUp, label: 'Like' },
  { icon: ThumbsDown, label: 'Dislike' },
];

/**
 * AssistantBubble - Clean left-aligned assistant message.
 * Small icon + flowing text (no bubble container).
 * Action icons (copy, regenerate, thumbs) shown below completed messages.
 */
export function AssistantBubble({ message, streamingContent, className }: AssistantBubbleProps) {
  const isStreaming = message.status === 'streaming';
  const isSending = message.status === 'sending';
  const displayContent = isStreaming && streamingContent ? streamingContent : message.content;

  return (
    <div className={cn('flex gap-3', className)}>
      {/* AI icon — real Leasefy mark */}
      <div className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-sm bg-surface-muted flex items-center justify-center">
        <LeasefyMark className="w-3.5 h-auto text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        {isSending ? (
          <span className="inline-flex gap-1.5 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-border-strong animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-border-strong animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-border-strong animate-bounce [animation-delay:300ms]" />
          </span>
        ) : (
          <>
            {/* Content — no bubble, just flowing text */}
            <div className="text-[14px] leading-relaxed text-foreground">
              <MarkdownRenderer content={displayContent} isStreaming={isStreaming} />
            </div>

            {/* Action icons — only when complete */}
            {message.status === 'complete' && (
              <div className="flex items-center gap-0.5 mt-2">
                {ACTION_BUTTONS.map(({ icon: ActionIcon, label }) => (
                  <IconButton
                    key={label}
                    type="button"
                    icon={<ActionIcon className="w-3.5 h-3.5" />}
                    variant="ghost"
                    className="p-1.5 rounded-sm text-fg-subtle hover:text-fg-muted hover:bg-surface-muted"
                    aria-label={label}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
