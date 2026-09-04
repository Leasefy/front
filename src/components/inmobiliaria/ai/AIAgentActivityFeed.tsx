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
      'rounded-lg border border-border bg-surface',
      'overflow-hidden',
      className,
    )}>
      {/* Header — same pattern as Pipeline Activo / Equipo */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-fg">
            {locale === 'es' ? 'Actividad Reciente' : 'Recent Activity'}
          </h2>
          <p className="text-sm text-fg-subtle">
            {locale === 'es' ? 'Ejecuciones y eventos de agentes' : 'Agent executions and events'}
          </p>
        </div>
        <Link
          href="/panel/inmobiliaria/configuracion/agentes"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary transition-colors"
        >
          {locale === 'es' ? 'Ver toda' : 'View all'}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="px-6 pb-6">
          <div className="rounded-lg bg-surface-muted py-10 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center mx-auto mb-4">
              <Lightning className="h-5 w-5 text-fg-subtle" />
            </div>
            <p className="text-sm text-fg-subtle">
              {locale === 'es' ? 'Sin actividad reciente' : 'No recent activity'}
            </p>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-5">
          <div className="divide-y divide-border-faint">
            {items.map((activity) => {
              const AgentIcon = AGENT_ICONS[activity.agentId] || ShieldCheck;
              const levelCfg = activity.metadata?.level ? {
                A: { bg: 'bg-success-soft', text: 'text-success' },
                B: { bg: 'bg-primary-soft', text: 'text-primary' },
                C: { bg: 'bg-warning-soft', text: 'text-warning' },
                D: { bg: 'bg-danger-soft', text: 'text-danger' },
              }[activity.metadata.level] : null;

              const isEscalation = activity.type === 'escalation' || activity.status === 'pending';

              return (
                <div
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className={cn(
                    'flex items-start gap-3 py-3.5 first:pt-1 -mx-2 px-2 rounded-md transition-colors',
                    'hover:bg-surface-muted cursor-pointer',
                    isEscalation && 'bg-warning-soft/50 hover:bg-warning-soft',
                  )}
                >
                  {/* Agent icon with status dot */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className={cn(
                      'rounded-full p-2',
                      activity.agentId === 'tenant-scoring'
                        ? 'bg-primary-soft'
                        : 'bg-surface-muted',
                    )}>
                      <AgentIcon weight="duotone" className={cn(
                        'h-4 w-4',
                        activity.agentId === 'tenant-scoring'
                          ? 'text-primary'
                          : 'text-fg-muted',
                      )} />
                    </div>
                    <div className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white',
                      activity.status === 'success' && 'bg-success',
                      activity.status === 'pending' && 'bg-warning',
                      activity.status === 'failed' && 'bg-danger',
                    )} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-fg truncate">
                        {activity.title}
                      </p>
                      {isEscalation && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-warning-soft text-warning">
                          {locale === 'es' ? 'Acción' : 'Action'}
                        </span>
                      )}
                    </div>
                    {activity.description && (
                      <p className="text-[13px] text-fg-subtle mt-0.5 truncate">
                        {activity.description}
                      </p>
                    )}
                  </div>

                  {/* Score badge */}
                  {levelCfg && activity.metadata?.level && (
                    <span className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold',
                      levelCfg.bg, levelCfg.text,
                    )}>
                      {activity.metadata.level}
                    </span>
                  )}

                  {/* Timestamp */}
                  <span className="flex-shrink-0 text-xs text-fg-subtle tabular-nums whitespace-nowrap pt-0.5">
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
