'use client';

import { Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { AgentActivityBlock } from '@/lib/types/beta-chat';
import { AgentBadge } from './AgentBadge';

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ============================================================================
// Component
// ============================================================================

interface AgentActivityIndicatorProps {
  activity: AgentActivityBlock;
  className?: string;
}

/**
 * AgentActivityIndicator - Multi-agent activity block showing dispatched agents.
 *
 * Displays "Consultando agentes..." header while agents are running.
 * Badges appear with staggered animation (100ms delay between each).
 * Visually distinct from regular messages with subtle border/background.
 */
export function AgentActivityIndicator({ activity, className }: AgentActivityIndicatorProps) {
  const allCompleted = activity.agents.every(
    (a) => a.status === 'completed' || a.status === 'failed'
  );
  const hasFailure = activity.agents.some((a) => a.status === 'failed');
  const isDispatching = activity.agents.some((a) => a.status === 'dispatching');

  // Header text based on overall state
  const headerText = allCompleted
    ? hasFailure
      ? 'Agentes completados con errores'
      : 'Agentes completados'
    : isDispatching
      ? 'Despachando agentes...'
      : 'Consultando agentes...';

  return (
    <div className={cn('flex items-end gap-2', className)}>
      {/* AI avatar (matches AssistantBubble layout) */}
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
        {/* Activity card */}
        <div
          className={cn(
            'px-3 py-2.5',
            'bg-neutral-50/80 dark:bg-neutral-800/50',
            'border border-neutral-200/60 dark:border-border/50',
            'border-dashed',
            'rounded-2xl rounded-bl-sm',
            'min-w-[200px]'
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-2">
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                allCompleted
                  ? hasFailure
                    ? 'bg-red-400'
                    : 'bg-emerald-400'
                  : 'bg-indigo-400 animate-pulse'
              )}
            />
            <span className="text-[11px] font-medium text-muted-foreground">
              {headerText}
            </span>
          </div>

          {/* Agent badges */}
          <div className="flex flex-wrap gap-1.5">
            {activity.agents.map((agent, index) => (
              <div
                key={agent.id}
                className="animate-in fade-in slide-in-from-bottom-1"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
              >
                <AgentBadge
                  agentType={agent.agentType}
                  status={agent.status}
                  duration={
                    agent.durationMs !== undefined
                      ? formatDuration(agent.durationMs)
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
