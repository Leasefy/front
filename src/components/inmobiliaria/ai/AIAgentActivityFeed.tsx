'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  GitMerge,
  Lightning,
  ArrowRight,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { AIActivityDetailPanel } from './AIActivityDetailPanel';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgentActivity } from '@/lib/types/ai-agents';

const AGENT_ICONS: Record<string, Icon> = {
  'tenant-scoring': ShieldCheck,
  'smart-matching': GitMerge,
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
  const [selectedActivity, setSelectedActivity] = useState<AgentActivity | null>(null);

  return (
    <div className={cn(
      'rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]',
      'overflow-hidden',
      className,
    )}>
      {/* Header — same pattern as Pipeline Activo / Equipo */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {locale === 'es' ? 'Actividad Reciente' : 'Recent Activity'}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {locale === 'es' ? 'Ejecuciones y eventos de agentes' : 'Agent executions and events'}
          </p>
        </div>
        <Link
          href="/panel/inmobiliaria/ai"
          className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
        >
          {locale === 'es' ? 'Ver toda' : 'View all'}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="px-6 pb-6">
          <div className="rounded-2xl bg-neutral-50/80 dark:bg-white/[0.03] py-10 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-4 shadow-sm dark:shadow-none">
              <Lightning className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {locale === 'es' ? 'Sin actividad reciente' : 'No recent activity'}
            </p>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-5">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {items.map((activity) => {
              const AgentIcon = AGENT_ICONS[activity.agentId] || ShieldCheck;
              const levelCfg = activity.metadata?.level ? {
                A: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400' },
                B: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400' },
                C: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400' },
                D: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-600 dark:text-red-400' },
              }[activity.metadata.level] : null;

              const isEscalation = activity.type === 'escalation' || activity.status === 'pending';

              return (
                <div
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className={cn(
                    'flex items-start gap-3 py-3.5 first:pt-1 -mx-2 px-2 rounded-lg transition-colors',
                    'hover:bg-neutral-50 dark:hover:bg-white/[0.03] cursor-pointer',
                    isEscalation && 'bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20',
                  )}
                >
                  {/* Agent icon with status dot */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className={cn(
                      'rounded-full p-2',
                      activity.agentId === 'tenant-scoring'
                        ? 'bg-indigo-50 dark:bg-indigo-950/30'
                        : 'bg-violet-50 dark:bg-violet-950/30',
                    )}>
                      <AgentIcon weight="duotone" className={cn(
                        'h-4 w-4',
                        activity.agentId === 'tenant-scoring'
                          ? 'text-indigo-500 dark:text-indigo-400'
                          : 'text-violet-500 dark:text-violet-400',
                      )} />
                    </div>
                    <div className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#1a1a1c]',
                      activity.status === 'success' && 'bg-emerald-500',
                      activity.status === 'pending' && 'bg-amber-500',
                      activity.status === 'failed' && 'bg-red-500',
                    )} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                        {activity.title}
                      </p>
                      {isEscalation && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                          {locale === 'es' ? 'Acción' : 'Action'}
                        </span>
                      )}
                    </div>
                    {activity.description && (
                      <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                        {activity.description}
                      </p>
                    )}
                  </div>

                  {/* Score badge */}
                  {levelCfg && activity.metadata?.level && (
                    <span className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                      levelCfg.bg, levelCfg.text,
                    )}>
                      {activity.metadata.level}
                    </span>
                  )}

                  {/* Timestamp */}
                  <span className="flex-shrink-0 text-xs text-neutral-400 dark:text-neutral-500 tabular-nums whitespace-nowrap pt-0.5">
                    {timeAgo(activity.timestamp, locale)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedActivity && (
        <AIActivityDetailPanel
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
}
