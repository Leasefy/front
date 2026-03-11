'use client';

import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  icon?: Icon;
  iconColor?: string;
  iconBg?: string;
  user?: {
    name: string;
    avatar?: string;
  };
  metadata?: Record<string, string>;
}

export interface PlanActivityTimelineProps {
  items: TimelineItem[];
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
}

function formatTimestamp(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;

  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
  });
}

export function PlanActivityTimeline({
  items,
  maxItems,
  showViewAll = false,
  onViewAll,
  emptyMessage = 'No hay actividad reciente',
  className,
  compact = false,
}: PlanActivityTimelineProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;
  const hasMore = maxItems && items.length > maxItems;

  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-sm text-plan-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-muted" />

      <div className="space-y-0">
        {displayItems.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === displayItems.length - 1;

          return (
            <div
              key={item.id}
              className={cn(
                'relative flex gap-4',
                compact ? 'py-2' : 'py-3',
                !isLast && 'pb-4'
              )}
            >
              {/* Icon/Avatar */}
              <div className="relative z-10 flex-shrink-0">
                {item.user?.avatar ? (
                  <img
                    src={item.user.avatar}
                    alt={item.user.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-white"
                  />
                ) : Icon ? (
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 border-white',
                      item.iconBg || 'bg-muted'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', item.iconColor || 'text-plan-secondary')} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-white">
                    <span className="text-xs font-semibold text-plan-secondary">
                      {item.user?.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-plan-primary',
                      compact ? 'text-sm' : 'text-sm font-medium'
                    )}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-plan-secondary mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.metadata && Object.keys(item.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {Object.entries(item.metadata).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs text-plan-secondary"
                          >
                            {key}: <span className="font-medium text-plan-primary ml-1">{value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-plan-muted whitespace-nowrap flex-shrink-0">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Button */}
      {(showViewAll || hasMore) && onViewAll && (
        <button
          onClick={onViewAll}
          className="mt-4 w-full py-2 text-sm font-medium text-plan-secondary hover:text-plan-primary hover:bg-muted rounded-sm transition-colors"
        >
          Ver toda la actividad
        </button>
      )}
    </div>
  );
}

// Card wrapper for timeline
export interface PlanActivityCardProps {
  title?: string;
  items: TimelineItem[];
  maxItems?: number;
  onViewAll?: () => void;
  className?: string;
}

export function PlanActivityCard({
  title = 'Actividad Reciente',
  items,
  maxItems = 5,
  onViewAll,
  className,
}: PlanActivityCardProps) {
  return (
    <div className={cn('bg-white dark:bg-card border border-plan-border p-5', className)}>
      <h3 className="text-sm font-semibold text-plan-primary mb-4">{title}</h3>
      <PlanActivityTimeline
        items={items}
        maxItems={maxItems}
        onViewAll={onViewAll}
        showViewAll={items.length > maxItems}
        compact
      />
    </div>
  );
}
