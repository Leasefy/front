'use client';

import { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { BetaWelcome } from './BetaWelcome';
import { UserBubble } from './UserBubble';
import { AssistantBubble } from './AssistantBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';

interface ChatContainerProps {
  className?: string;
}

/**
 * ChatContainer - Main chat area wiring useBetaChat + bubbles + input.
 *
 * Empty state: shows BetaWelcome with clickable suggested prompts.
 * Active state: message list with smart auto-scroll + sticky ChatInput at bottom.
 *
 * Smart auto-scroll: only scrolls if user is near the bottom (within 100px).
 * If user scrolled up to read history, auto-scroll is suppressed.
 *
 * Layout: flex-col h-full
 *   - Messages area (flex-1 overflow-y-auto) with bottom padding
 *   - ChatInput (sticky at bottom)
 */
export function ChatContainer({ className }: ChatContainerProps) {
  const { messages, sendMessage, isThinking, isStreaming, streamingContent } = useBetaChatContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);

  /** Check if user is near the bottom of the scroll container */
  const isNearBottom = useCallback((): boolean => {
    const container = messagesAreaRef.current;
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100;
  }, []);

  // Smart auto-scroll: only scroll if user is near bottom
  useEffect(() => {
    if (isNearBottom()) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, isThinking, isNearBottom]);

  const hasMessages = messages.length > 0;
  const isBusy = isThinking || isStreaming;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {hasMessages ? (
        <>
          {/* Messages area */}
          <div
            ref={messagesAreaRef}
            className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
          >
            {messages.map((message, index) => {
              const isLastAssistant =
                message.role === 'assistant' &&
                index === messages.length - 1;

              if (message.role === 'user') {
                return <UserBubble key={message.id} message={message} />;
              }

              // During thinking phase, hide the placeholder assistant bubble
              if (isLastAssistant && isThinking) {
                return null;
              }

              return (
                <AssistantBubble
                  key={message.id}
                  message={message}
                  streamingContent={isLastAssistant && isStreaming ? streamingContent : undefined}
                />
              );
            })}

            {/* Typing indicator shown during the thinking delay */}
            {isThinking && <TypingIndicator />}

            {/* Scroll sentinel */}
            <div ref={scrollRef} />
          </div>

          {/* Chat input - sticky bottom */}
          <ChatInput onSend={sendMessage} disabled={isBusy} />
        </>
      ) : (
        <>
          {/* Empty state with welcome + input at bottom */}
          <div className="flex-1 overflow-y-auto">
            <BetaWelcome onPromptClick={sendMessage} />
          </div>
          <ChatInput onSend={sendMessage} disabled={isBusy} />
        </>
      )}
    </div>
  );
}
