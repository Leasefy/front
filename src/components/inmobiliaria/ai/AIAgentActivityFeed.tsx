'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  GitMerge,
  ArrowRight,
  Lightning,
  CheckCircle,
  Warning,
  CircleNotch,
  CaretRight,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AIAgentActivity, AIAgentId } from '@/lib/types/ai-agents';
import { getAgentById } from '@/lib/types/ai-agents';
import { AIAgentExecutionPanel } from './AIAgentExecutionPanel';

const AGENT_ICONS: Record<string, Icon> = {
  'tenant-scoring': ShieldCheck,
  'smart-matching': GitMerge,
};

function timeAgo(date: Date, locale: string): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return locale === 'es' ? 'ahora' : 'now';
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return locale === 'es' ? `hace ${mins} min` : `${mins}m ago`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return locale === 'es' ? `hace ${hours}h` : `${hours}h ago`;
  }
  const days = Math.floor(diff / 86400);
  return locale === 'es' ? `hace ${days}d` : `${days}d ago`;
}

interface AIAgentActivityFeedProps {
  activities: AIAgentActivity[];
  maxItems?: number;
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
}

export function AIAgentActivityFeed({
  activities,
  maxItems = 4,
  showHeader = true,
  compact = false,
  className,
}: AIAgentActivityFeedProps) {
  const { locale, t } = useI18n();
  const [selectedActivity, setSelectedActivity] = useState<AIAgentActivity | null>(null);
  const displayActivities = activities.slice(0, maxItems);

  return (
    <>
      <div className={cn(
        'rounded-xl border bg-white dark:bg-[#1a1a1c] flex flex-col',
        'border-neutral-200 dark:border-neutral-700',
        className,
      )}>
        {showHeader && (
          <div className="flex items-center justify-between px-5 pt-5 pb-0">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                <Lightning weight="fill" className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                  {locale === 'es' ? 'Actividad de Agentes AI' : 'AI Agent Activity'}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {locale === 'es' ? '2 agentes trabajando ahora' : '2 agents working now'}
                </p>
              </div>
            </div>
            <Link
              href="/panel/inmobiliaria/ai"
              className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              {locale === 'es' ? 'Ver todo' : 'View all'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <div className={cn('divide-y divide-neutral-100 dark:divide-neutral-700/50 flex-1 overflow-y-auto', showHeader && 'mt-4')}>
          {displayActivities.map((activity) => {
            const agent = getAgentById(activity.agentId);
            const AgentIcon = AGENT_ICONS[activity.agentId] || Lightning;
            const agentColor = agent?.color || 'text-neutral-600';
            const agentBg = agent?.colorBg || 'bg-neutral-100';
            const isLive = activity.status === 'in_progress';
            const hasTrace = !!activity.executionTrace;

            return (
              <button
                key={activity.id}
                onClick={() => hasTrace && setSelectedActivity(activity)}
                className={cn(
                  'w-full flex items-start gap-3 px-5 py-3.5 transition-colors text-left',
                  isLive
                    ? 'bg-neutral-50 dark:bg-white/[0.03] border-l-2 border-l-neutral-400'
                    : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02]',
                  hasTrace && 'cursor-pointer',
                  !hasTrace && 'cursor-default',
                )}
              >
                <div className={cn('rounded-lg p-2 mt-0.5 flex-shrink-0', agentBg)}>
                  <AgentIcon weight="duotone" className={cn('h-4 w-4', agentColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {activity.description}
                    </span>
                    {activity.status === 'requires_attention' && (
                      <Warning weight="fill" className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    )}
                    {activity.status === 'completed' && (
                      <CheckCircle weight="fill" className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                    )}
                    {activity.status === 'in_progress' && (
                      <CircleNotch weight="bold" className="h-3.5 w-3.5 text-neutral-400 animate-spin flex-shrink-0" />
                    )}
                  </div>
                  {activity.detail && !compact && (
                    <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400 truncate">
                      {activity.detail}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    {timeAgo(activity.timestamp, locale)}
                  </span>
                  {hasTrace && (
                    <CaretRight className="h-3.5 w-3.5 text-neutral-300 dark:text-neutral-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Execution detail panel */}
      {selectedActivity?.executionTrace && (
        <AIAgentExecutionPanel
          trace={selectedActivity.executionTrace}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </>
  );
}
