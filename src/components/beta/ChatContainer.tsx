'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useBetaChat } from '@/lib/hooks/useBetaChat';
import { BetaWelcome } from './BetaWelcome';
import { UserBubble } from './UserBubble';
import { AssistantBubble } from './AssistantBubble';
import { ChatInput } from './ChatInput';

interface ChatContainerProps {
  className?: string;
}

/**
 * ChatContainer - Main chat area wiring useBetaChat + bubbles + input.
 *
 * Empty state: shows BetaWelcome with clickable suggested prompts.
 * Active state: message list with auto-scroll + sticky ChatInput at bottom.
 *
 * Layout: flex-col h-full
 *   - Messages area (flex-1 overflow-y-auto) with bottom padding
 *   - ChatInput (sticky at bottom)
 */
export function ChatContainer({ className }: ChatContainerProps) {
  const { messages, sendMessage, isStreaming, streamingContent } = useBetaChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const hasMessages = messages.length > 0;

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

              return (
                <AssistantBubble
                  key={message.id}
                  message={message}
                  streamingContent={isLastAssistant && isStreaming ? streamingContent : undefined}
                />
              );
            })}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input - sticky bottom */}
          <ChatInput onSend={sendMessage} disabled={isStreaming} />
        </>
      ) : (
        <>
          {/* Empty state with welcome + input at bottom */}
          <div className="flex-1 overflow-y-auto">
            <BetaWelcome onPromptClick={sendMessage} />
          </div>
          <ChatInput onSend={sendMessage} disabled={isStreaming} />
        </>
      )}
    </div>
  );
}
