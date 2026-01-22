'use client';

import Link from 'next/link';
import {
  UserPlus,
  CheckCircle2,
  MessageSquare,
  FileText,
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
    return `${diffMins}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// Icon by activity type
const activityIcons: Record<ActivityType, typeof UserPlus> = {
  application: UserPlus,
  status_change: CheckCircle2,
  message: MessageSquare,
  document: FileText,
};

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const Icon = activityIcons[activity.type];

  const content = (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors -mx-2 px-2 rounded-[2px]">
      {/* Icon */}
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 font-medium">
          {activity.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">
          {activity.description}
        </p>
      </div>

      {/* Time */}
      <span className="text-xs text-slate-300 flex-shrink-0">
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
 * Activity Feed - Luxterra style
 * Clean, minimal list without heavy borders
 */
export function ActivityFeed({
  activities,
  className,
  showViewAll = true,
}: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className={cn('text-sm text-slate-400 text-center py-8', className)}>
        No hay actividad reciente
      </div>
    );
  }

  return (
    <div className={className}>
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

export { ActivityFeed as default };
