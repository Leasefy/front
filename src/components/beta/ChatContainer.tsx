'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
import { ResponseCard } from './ResponseCard';
import { WorkspaceView } from './WorkspaceView';
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
 * ChatContainer - Main chat area with premium visual experience.
 *
 * Empty state: BetaWelcome with animated prompt cards.
 * Active state: message list with ResponseCards + WorkspaceView.
 * Features: subtle dot grid background, floating input, glass morphism throughout.
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

  const [workspaceMessageId, setWorkspaceMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const lastWorkspaceTriggerId = useRef<string | null>(null);

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

  // Auto-enter workspace mode when an actionable response with steps completes
  useEffect(() => {
    if (isStreaming || isThinking || isAgentsRunning || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage.role === 'assistant' &&
      lastMessage.status === 'complete' &&
      lastMessage.responseMeta?.type === 'actionable' &&
      lastMessage.responseMeta?.steps &&
      lastMessage.responseMeta.steps.length > 0 &&
      lastMessage.id !== lastWorkspaceTriggerId.current
    ) {
      lastWorkspaceTriggerId.current = lastMessage.id;
      setWorkspaceMessageId(lastMessage.id);
    }
  }, [messages, isStreaming, isThinking, isAgentsRunning]);

  const closeWorkspace = useCallback(() => {
    setWorkspaceMessageId(null);
  }, []);

  // Find workspace message
  const workspaceMessage = workspaceMessageId
    ? messages.find((m) => m.id === workspaceMessageId)
    : null;

  const hasMessages = messages.length > 0;
  const isBusy = isThinking || isStreaming || isAgentsRunning;

  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <ChatMessageSkeleton />
      </div>
    );
  }

  // Workspace mode — full takeover for actionable responses with steps
  if (workspaceMessage && workspaceMessage.responseMeta) {
    return (
      <WorkspaceView
        meta={workspaceMessage.responseMeta}
        content={workspaceMessage.content}
        onClose={closeWorkspace}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn('flex flex-col h-full', className)}
    >
      {hasMessages ? (
        <>
          {/* Messages area */}
          <div
            ref={messagesAreaRef}
            className="relative flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5"
            aria-live="polite"
            aria-label={t('beta.a11y.newMessageRegion')}
          >
            {/* Center-constrain messages for wider screens */}
            <div className="max-w-3xl mx-auto space-y-5">
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

                // During thinking phase, hide the placeholder assistant bubble
                if (isLastAssistant && isThinking) {
                  return null;
                }

                // During agent execution: show activity block, hide assistant bubble
                if (isLastAssistant && isAgentsRunning && activeAgentBlock) {
                  return (
                    <div key={message.id} className="space-y-3 animate-fade-in">
                      <AgentActivityIndicator activity={activeAgentBlock} />
                    </div>
                  );
                }

                // Completed message with responseMeta → render ResponseCard
                if (
                  message.status === 'complete' &&
                  message.responseMeta &&
                  !isLastAssistant
                ) {
                  return (
                    <div key={message.id} className="space-y-3">
                      <ResponseCard
                        meta={message.responseMeta}
                        content={message.content}
                      />
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
                    </div>
                  );
                }

                // Last assistant message that just completed with responseMeta
                if (
                  isLastAssistant &&
                  message.status === 'complete' &&
                  message.responseMeta
                ) {
                  return (
                    <div key={message.id} className="space-y-3">
                      <ResponseCard
                        meta={message.responseMeta}
                        content={message.content}
                      />
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
                    </div>
                  );
                }

                // Streaming state — show ResponseCard with streaming content
                if (isLastAssistant && isStreaming && message.responseMeta) {
                  return (
                    <div key={message.id} className="space-y-3">
                      <ResponseCard
                        meta={message.responseMeta}
                        content={message.content}
                        isStreaming
                        streamingContent={streamingContent}
                      />
                    </div>
                  );
                }

                // Fallback: legacy AssistantBubble for messages without responseMeta
                return (
                  <div key={message.id} className="space-y-3">
                    {/* Agent activity summary (collapsed) for older messages */}
                    {(liveActivity || storedActivity) && (
                      <div className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {(liveActivity || storedActivity)!.agents.length} {t('beta.agents.results').toLowerCase()}
                        {' · '}
                        {formatDuration(
                          (liveActivity || storedActivity)!.agents.reduce(
                            (sum, a) => sum + (a.durationMs ?? 0),
                            0
                          )
                        )}
                      </div>
                    )}

                    {/* Decision card */}
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

                    {/* Legacy assistant bubble */}
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
          </div>

          {/* Chat input - floating at bottom */}
          <ChatInput onSend={sendMessage} disabled={isBusy} />
        </>
      ) : (
        <>
          {/* Empty state with welcome + floating input */}
          <div className="relative flex-1 overflow-y-auto">
            <BetaWelcome onPromptClick={sendMessage} />
          </div>
          <ChatInput onSend={sendMessage} disabled={isBusy} />
        </>
      )}
    </div>
  );
}
