'use client';

import Link from 'next/link';
import {
  UserPlus,
  CheckCircle2,
  MessageSquare,
  FileText,
  ChevronRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Activity, ActivityType } from '@/lib/data/mock-activity';

// Format relative time
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `hace ${diffMins} min`;
  }
  if (diffHours < 24) {
    return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  }
  if (diffDays < 7) {
    return `hace ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
  }
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// Icon and color by activity type
const activityConfig: Record<
  ActivityType,
  { icon: typeof UserPlus; bgColor: string; iconColor: string }
> = {
  application: {
    icon: UserPlus,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  status_change: {
    icon: CheckCircle2,
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
  },
  message: {
    icon: MessageSquare,
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  document: {
    icon: FileText,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-500',
  },
};

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const config = activityConfig[activity.type];
  const Icon = config.icon;

  const content = (
    <div className="flex items-start gap-3 p-3 rounded-sm hover:bg-slate-50 transition-colors">
      {/* Icon */}
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
          config.bgColor
        )}
      >
        <Icon className={cn('w-4 h-4', config.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-900 font-medium truncate">
          {activity.title}
        </p>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {activity.description}
        </p>
      </div>

      {/* Time */}
      <span className="text-xs text-slate-400 flex-shrink-0">
        {formatRelativeTime(activity.timestamp)}
      </span>
    </div>
  );

  if (activity.propertyId) {
    return (
      <Link href={`/panel/${activity.propertyId}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
  showViewAll?: boolean;
}

/**
 * Activity Feed - Recent activity timeline
 */
export function ActivityFeed({
  activities,
  className,
  showViewAll = true,
}: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div
        className={cn(
          'bg-white rounded-sm border border-slate-100 p-6 text-center',
          className
        )}
      >
        <p className="text-sm text-slate-500">No hay actividad reciente</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-sm border border-slate-100 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-medium text-slate-900">
          Actividad Reciente
        </h3>
      </div>

      {/* Activity list */}
      <div className="divide-y divide-slate-50">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>

      {/* View all link */}
      {showViewAll && (
        <div className="px-4 py-3 border-t border-slate-100">
          <button
            className="w-full flex items-center justify-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
            disabled
          >
            Ver toda la actividad
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export { ActivityFeed as default };
