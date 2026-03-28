'use client';

import {
  ShieldCheck,
  GitMerge,
  CheckCircle,
  Warning,
  Clock,
  ArrowsClockwise,
  Bell,
  Lightning,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgentActivity } from '@/lib/types/ai-agents';

const AGENT_ICONS: Record<string, Icon> = {
  'tenant-scoring': ShieldCheck,
  'smart-matching': GitMerge,
};

const TYPE_ICONS: Record<string, Icon> = {
  execution: Lightning,
  notification: Bell,
  escalation: Warning,
  error: Warning,
};

interface AIAgentActivityFeedProps {
  activities: AgentActivity[];
  maxItems?: number;
  className?: string;
}

function timeAgo(date: Date, locale: string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return locale === 'es' ? 'Ahora' : 'Just now';
  if (diffMin < 60) return locale === 'es' ? `hace ${diffMin} min` : `${diffMin}m ago`;
  if (diffHours < 24) return locale === 'es' ? `hace ${diffHours}h` : `${diffHours}h ago`;
  return locale === 'es' ? `hace ${diffDays}d` : `${diffDays}d ago`;
}

export function AIAgentActivityFeed({ activities, maxItems = 6, className }: AIAgentActivityFeedProps) {
  const { locale } = useI18n();
  const items = activities.slice(0, maxItems);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          {locale === 'es' ? 'Actividad Reciente' : 'Recent Activity'}
        </h2>
        <ArrowsClockwise weight="duotone" className="h-4 w-4 text-neutral-400" />
      </div>

      <div className="space-y-1">
        {items.map((activity) => {
          const AgentIcon = AGENT_ICONS[activity.agentId] || ShieldCheck;
          const TypeIcon = TYPE_ICONS[activity.type] || Lightning;

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors"
            >
              {/* Agent icon */}
              <div className="relative flex-shrink-0 mt-0.5">
                <div className="rounded-lg p-1.5 bg-neutral-100 dark:bg-neutral-800">
                  <AgentIcon weight="duotone" className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                </div>
                {/* Status dot */}
                <div className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#1a1a1c]',
                  activity.status === 'success' && 'bg-emerald-500',
                  activity.status === 'pending' && 'bg-amber-500',
                  activity.status === 'failed' && 'bg-red-500',
                )} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <TypeIcon weight="bold" className={cn(
                    'h-3 w-3 flex-shrink-0',
                    activity.type === 'escalation' ? 'text-amber-500' : 'text-neutral-400',
                  )} />
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                    {activity.title}
                  </p>
                </div>
                {activity.description && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                    {activity.description}
                  </p>
                )}
              </div>

              {/* Score badge if available */}
              {activity.metadata?.level && (
                <span className={cn(
                  'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold',
                  activity.metadata.level === 'A' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
                  activity.metadata.level === 'B' && 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
                  activity.metadata.level === 'C' && 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
                  activity.metadata.level === 'D' && 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
                )}>
                  {activity.metadata.level}
                </span>
              )}

              {/* Timestamp */}
              <span className="flex-shrink-0 text-[11px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                {timeAgo(activity.timestamp, locale)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
