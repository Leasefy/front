'use client';

import { Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AssistantBubbleProps {
  message: ChatMessage;
  /** Partial content during streaming (overrides message.content while streaming) */
  streamingContent?: string;
  className?: string;
}

/**
 * AssistantBubble - Left-aligned assistant message bubble with Leasefy AI branding.
 *
 * Card background with border, Sparkle icon avatar, "Leasefy AI" label.
 * Renders markdown content via MarkdownRenderer.
 * During streaming status, shows streamingContent with a blinking cursor.
 */
export function AssistantBubble({ message, streamingContent, className }: AssistantBubbleProps) {
  const { t } = useI18n();
  const isStreaming = message.status === 'streaming';
  const isSending = message.status === 'sending';
  const displayContent = isStreaming && streamingContent ? streamingContent : message.content;

  const timeStr = message.timestamp.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });

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

      <div className="flex flex-col items-start max-w-[75%]">
        {/* Label */}
        <span className="text-[11px] font-medium text-indigo-500 mb-1 ml-1">
          {t('beta.title')}
        </span>

        {/* Bubble */}
        <div
          className={cn(
            'px-4 py-2.5',
            'bg-white dark:bg-card',
            'border border-neutral-200 dark:border-border',
            'rounded-2xl rounded-bl-sm',
            'text-[14px] leading-relaxed text-foreground',
            'break-words'
          )}
        >
          {isSending ? (
            // Thinking dots while waiting for response to start
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
            </span>
          ) : (
            <MarkdownRenderer
              content={displayContent}
              isStreaming={isStreaming}
            />
          )}
        </div>

        {/* Timestamp (only show when complete) */}
        {message.status === 'complete' && (
          <span className="text-[11px] text-muted-foreground mt-1 ml-1">
            {timeStr}
          </span>
        )}
      </div>
    </div>
  );
}
