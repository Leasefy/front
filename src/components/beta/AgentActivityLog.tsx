'use client';

import { MonoLabel } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { AGENT_METADATA } from '@/lib/types/beta-chat';
import type { AgentExecution } from '@/lib/types/beta-chat';
import type { AgentActivityEntry } from '@/lib/hooks/useBetaChat';
import {
  CurrencyDollar,
  FunnelSimple,
  Wrench,
  FileText,
  ChatCircle,
  ChartBar,
  CheckCircle,
  XCircle,
  CircleNotch,
  Lightning,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

// ============================================================================
// Icon Map (same as AgentBadge)
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
// Static color lookup (Tailwind requires static classes)
// ============================================================================

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-success',
  failed: 'bg-danger',
  running: 'bg-primary animate-pulse',
  dispatching: 'bg-fg-subtle animate-pulse',
};

const AGENT_COLOR_BG: Record<string, string> = {
  emerald: 'bg-success-soft',
  blue: 'bg-primary-soft',
  amber: 'bg-warning-soft',
  purple: 'bg-surface-muted',
  pink: 'bg-surface-muted',
  indigo: 'bg-primary-soft',
};

const AGENT_COLOR_TEXT: Record<string, string> = {
  emerald: 'text-success',
  blue: 'text-primary',
  amber: 'text-warning',
  purple: 'text-fg-muted',
  pink: 'text-fg-muted',
  indigo: 'text-primary',
};

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ============================================================================
// Sub-components
// ============================================================================

function AgentExecutionRow({ agent }: { agent: AgentExecution }) {
  const { t } = useI18n();
  const meta = AGENT_METADATA[agent.agentType];
  const AgentIcon = ICON_MAP[meta.icon];

  return (
    <div className="flex items-center gap-2 py-1">
      {/* Status dot */}
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[agent.status])} />

      {/* Agent icon + label */}
      <div className={cn('flex items-center gap-1.5', AGENT_COLOR_TEXT[meta.color])}>
        {agent.status === 'running' ? (
          <CircleNotch className="w-3.5 h-3.5 animate-spin shrink-0" weight="bold" />
        ) : agent.status === 'completed' ? (
          <CheckCircle className="w-3.5 h-3.5 shrink-0" weight="fill" />
        ) : agent.status === 'failed' ? (
          <XCircle className="w-3.5 h-3.5 shrink-0 text-danger" weight="fill" />
        ) : AgentIcon ? (
          <AgentIcon className="w-3.5 h-3.5 shrink-0" weight="duotone" />
        ) : null}
        <span className="text-[12px] font-medium">{meta.label}</span>
      </div>

      {/* Duration or status */}
      <span className="ml-auto text-[11px] text-muted-foreground/60">
        {agent.status === 'completed' && agent.durationMs
          ? formatDuration(agent.durationMs)
          : agent.status === 'failed'
          ? t('beta.agents.failed')
          : agent.status === 'running'
          ? t('beta.agents.running')
          : ''}
      </span>
    </div>
  );
}

interface ActivityItemProps {
  entry: AgentActivityEntry;
  onNavigate: (conversationId: string) => void;
}

function ActivityItem({ entry, onNavigate }: ActivityItemProps) {
  const { activity } = entry;
  const allCompleted = activity.agents.every((a) => a.status === 'completed');
  const hasFailed = activity.agents.some((a) => a.status === 'failed');
  const isActive = activity.agents.some((a) => a.status === 'running' || a.status === 'dispatching');

  return (
    <button
      onClick={() => onNavigate(entry.conversationId)}
      className={cn(
        'w-full text-left p-3 rounded-lg',
        'border transition-colors',
        isActive
          ? 'border-primary/30 hover:bg-primary-soft'
          : hasFailed
          ? 'border-danger/30 hover:bg-danger-soft'
          : allCompleted
          ? 'border-success/30 hover:bg-success-soft'
          : 'border-border hover:bg-surface-muted'
      )}
    >
      {/* Conversation title + timestamp */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[12px] text-muted-foreground truncate">
          {entry.conversationTitle}
        </span>
        <span className="text-[11px] text-muted-foreground/60 shrink-0">
          {formatTimestamp(activity.startedAt)}
        </span>
      </div>

      {/* Agent rows */}
      <div className="space-y-0.5">
        {activity.agents.map((agent) => (
          <AgentExecutionRow key={agent.id} agent={agent} />
        ))}
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AgentActivityLog - Shows all agent executions across conversations.
 *
 * Active executions (blue accent) appear first, then recent completed ones.
 * Clicking an entry switches to that conversation.
 */
export function AgentActivityLog() {
  const { t } = useI18n();
  const { allAgentActivities, switchConversation } = useBetaChatContext();

  if (allAgentActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <Lightning className="w-8 h-8 opacity-30" weight="duotone" />
        <span className="text-[13px]">{t('beta.agents.noActivity')}</span>
      </div>
    );
  }

  // Split into active (running/dispatching) and finished
  const active = allAgentActivities.filter((e) =>
    e.activity.agents.some((a) => a.status === 'running' || a.status === 'dispatching')
  );
  const finished = allAgentActivities.filter((e) =>
    e.activity.agents.every((a) => a.status === 'completed' || a.status === 'failed')
  );

  return (
    <div className="h-full overflow-y-auto space-y-4">
      {/* Active executions */}
      {active.length > 0 && (
        <section>
          <MonoLabel className="block mb-2 px-1 tracking-wider text-primary">
            {t('beta.agents.active')} ({active.length})
          </MonoLabel>
          <div className="space-y-2">
            {active.map((entry) => (
              <ActivityItem
                key={entry.activity.id}
                entry={entry}
                onNavigate={switchConversation}
              />
            ))}
          </div>
        </section>
      )}

      {/* Finished executions */}
      {finished.length > 0 && (
        <section>
          <MonoLabel className="block mb-2 px-1 tracking-wider text-muted-foreground">
            {t('beta.agents.recent')} ({finished.length})
          </MonoLabel>
          <div className="space-y-2">
            {finished.map((entry) => (
              <ActivityItem
                key={entry.activity.id}
                entry={entry}
                onNavigate={switchConversation}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
