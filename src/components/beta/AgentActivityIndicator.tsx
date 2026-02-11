'use client';

import {
  Sparkle,
  CheckCircle,
  XCircle,
  CircleNotch,
  Circle,
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgentActivityBlock, AgentExecution } from '@/lib/types/beta-chat';
import { AGENT_METADATA } from '@/lib/types/beta-chat';

// ============================================================================
// Icon Map
// ============================================================================

const ICON_MAP: Record<string, Icon> = {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
};

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ============================================================================
// Agent Row
// ============================================================================

function AgentRow({
  agent,
  isLast,
}: {
  agent: AgentExecution;
  isLast: boolean;
}) {
  const meta = AGENT_METADATA[agent.agentType];
  const AgentIcon = ICON_MAP[meta.icon];

  return (
    <div>
      <div className="flex items-center gap-3 py-2 px-1">
        {/* Agent icon */}
        {AgentIcon && (
          <AgentIcon
            className={cn(
              'w-4 h-4 shrink-0',
              agent.status === 'completed' ? 'text-neutral-400 dark:text-neutral-500' :
              agent.status === 'failed' ? 'text-red-400' :
              'text-neutral-600 dark:text-neutral-400'
            )}
            weight="duotone"
          />
        )}

        {/* Task description */}
        <span
          className={cn(
            'text-[13px] leading-tight flex-1',
            agent.status === 'completed' && 'text-muted-foreground',
            agent.status === 'failed' && 'text-red-500/70 line-through',
            agent.status === 'running' && 'text-foreground font-medium',
            agent.status === 'dispatching' && 'text-muted-foreground/60',
          )}
        >
          {agent.taskDescription || meta.label}
        </span>

        {/* Status icon */}
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {agent.status === 'dispatching' && (
            <Circle className="w-3 h-3 text-neutral-300 dark:text-neutral-600" weight="regular" />
          )}
          {agent.status === 'running' && (
            <CircleNotch className="w-4 h-4 text-neutral-500 animate-spin" weight="bold" />
          )}
          {agent.status === 'completed' && (
            <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
          )}
          {agent.status === 'failed' && (
            <XCircle className="w-4 h-4 text-red-500" weight="fill" />
          )}
        </div>

        {/* Duration */}
        {agent.status === 'completed' && agent.durationMs !== undefined && (
          <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 tabular-nums">
            {formatDuration(agent.durationMs)}
          </span>
        )}
      </div>

      {/* Row divider */}
      {!isLast && (
        <div className="border-b border-neutral-100 dark:border-neutral-800 ml-7" />
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface AgentActivityIndicatorProps {
  activity: AgentActivityBlock;
  className?: string;
}

/**
 * AgentActivityIndicator - Clean minimal agent task list.
 * Simple bordered card with progress bar and agent rows.
 */
export function AgentActivityIndicator({ activity, className }: AgentActivityIndicatorProps) {
  const { t } = useI18n();

  const allCompleted = activity.agents.every(
    (a) => a.status === 'completed' || a.status === 'failed',
  );
  const hasFailure = activity.agents.some((a) => a.status === 'failed');
  const completedCount = activity.agents.filter(
    (a) => a.status === 'completed' || a.status === 'failed',
  ).length;
  const progressPct = (completedCount / activity.agents.length) * 100;

  return (
    <div
      className={cn(
        'w-full rounded-xl overflow-hidden',
        'bg-white dark:bg-neutral-900',
        'border border-neutral-200 dark:border-neutral-800',
        className
      )}
      aria-live="polite"
    >
      <div className="px-4 pt-3.5 pb-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkle
              className={cn(
                'w-4 h-4',
                allCompleted
                  ? hasFailure ? 'text-red-400' : 'text-emerald-500'
                  : 'text-neutral-500 animate-pulse',
              )}
              weight="fill"
            />
            <span className="text-[13px] font-medium text-foreground">
              {allCompleted
                ? hasFailure
                  ? t('beta.agents.completedWithErrors')
                  : t('beta.agents.completed')
                : t('beta.agents.running')}
            </span>
          </div>

          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
            {completedCount}/{activity.agents.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-3 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              allCompleted
                ? hasFailure ? 'bg-red-400' : 'bg-emerald-400'
                : 'bg-neutral-400 dark:bg-neutral-500',
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Agent rows */}
        <div>
          {activity.agents.map((agent, index) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              isLast={index === activity.agents.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
