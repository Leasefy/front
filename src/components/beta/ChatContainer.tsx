'use client';

import { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { ChatMessageSkeleton } from './BetaSkeletons';
import { BetaWelcome } from './BetaWelcome';
import { UserBubble } from './UserBubble';
import { AssistantBubble } from './AssistantBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { AgentActivityIndicator } from './AgentActivityIndicator';
import { AgentResultCard } from './AgentResultCard';
import { DecisionCard } from './DecisionCard';

interface ChatContainerProps {
  className?: string;
}

/**
 * Helper: format duration in ms to human string.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * ChatContainer - Main chat area wiring useBetaChat + bubbles + input.
 *
 * Empty state: shows BetaWelcome with clickable suggested prompts.
 * Active state: message list with smart auto-scroll + sticky ChatInput at bottom.
 *
 * Agent execution flow:
 *   1. User sends message
 *   2. If agents dispatched: AgentActivityIndicator appears (badges animate)
 *   3. After agents complete: AgentResultCards shown (collapsible)
 *   4. Then AssistantBubble streams the response text
 *
 * Smart auto-scroll: only scrolls if user is near the bottom (within 100px).
 * If user scrolled up to read history, auto-scroll is suppressed.
 *
 * Layout: flex-col h-full
 *   - Messages area (flex-1 overflow-y-auto) with bottom padding
 *   - ChatInput (sticky at bottom)
 */
export function ChatContainer({ className }: ChatContainerProps) {
  const { t } = useI18n();
  const {
    isLoading,
    messages,
    sendMessage,
    isThinking,
    isStreaming,
    streamingContent,
    activeAgentBlock,
    isAgentsRunning,
    retryAgent,
    selectDecisionOption,
  } = useBetaChatContext();
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
  }, [messages, streamingContent, isThinking, activeAgentBlock, isAgentsRunning, isNearBottom]);

  const hasMessages = messages.length > 0;
  const isBusy = isThinking || isStreaming || isAgentsRunning;

  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <ChatMessageSkeleton />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {hasMessages ? (
        <>
          {/* Messages area */}
          <div
            ref={messagesAreaRef}
            className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
            aria-live="polite"
            aria-label={t('beta.a11y.newMessageRegion')}
          >
            {messages.map((message, index) => {
              const isLastAssistant =
                message.role === 'assistant' &&
                index === messages.length - 1;

              if (message.role === 'user') {
                return <UserBubble key={message.id} message={message} />;
              }

              // Completed agent activity stored on the message (from previous turns)
              const storedActivity = message.agentActivity;

              // For the last assistant message, use live activeAgentBlock if agents are running
              const liveActivity = isLastAssistant ? activeAgentBlock : null;
              const activityToShow = liveActivity || storedActivity;

              // During thinking phase, hide the placeholder assistant bubble
              if (isLastAssistant && isThinking) {
                return null;
              }

              // During agent execution: show activity block, hide assistant bubble
              if (isLastAssistant && isAgentsRunning && activeAgentBlock) {
                return (
                  <div key={message.id} className="space-y-3">
                    <AgentActivityIndicator activity={activeAgentBlock} />
                  </div>
                );
              }

              return (
                <div key={message.id} className="space-y-3">
                  {/* Agent result cards (shown after agents complete) */}
                  {activityToShow && activityToShow.agents.length > 0 && (
                    <div className="ml-9 space-y-1.5">
                      {activityToShow.agents.map((agent) => (
                        <AgentResultCard
                          key={agent.id}
                          agentType={agent.agentType}
                          status={agent.status}
                          duration={
                            agent.durationMs !== undefined
                              ? formatDuration(agent.durationMs)
                              : undefined
                          }
                          error={agent.error}
                          onRetry={
                            agent.status === 'failed'
                              ? () => retryAgent(agent.id)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}

                  {/* Decision card (shown after agent results, before assistant text) */}
                  {message.decision && (
                    <DecisionCard
                      decision={message.decision}
                      onSelect={
                        !message.decision.selectedOptionId
                          ? (optionId) => selectDecisionOption(message.id, optionId)
                          : undefined
                      }
                    />
                  )}

                  {/* Assistant bubble (normal rendering) */}
                  <AssistantBubble
                    message={message}
                    streamingContent={isLastAssistant && isStreaming ? streamingContent : undefined}
                  />
                </div>
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
